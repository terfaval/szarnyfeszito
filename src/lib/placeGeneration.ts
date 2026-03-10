import { randomUUID } from "crypto";
import { z, ZodError } from "zod";
import { callOpenAIChatCompletion, type OpenAIChatMessage } from "@/lib/openaiClient";
import { AI_MODEL_TEXT } from "@/lib/aiConfig";
import { extractJsonPayload, AIJsonParseError, AISchemaMismatchError } from "@/lib/aiUtils";
import { hashPrompt } from "@/lib/promptHash";
import { placeUiVariantsSchemaV1, type PlaceUiVariantsV1 } from "@/lib/placeContentSchema";
import { normalizePlaceNotableUnits } from "@/lib/placeNotableUnits";
import { PLACE_TYPE_VALUES, type PlaceType } from "@/types/place";

const placeTypeEnum = PLACE_TYPE_VALUES as unknown as [PlaceType, ...PlaceType[]];

const SYSTEM_PROMPT = `Te egy szerkesztői hangú, precíz helyszínleíró asszisztens vagy a Szárnyfeszítő projekthez.
Csak és kizárólag érvényes JSON-t adj vissza (nincs magyarázat, nincs markdown, nincs extra szöveg).

Fontos etika:
- A Place desztináció-szintű (nem megfigyelési pont).
- Ne adj meg pontos koordinátákat, rejtett ösvényeket, fészkelőhelyeket, vagy olyan tippeket, amelyek érzékeny fajokat veszélyeztethetnek.
- Ha a bemenet "sensitive" vagy "hidden", akkor még óvatosabban fogalmazz: csak általános, publikus információk.

Hangnem:
- nyugodt, leíró, közérthető
- finoman humoros, enyhén Douglas Adams-szerű, de soha nem paródia

A JSON pontos sémája:
- schema_version: "place_ui_variants_v1"
- language: "hu"
- variants: object
  - teaser: string (1-2 mondat)
  - short: string (rövid panel szöveg, 2-4 mondat)
  - long: string (2-4 bekezdés, barátságos, informatív)
  - seasonal_snippet: object { spring, summer, autumn, winter } (mindegyik 2-4 mondat)

  SEASONAL SNIPPET STYLE (spring/summer/autumn/winter):
  - Each season text must read like Bird long_paragraphs[0]: a concrete field-encounter vignette at this Place in that season (present tense, specific, observable).
  - Keep it grounded and non-generic; avoid hearsay/record phrases; do not invent digits/measurements.
  - Safety: no exact directions, no coordinates, no nest sites, no hidden paths; keep it destination-level.
  - ethics_tip: string (rövid etikai tipp)
  - did_you_know: string (rövid érdekesség)
  - practical_tip: string (gyakorlati tanács)
  - when_to_go: string (mikor érdemes menni)
  - who_is_it_for: string (kezdő/haladó, család, fotós, stb.)
  - nearby_protection_context: string (közeli védelem / természetvédelmi kontextus; csak publikus, általános)
  - notable_units: array (0-8 elem) of { name, unit_type?, distance_text?, short_note, order_index }

  NOTABLE UNITS GENERATION RULES
  - Egyes nagyobb helyszínek belsejében vannak ismert, névvel rendelkező alegységek / részek (pl. tavak egy része, sziget, kilátó környezete, ösvény-szakasz).
  - Ha a Place természetesen tartalmaz ilyeneket, adj vissza 3-8 tételt.
  - Ha nem vagy biztos valós, ismert nevekből, akkor add vissza: "notable_units": [] (ne találj ki neveket).
  - Kerüld a generikus filler neveket ("északi rész", "tópart") kivéve, ha tényleg így ismert a hely.
  - Ne adj pontos koordinátát, fészkelőhelyet, rejtett ösvényt vagy zavarásra alkalmas mikrotippet.
  - short_note: 1-2 mondat, informatív, nem túl biztos, nincs ritka faj "bait", nincs precíz irányítás.
  - distance_text: emberi, relatív (pl. "kb. 5 km-re", "a déli részen"); nem koordináta, nem pusztán szám.
  - order_index: egész szám, 1-től indul, megjelenítési sorrend.
`;

function zodIssuesToStrings(error: ZodError) {
  return error.issues
    .slice(0, 25)
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function notableUnitsFromPlaceUiPayload(payload: unknown): unknown {
  const obj = asRecord(payload);
  if (!obj) return undefined;
  if (Object.prototype.hasOwnProperty.call(obj, "notable_units")) {
    return obj.notable_units;
  }
  const variants = asRecord(obj.variants);
  if (variants && Object.prototype.hasOwnProperty.call(variants, "notable_units")) {
    return variants.notable_units;
  }
  return undefined;
}

function notableUnitsFromDraftPayload(payload: unknown): unknown {
  const obj = asRecord(payload);
  if (!obj) return undefined;
  if (Object.prototype.hasOwnProperty.call(obj, "notable_units")) {
    return obj.notable_units;
  }
  const content = asRecord(obj.content);
  const variants = content ? asRecord(content.variants) : null;
  if (variants && Object.prototype.hasOwnProperty.call(variants, "notable_units")) {
    return variants.notable_units;
  }
  return undefined;
}

export async function generatePlaceUiVariantsV1(args: {
  place_name: string;
  place_type: string;
  region_landscape?: string | null;
  county?: string | null;
  nearest_city?: string | null;
  admin_description?: string | null;
  location_precision?: "exact" | "approximate" | "hidden";
  sensitivity_level?: "normal" | "sensitive";
  existing_payload?: PlaceUiVariantsV1 | null;
  review_note?: string | null;
}): Promise<{
  payload: PlaceUiVariantsV1;
  notable_units: ReturnType<typeof normalizePlaceNotableUnits>;
  model: string;
  request_id: string;
  finish_reason: string;
  prompt_hash: string;
}> {
  const requestId = randomUUID();
  const modelId = AI_MODEL_TEXT;

  const userPayload = {
    place_name: args.place_name,
    place_type: args.place_type,
    region_landscape: args.region_landscape ?? null,
    county: args.county ?? null,
    nearest_city: args.nearest_city ?? null,
    admin_description: args.admin_description ?? null,
    location_precision: args.location_precision ?? "approximate",
    sensitivity_level: args.sensitivity_level ?? "normal",
    existing_payload: args.existing_payload ?? null,
    review_note: args.review_note ?? null,
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
    max_tokens: 1300,
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
    const payload = placeUiVariantsSchemaV1.parse(parsedResult.payload);
    const notableUnits = normalizePlaceNotableUnits(notableUnitsFromPlaceUiPayload(parsedResult.payload));
    return {
      payload,
      notable_units: notableUnits,
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

export type PlaceDraftMetaV1 = {
  place_type_primary: PlaceType;
  place_types: PlaceType[];
  region_landscape: string | null;
  county: string | null;
  district: string | null;
  nearest_city: string | null;
  distance_from_nearest_city_km: number | null;
  settlement: string | null;
  is_beginner_friendly: boolean;
  access_note: string | null;
  parking_note: string | null;
  best_visit_note: string | null;
  generation_input: string | null;
  location_precision: "exact" | "approximate" | "hidden";
  sensitivity_level: "normal" | "sensitive";
};

const placeMetaSchemaV1 = z.object({
  place_type_primary: z.enum(placeTypeEnum),
  place_types: z.array(z.enum(placeTypeEnum)).min(1),
  region_landscape: z.string().trim().min(1).nullable(),
  county: z.string().trim().min(1).nullable(),
  district: z.string().trim().min(1).nullable(),
  nearest_city: z.string().trim().min(1).nullable(),
  distance_from_nearest_city_km: z.number().int().nonnegative().nullable(),
  settlement: z.string().trim().min(1).nullable(),
  is_beginner_friendly: z.boolean(),
  access_note: z.string().trim().min(1).nullable(),
  parking_note: z.string().trim().min(1).nullable(),
  best_visit_note: z.string().trim().min(1).nullable(),
  generation_input: z.string().trim().min(1).nullable(),
  location_precision: z.enum(["exact", "approximate", "hidden"]),
  sensitivity_level: z.enum(["normal", "sensitive"]),
});

export const placeDraftFromNameSchemaV1 = z.object({
  schema_version: z.literal("place_draft_from_name_v1"),
  language: z.literal("hu"),
  place: placeMetaSchemaV1,
  content: placeUiVariantsSchemaV1,
});

export type PlaceDraftFromNameV1 = z.infer<typeof placeDraftFromNameSchemaV1>;

const DRAFT_SYSTEM_PROMPT = `Te egy precíz szerkesztői asszisztens vagy a Szárnyfeszítő Place modulhoz.
Csak és kizárólag érvényes JSON-t adj vissza (nincs magyarázat, nincs markdown, nincs extra szöveg).

Feladat:
- Egy magyarországi, jól ismert madármegfigyelő desztinációról kapsz egy nevet (pl. "Tatai Öreg-tó").
- A hely legyen desztináció-szintű (nem megfigyelési pont).
- A kért mezőkben adj valósághű, publikus információkat.
- Ha valamiben nem vagy biztos, add vissza null-ként.

Etika:
- Ne adj meg pontos koordinátákat, rejtett mikro-helyeket, fészkekre utaló tippeket.
- Alapértelmezés: location_precision="approximate", sensitivity_level="normal".

Válasz JSON sémája:
- schema_version: "place_draft_from_name_v1"
- language: "hu"
- place: {
  place_type_primary: one of ${PLACE_TYPE_VALUES.join(" | ")}
  place_types: array of the same enum (must include primary; can include extra if justified)
  region_landscape: string|null
  county: string|null
  district: string|null
  nearest_city: string|null
  distance_from_nearest_city_km: int|null
  settlement: string|null
  is_beginner_friendly: boolean
  access_note: string|null
  parking_note: string|null
  best_visit_note: string|null
  generation_input: string|null (rövid admin leírás, 1-2 mondat)
  location_precision: "exact"|"approximate"|"hidden"
  sensitivity_level: "normal"|"sensitive"
}
  - content: Place UI variants JSON (schema_version="place_ui_variants_v1", language="hu", variants: {...})
    - seasonal_snippet: for each season 2-4 sentences, in the same "field encounter" vignette tone as Bird long_paragraphs[0] (concrete, observable, non-generic); avoid hearsay/record phrases; do not invent digits/measurements.
  - notable_units: JSON array (0-8 elem; ha bizonytalan: []) of { name, unit_type?, distance_text?, short_note, order_index }`;

export async function generatePlaceDraftFromNameV1(args: {
  place_name: string;
}): Promise<{
  payload: PlaceDraftFromNameV1;
  notable_units: ReturnType<typeof normalizePlaceNotableUnits>;
  model: string;
  request_id: string;
  finish_reason: string;
  prompt_hash: string;
}> {
  const requestId = randomUUID();
  const modelId = AI_MODEL_TEXT;
  const userMessage = JSON.stringify({ place_name: args.place_name }, null, 2);
  const promptHash = hashPrompt(`${DRAFT_SYSTEM_PROMPT}\n\n${userMessage}`);

  const messages: OpenAIChatMessage[] = [
    { role: "system", content: DRAFT_SYSTEM_PROMPT },
    { role: "user", content: userMessage },
  ];

  const completion = await callOpenAIChatCompletion({
    model: modelId,
    temperature: 0.2,
    max_tokens: 1700,
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
    const payload = placeDraftFromNameSchemaV1.parse(parsedResult.payload);
    const notableUnits = normalizePlaceNotableUnits(notableUnitsFromDraftPayload(parsedResult.payload));
    return {
      payload,
      notable_units: notableUnits,
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
