import { randomUUID } from "crypto";
import { z, ZodError } from "zod";
import { callOpenAIChatCompletion, type OpenAIChatMessage } from "@/lib/openaiClient";
import { AI_MODEL_TEXT } from "@/lib/aiConfig";
import { extractJsonPayload, AIJsonParseError, AISchemaMismatchError } from "@/lib/aiUtils";
import { hashPrompt } from "@/lib/promptHash";
import { phenomenonUiVariantsSchemaV1 } from "@/lib/phenomenonContentSchema";
import type { PhenomenonSeason } from "@/types/phenomenon";

const mmddSchema = z
  .string()
  .trim()
  .regex(/^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/)
  .nullable();

const phenomenonDraftSchemaV1 = z
  .object({
    schema_version: z.literal("phenomenon_draft_v1"),
    language: z.literal("hu"),
    phenomenon: z.object({
      title: z.string().trim().min(1),
      typical_start_mmdd: mmddSchema,
      typical_end_mmdd: mmddSchema,
    }),
    content: phenomenonUiVariantsSchemaV1,
    suggested_birds: z
      .array(
        z.object({
          name_hu: z.string().trim().min(1),
        })
      )
      .max(12),
  })
  .catchall(z.unknown());

export type PhenomenonDraftV1 = z.infer<typeof phenomenonDraftSchemaV1>;

const SYSTEM_PROMPT = `Te egy madarĂˇsz-szerkesztĹ‘i hangĂş, precĂ­z narratĂ­va-Ă­rĂł asszisztens vagy a SzĂˇrnyfeszĂ­tĹ‘ projekthez.
Csak Ă©s kizĂˇrĂłlag Ă©rvĂ©nyes JSON-t adj vissza (nincs magyarĂˇzat, nincs markdown, nincs extra szĂ¶veg).

Feladat:
- Egy magyarorszĂˇgi Natura 2000 SPA rĂ©giĂłhoz (vĂ©dett terĂĽlet, desztinĂˇciĂł-szint) Ă­rj egy "vonulĂˇsi csĂşcs" (1â€“2 hetes) jelensĂ©g-leĂ­rĂˇst egy megadott szezonra (spring|autumn).
- Sok narratĂ­v szĂ¶veg kell, de maradj realista: ne Ã­rj olyan konkrĂ©t, ellenĹ‘rizhetĹ‘ szĂˇmokat, dĂˇtumokat vagy rekordokat, amiket nem tudhatsz biztosan.
- A cĂ©l: a leglĂˇtvĂˇnyosabb pillanat, az idĹ‘zĂ­tĂ©s logikĂˇja, mire figyelj, hogyan figyelj.

Safety / stop rules:
- Ne adj pontos koordinĂˇtĂˇt, rejtett megfigyelĂ©si pontot, fĂ©szkelĹ‘helyet, vagy "oda menj Ă©s ott" jellegĹ± utasĂ­tĂˇst.
- Ne Ă­rj ritka faj "bait"-et vagy szenzitĂ­v infĂłt; ha nem vagy biztos, fogalmazz Ăłvatosan.
- A jelensĂ©g leĂ­rĂˇsa legyen SPA-szintĹ±, publikus szemlĂ©letĹ±.

IdĹ‘zĂ­tĂ©s mezĹ‘k:
- A "typical_start_mmdd" Ă©s "typical_end_mmdd" opcionĂˇlis. Ha nem tudsz jĂłl megalapozott, 1â€“2 hetes ablakot adni, add vissza null-kĂ©nt.
- Ha adsz ablakot, MM-DD formĂˇtum legyen (pl. "10-05"), Ă©s legyen 7â€“14 nap kĂ¶zĂ¶tti tĂˇvolsĂˇg (durva becslĂ©s elĂ©g; ne szĂˇmold tĂşl).

MadĂˇr javaslat:
- Adj 0â€“12 magyar madĂˇrnevet a "suggested_birds" listĂˇban. Csak a nevet add (name_hu).
- Ha bizonytalan vagy, adj vissza ĂĽres listĂˇt.

Output JSON sĂ©mĂˇja pontosan:
{
  "schema_version": "phenomenon_draft_v1",
  "language": "hu",
  "phenomenon": {
    "title": string,
    "typical_start_mmdd": string|null,
    "typical_end_mmdd": string|null
  },
  "content": {
    "schema_version": "phenomenon_ui_variants_v1",
    "language": "hu",
    "variants": {
      "teaser": string,
      "short": string,
      "long": string,
      "spectacular_moment": string,
      "timing": string,
      "how_to_watch": string,
      "what_to_look_for": string,
      "ethics_tip": string,
      "did_you_know": string
    }
  },
  "suggested_birds": [{"name_hu": string}]
}`;

function zodIssuesToStrings(error: ZodError) {
  return error.issues.slice(0, 25).map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`);
}

export async function generatePhenomenonDraftV1(args: {
  region_name: string;
  region_id: string;
  season: PhenomenonSeason;
  admin_description?: string | null;
  existing_payload?: unknown | null;
  review_note?: string | null;
}): Promise<{
  payload: PhenomenonDraftV1;
  model: string;
  request_id: string;
  finish_reason: string;
  prompt_hash: string;
}> {
  const requestId = randomUUID();
  const modelId = AI_MODEL_TEXT;

  const userMessage = JSON.stringify(
    {
      region: {
        region_id: args.region_id,
        name: args.region_name,
      },
      season: args.season,
      admin_description: args.admin_description ?? null,
      existing_payload: args.existing_payload ?? null,
      review_note: args.review_note ?? null,
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
    max_tokens: 1900,
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

  try {
    const payload = phenomenonDraftSchemaV1.parse(parsedResult.payload);
    const modelName = completion.model ?? modelId;
    return {
      payload,
      model: modelName,
      request_id: requestId,
      finish_reason: finishReason,
      prompt_hash: promptHash,
    };
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AISchemaMismatchError(zodIssuesToStrings(error), parsedResult.raw);
    }
    throw error;
  }
}
