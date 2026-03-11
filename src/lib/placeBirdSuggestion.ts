import { randomUUID } from "crypto";
import { z, ZodError } from "zod";
import { callOpenAIChatCompletion, type OpenAIChatMessage } from "@/lib/openaiClient";
import { AI_MODEL_TEXT } from "@/lib/aiConfig";
import { extractJsonPayload, AIJsonParseError, AISchemaMismatchError } from "@/lib/aiUtils";
import { hashPrompt } from "@/lib/promptHash";
import { supabaseServerClient } from "@/lib/supabaseServerClient";
import type { Place, PlaceBirdLink, PlaceBirdReviewStatus, PlaceFrequencyBand } from "@/types/place";
import { PLACE_FREQUENCY_BANDS } from "@/types/place";

const frequencyBandEnum = PLACE_FREQUENCY_BANDS as unknown as [
  PlaceFrequencyBand,
  ...PlaceFrequencyBand[],
];

const placeBirdSuggestionsSchemaV1 = z
  .object({
    schema_version: z.literal("place_bird_suggestions_v1"),
    language: z.literal("hu"),
    suggested_birds: z
      .array(
        z.object({
          name_hu: z.string().trim().min(1),
          frequency_band: z.enum(frequencyBandEnum),
          visible_in_spring: z.boolean(),
          visible_in_summer: z.boolean(),
          visible_in_autumn: z.boolean(),
          visible_in_winter: z.boolean(),
          is_iconic: z.boolean(),
        })
      )
      .min(8)
      .max(12),
  })
  .catchall(z.unknown());

type PlaceBirdSuggestionsV1 = z.infer<typeof placeBirdSuggestionsSchemaV1>;

const SYSTEM_PROMPT = `Te egy madarász-szerkesztői asszisztens vagy a Szárnyfeszítő Place modulhoz.
Csak és kizárólag érvényes JSON-t adj vissza (nincs magyarázat, nincs markdown, nincs extra szöveg).

Feladat:
- A bemeneti Place meta alapján javasolj 8–12 Magyarországon tipikusan megfigyelhető madárfajt a helyhez.
- A lista a "rendszeres madárles élményre" fókuszáljon: könnyen felismerhető, jellemző fajok.

Safety / stop rules:
- Kerüld a spekulatív listákat, extrém ritka fajokat, egyszeri/alkalmi kóborló rekordokat.
- Ne adj fészkelőhelyre utaló, érzékeny információt (nincs koordináta, nincs "itt fészkel" tippek).
- Ha a Place "sensitive" vagy "hidden", akkor is csak általános, publikus madármegfigyelési kontextust használj.

Output JSON sémája pontosan:
{
  "schema_version": "place_bird_suggestions_v1",
  "language": "hu",
  "suggested_birds": [
    {
      "name_hu": string,
      "frequency_band": "very_common" | "common" | "regular" | "occasional" | "special",
      "visible_in_spring": boolean,
      "visible_in_summer": boolean,
      "visible_in_autumn": boolean,
      "visible_in_winter": boolean,
      "is_iconic": boolean
    }
  ]
}`;

function zodIssuesToStrings(error: ZodError) {
  return error.issues
    .slice(0, 25)
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`);
}

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

type BirdLookupRow = {
  id: string;
  slug: string;
  name_hu: string;
  status?: string;
};

type ExistingPlaceBirdRow = {
  rank: number | null;
  bird_id: string | null;
  pending_bird_name_hu: string | null;
};

function coerceExistingPlaceBirdRow(row: unknown): ExistingPlaceBirdRow | null {
  if (!row || typeof row !== "object") return null;
  const obj = row as Record<string, unknown>;

  const rank = typeof obj.rank === "number" ? obj.rank : null;
  const birdId = typeof obj.bird_id === "string" ? obj.bird_id : null;
  const pendingName = typeof obj.pending_bird_name_hu === "string" ? obj.pending_bird_name_hu : null;

  return { rank, bird_id: birdId, pending_bird_name_hu: pendingName };
}

async function findBirdByHungarianName(
  nameHu: string,
  options?: { onlyPublished?: boolean }
): Promise<{ id: string; slug: string; name_hu: string } | null> {
  const needle = normalizeName(nameHu);
  if (!needle) return null;

  let query = supabaseServerClient
    .from("birds")
    .select("id,slug,name_hu,status")
    .ilike("name_hu", needle)
    .limit(2);

  if (options?.onlyPublished) {
    query = query.eq("status", "published");
  }

  const { data, error } = await query;

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

export async function generatePlaceBirdSuggestionsV1(args: {
  place: Pick<
    Place,
    | "name"
    | "place_type"
    | "place_types"
    | "region_landscape"
    | "county"
    | "generation_input"
    | "notable_units_json"
    | "sensitivity_level"
    | "location_precision"
  >;
}): Promise<{
  payload: PlaceBirdSuggestionsV1;
  model: string;
  request_id: string;
  finish_reason: string;
  prompt_hash: string;
}> {
  const requestId = randomUUID();
  const modelId = AI_MODEL_TEXT;

  const userPayload = {
    place_name: args.place.name,
    place_type: args.place.place_type,
    place_types: args.place.place_types ?? [],
    region_landscape: args.place.region_landscape ?? null,
    county: args.place.county ?? null,
    generation_input: args.place.generation_input ?? null,
    notable_units: args.place.notable_units_json ?? null,
    sensitivity_level: args.place.sensitivity_level,
    location_precision: args.place.location_precision,
  };

  const userMessage = JSON.stringify(userPayload, null, 2);
  const promptHash = hashPrompt(`${SYSTEM_PROMPT}\n\n${userMessage}`);

  const messages: OpenAIChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userMessage },
  ];

  const completion = await callOpenAIChatCompletion({
    model: modelId,
    temperature: 0.2,
    max_tokens: 1100,
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

  const rawJson = parsedResult.raw;
  try {
    const payload = placeBirdSuggestionsSchemaV1.parse(parsedResult.payload);
    return {
      payload,
      model: modelId,
      request_id: requestId,
      finish_reason: finishReason,
      prompt_hash: promptHash,
    };
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AISchemaMismatchError(zodIssuesToStrings(error), rawJson);
    }
    throw error;
  }
}

export async function suggestPlaceBirdLinksV1(args: {
  place: Place;
  review_status?: PlaceBirdReviewStatus;
  existing_published_only?: boolean;
}): Promise<{
  inserted: PlaceBirdLink[];
  suggestions: PlaceBirdSuggestionsV1;
  model: string;
  request_id: string;
  finish_reason: string;
  prompt_hash: string;
}> {
  const suggestionResult = await generatePlaceBirdSuggestionsV1({
    place: {
      name: args.place.name,
      place_type: args.place.place_type,
      place_types: args.place.place_types ?? [],
      region_landscape: args.place.region_landscape,
      county: args.place.county,
      generation_input: args.place.generation_input,
      notable_units_json: args.place.notable_units_json,
      sensitivity_level: args.place.sensitivity_level,
      location_precision: args.place.location_precision,
    },
  });

  const normalized = suggestionResult.payload.suggested_birds
    .map((row) => ({ ...row, name_hu: normalizeName(row.name_hu) }))
    .filter((row) => Boolean(row.name_hu));

  const deduped: typeof normalized = [];
  const seen = new Set<string>();
  for (const row of normalized) {
    const key = row.name_hu.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(row);
  }

  const { data: existing, error: existingError } = await supabaseServerClient
    .from("place_birds")
    .select("bird_id,pending_bird_name_hu,rank")
    .eq("place_id", args.place.id);

  if (existingError) {
    throw existingError;
  }

  const existingBirdIds = new Set<string>();
  const existingPending = new Set<string>();
  let maxRank = 0;
  (existing ?? []).forEach((row) => {
    const coerced = coerceExistingPlaceBirdRow(row);
    if (!coerced) return;

    if (typeof coerced.rank === "number" && coerced.rank > maxRank) maxRank = coerced.rank;
    if (coerced.bird_id) existingBirdIds.add(coerced.bird_id);
    if (coerced.pending_bird_name_hu) existingPending.add(normalizeName(coerced.pending_bird_name_hu).toLowerCase());
  });

  const insertRows: Array<Record<string, unknown>> = [];
  let rankOffset = 0;
  for (const row of deduped) {
    const matchedBird = await findBirdByHungarianName(row.name_hu, {
      onlyPublished: args.existing_published_only === true,
    });

    if (!matchedBird && args.existing_published_only) {
      continue;
    }

    const birdId = matchedBird?.id ?? null;
    const pendingName = birdId ? null : row.name_hu;

    if (birdId && existingBirdIds.has(birdId)) continue;
    if (pendingName && existingPending.has(pendingName.toLowerCase())) continue;

    insertRows.push({
      place_id: args.place.id,
      bird_id: birdId,
      pending_bird_name_hu: pendingName,
      review_status: args.review_status ?? "suggested",
      rank: maxRank + 1 + rankOffset,
      frequency_band: row.frequency_band,
      is_iconic: row.is_iconic,
      visible_in_spring: row.visible_in_spring,
      visible_in_summer: row.visible_in_summer,
      visible_in_autumn: row.visible_in_autumn,
      visible_in_winter: row.visible_in_winter,
      updated_at: new Date().toISOString(),
    });
    rankOffset += 1;
  }

  if (insertRows.length === 0) {
    return {
      inserted: [],
      suggestions: suggestionResult.payload,
      model: suggestionResult.model,
      request_id: suggestionResult.request_id,
      finish_reason: suggestionResult.finish_reason,
      prompt_hash: suggestionResult.prompt_hash,
    };
  }

  const { data: inserted, error: insertError } = await supabaseServerClient
    .from("place_birds")
    .insert(insertRows)
    .select(
      "id,place_id,bird_id,pending_bird_name_hu,review_status,rank,frequency_band,is_iconic,visible_in_spring,visible_in_summer,visible_in_autumn,visible_in_winter,seasonality_note,created_at,updated_at"
    );

  if (insertError) {
    throw insertError;
  }

  return {
    inserted: (inserted ?? []) as PlaceBirdLink[],
    suggestions: suggestionResult.payload,
    model: suggestionResult.model,
    request_id: suggestionResult.request_id,
    finish_reason: suggestionResult.finish_reason,
    prompt_hash: suggestionResult.prompt_hash,
  };
}
