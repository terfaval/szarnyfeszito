import { randomUUID } from "crypto";
import { z, ZodError } from "zod";
import { callOpenAIChatCompletion, type OpenAIChatMessage } from "@/lib/openaiClient";
import { AI_MODEL_TEXT } from "@/lib/aiConfig";
import { extractJsonPayload, AIJsonParseError, AISchemaMismatchError } from "@/lib/aiUtils";
import { hashPrompt } from "@/lib/promptHash";
import { supabaseServerClient } from "@/lib/supabaseServerClient";
import { replacePhenomenonBirdSuggestions } from "@/lib/phenomenonBirdService";
import type { Phenomenon } from "@/types/phenomenon";

const phenomenonBirdSuggestionsSchemaV1 = z
  .object({
    schema_version: z.literal("phenomenon_bird_suggestions_v1"),
    language: z.literal("hu"),
    suggested_birds: z
      .array(
        z.object({
          name_hu: z.string().trim().min(1),
        })
      )
      .max(12),
  })
  .catchall(z.unknown());

type PhenomenonBirdSuggestionsV1 = z.infer<typeof phenomenonBirdSuggestionsSchemaV1>;

const SYSTEM_PROMPT = `Te egy madarĂˇsz-szerkesztĹ‘i asszisztens vagy a SzĂˇrnyfeszĂ­tĹ‘ Phenomenon modulhoz.
Csak Ă©s kizĂˇrĂłlag Ă©rvĂ©nyes JSON-t adj vissza (nincs magyarĂˇzat, nincs markdown, nincs extra szĂ¶veg).

Feladat:
- A bemeneti jelensĂ©g meta alapjĂˇn javasolj 0â€“12 MagyarorszĂˇgon tipikusan megfigyelhetĹ‘ madĂˇrfajt ehhez a vonulĂˇsi csĂşcshoz.
- A lista a "rendszeres, jĂłl lĂˇthatĂł vonulĂł" jellegĹ± fajokra koncentrĂˇljon.

Safety / stop rules:
- KerĂĽld az extrĂ©m ritka, egyszeri kĂłborlĂł rekordokat.
- Ne adj fĂ©szkelĹ‘helyre utalĂł vagy szenzitĂ­v informĂˇciĂłt.
- Ha bizonytalan vagy, adj vissza ĂĽres listĂˇt.

Output JSON sĂ©mĂˇja pontosan:
{
  "schema_version": "phenomenon_bird_suggestions_v1",
  "language": "hu",
  "suggested_birds": [{"name_hu": string}]
}`;

function zodIssuesToStrings(error: ZodError) {
  return error.issues.slice(0, 25).map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`);
}

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

type BirdLookupRow = { id: string; slug: string; name_hu: string; status?: string };

async function findPublishedBirdByHungarianName(
  nameHu: string
): Promise<{ id: string; slug: string; name_hu: string } | null> {
  const needle = normalizeName(nameHu);
  if (!needle) return null;

  const { data, error } = await supabaseServerClient
    .from("birds")
    .select("id,slug,name_hu,status")
    .eq("status", "published")
    .ilike("name_hu", needle)
    .limit(2);

  if (error) {
    throw error;
  }

  const first = (data?.[0] ?? null) as Partial<BirdLookupRow> | null;
  if (!first) return null;
  if (typeof first.id !== "string" || typeof first.slug !== "string" || typeof first.name_hu !== "string") {
    return null;
  }

  return { id: first.id, slug: first.slug, name_hu: first.name_hu };
}

export async function suggestPhenomenonBirdLinksV1(args: {
  phenomenon: Pick<
    Phenomenon,
    "id" | "title" | "phenomenon_type" | "season" | "region_id" | "generation_input"
  >;
  region_name: string;
}): Promise<{
  model: string;
  request_id: string;
  finish_reason: string;
  prompt_hash: string;
  inserted: Array<{ id: string; phenomenon_id: string; bird_id: string | null; pending_bird_name_hu: string | null }>;
  deleted_count: number;
  raw_suggestions: PhenomenonBirdSuggestionsV1;
}> {
  const requestId = randomUUID();
  const modelId = AI_MODEL_TEXT;

  const userMessage = JSON.stringify(
    {
      phenomenon: {
        id: args.phenomenon.id,
        title: args.phenomenon.title,
        phenomenon_type: args.phenomenon.phenomenon_type,
        season: args.phenomenon.season,
        region_id: args.phenomenon.region_id,
        region_name: args.region_name,
        admin_description: args.phenomenon.generation_input ?? null,
      },
    },
    null,
    2
  );

  const promptHash = hashPrompt(`${SYSTEM_PROMPT}\n\n${userMessage}`);
  const messages: OpenAIChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userMessage },
  ];

  const completion = await callOpenAIChatCompletion({
    model: modelId,
    temperature: 0.2,
    max_tokens: 700,
    messages,
  });

  const finishReason = completion.choices?.[0]?.finish_reason ?? "unknown";
  const rawContent = completion.choices?.[0]?.message?.content ?? "";
  const parsedResult = extractJsonPayload(rawContent);

  if (!parsedResult.success) {
    throw new AIJsonParseError(
      requestId,
      modelId,
      parsedResult.error.reason,
      parsedResult.error.raw_head,
      parsedResult.error.raw_tail,
      finishReason
    );
  }

  let parsed: PhenomenonBirdSuggestionsV1;
  try {
    parsed = phenomenonBirdSuggestionsSchemaV1.parse(parsedResult.payload);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AISchemaMismatchError(zodIssuesToStrings(error), parsedResult.raw);
    }
    throw error;
  }

  const mapped = await Promise.all(
    parsed.suggested_birds.map(async (entry) => {
      const found = await findPublishedBirdByHungarianName(entry.name_hu);
      if (found) {
        return { bird_id: found.id, pending_bird_name_hu: null };
      }
      return { bird_id: null, pending_bird_name_hu: normalizeName(entry.name_hu) };
    })
  );

  const seenBirdIds = new Set<string>();
  const seenPending = new Set<string>();
  const deduped = mapped.filter((item) => {
    if (item.bird_id) {
      if (seenBirdIds.has(item.bird_id)) return false;
      seenBirdIds.add(item.bird_id);
      return true;
    }
    if (item.pending_bird_name_hu) {
      const key = item.pending_bird_name_hu.toLowerCase();
      if (seenPending.has(key)) return false;
      seenPending.add(key);
      return true;
    }
    return false;
  });

  const replaceResult = await replacePhenomenonBirdSuggestions({
    phenomenon_id: args.phenomenon.id,
    suggestions: deduped,
  });

  const modelName = completion.model ?? modelId;
  return {
    model: modelName,
    request_id: requestId,
    finish_reason: finishReason,
    prompt_hash: promptHash,
    inserted: replaceResult.inserted.map((row) => ({
      id: row.id,
      phenomenon_id: row.phenomenon_id,
      bird_id: row.bird_id,
      pending_bird_name_hu: row.pending_bird_name_hu,
    })),
    deleted_count: replaceResult.deleted_count,
    raw_suggestions: parsed,
  };
}

