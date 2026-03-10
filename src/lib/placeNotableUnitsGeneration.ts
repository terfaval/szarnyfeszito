import { randomUUID } from "crypto";
import { z, ZodError } from "zod";
import { callOpenAIChatCompletion, type OpenAIChatMessage } from "@/lib/openaiClient";
import { AI_MODEL_TEXT } from "@/lib/aiConfig";
import { extractJsonPayload, AIJsonParseError, AISchemaMismatchError } from "@/lib/aiUtils";
import { hashPrompt } from "@/lib/promptHash";
import { normalizePlaceNotableUnits } from "@/lib/placeNotableUnits";
import { PLACE_NOTABLE_UNIT_TYPE_VALUES, type PlaceNotableUnit } from "@/types/place";

const responseSchemaV1 = z
  .object({
    schema_version: z.literal("place_notable_units_v1"),
    language: z.literal("hu"),
    notable_units: z.array(z.unknown()).max(8),
  })
  .passthrough();

function zodIssuesToStrings(error: ZodError) {
  return error.issues
    .slice(0, 25)
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`);
}

const SYSTEM_PROMPT = `Te egy precíz szerkesztői asszisztens vagy a Szárnyfeszítő Place modulhoz.
Csak és kizárólag érvényes JSON-t adj vissza (nincs magyarázat, nincs markdown, nincs extra szöveg).

Feladat:
- A bemeneti Place meta alapján generálj 0–8 "notable units" tételt: névvel rendelkező alegységeket a helyszínen belül.
- Ezek tájékoztató jellegű, látogatói szinten érthető belső részek (pl. halastórendszer egy tava, sziget, ösvény-szakasz, kilátó környéke).

Stop rules / Safety:
- Ne adj pontos koordinátát, rejtett ösvényt, fészkelőhelyre utaló tippet, vagy "menj ide pontosan" jellegű útmutatást.
- Kerüld a ritka faj "bait" jellegű állításokat.
- Ha a hely "sensitive" vagy "hidden", akkor csak még általánosabb, publikus megfogalmazást használj.

Valódiság / hallucináció kerülése:
- Csak olyan neveket adj meg, amelyekről életszerűen feltételezhető, hogy tényleg ismert, használt belső helynevek.
- Ha nem vagy biztos valós, ismert nevekből: add vissza üresen: "notable_units": []

Mezők:
- name: kötelező (konkrét, egyedi név)
- unit_type: opcionális technikai kategória, ezekből válassz:
  ${PLACE_NOTABLE_UNIT_TYPE_VALUES.join(" | ")}
- distance_text: opcionális, emberi, relatív (pl. "a déli részen", "kb. 5 km-re"); nem lehet pusztán szám
- short_note: kötelező, 1–2 mondat, informatív, nem túl biztos, nem érzékeny
- order_index: kötelező egész szám, 1-től indul

Output pontos sémája:
{
  "schema_version": "place_notable_units_v1",
  "language": "hu",
  "notable_units": [
    {
      "name": "",
      "unit_type": "",
      "distance_text": "",
      "short_note": "",
      "order_index": 1
    }
  ]
}`;

export async function generatePlaceNotableUnitsV1(args: {
  place_name: string;
  place_type: string;
  region_landscape?: string | null;
  county?: string | null;
  nearest_city?: string | null;
  admin_description?: string | null;
  location_precision?: "exact" | "approximate" | "hidden";
  sensitivity_level?: "normal" | "sensitive";
  existing_units?: unknown | null;
  review_note?: string | null;
}): Promise<{
  notable_units: PlaceNotableUnit[];
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
    existing_units: args.existing_units ?? null,
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
    max_tokens: 900,
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
    const parsed = responseSchemaV1.parse(parsedResult.payload);
    const units = normalizePlaceNotableUnits(parsed.notable_units);
    return {
      notable_units: units,
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

