import { randomUUID } from "crypto";
import { ZodError } from "zod";
import { callOpenAIChatCompletion, type OpenAIChatMessage } from "@/lib/openaiClient";
import { AI_MODEL_TEXT } from "@/lib/aiConfig";
import { extractJsonPayload, AIJsonParseError, AISchemaMismatchError } from "@/lib/aiUtils";
import { hashPrompt } from "@/lib/promptHash";
import { placeUiVariantsSchemaV1, type PlaceUiVariantsV1 } from "@/lib/placeContentSchema";

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
  - ethics_tip: string (rövid etikai tipp)
  - did_you_know: string (rövid érdekesség)
  - practical_tip: string (gyakorlati tanács)
  - when_to_go: string (mikor érdemes menni)
  - who_is_it_for: string (kezdő/haladó, család, fotós, stb.)
  - nearby_protection_context: string (közeli védelem / természetvédelmi kontextus; csak publikus, általános)
`;

function zodIssuesToStrings(error: ZodError) {
  return error.issues
    .slice(0, 25)
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`);
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

