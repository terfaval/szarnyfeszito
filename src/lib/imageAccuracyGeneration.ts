import { randomUUID } from "crypto";
import { ZodError } from "zod";
import { callOpenAIChatCompletion, type OpenAIChatMessage } from "@/lib/openaiClient";
import { AI_MODEL_TEXT } from "@/lib/config";
import { extractJsonPayload, AIJsonParseError, AISchemaMismatchError } from "@/lib/aiUtils";
import {
  scienceDossierSchemaV1,
  visualBriefSchemaV1,
  type ScienceDossierV1,
  type VisualBriefV1,
} from "@/lib/imageAccuracySchemas";
import type { Bird } from "@/types/bird";
import type { BirdDossier } from "@/types/dossier";

const SCIENCE_SYSTEM_PROMPT = `You are producing a scientific accuracy dossier for a Hungarian bird guide admin studio.
Return JSON only (no commentary).

Your output MUST match this schema:
- species_identity { name_hu, name_latin }
- confusion_set: array of { species_name, quick_diff }
- key_field_marks: array (max 8) of { mark }
- proportions: { neck (short|medium|long), legs (short|medium|long), body (slim|average|stocky), beak { length (short|medium|long), shape (straight|curved) } }
- plumage_variants: { adult, juvenile|not_applicable, breeding|not_applicable, non_breeding|not_applicable }
- must_not_include: array (3-8 strings)
- confidence: { per_section: high|medium|low, notes }

Constraints:
- Focus on identification-friendly, species-accurate markers.
- If inputs are insufficient, keep proportions conservative (neck/legs/beak: medium; body: average) and confidence low.`;

const VISUAL_SYSTEM_PROMPT = `You are producing a visual brief / shot list for image generation of a Hungarian bird guide.
Return JSON only (no commentary).

Your output MUST match this schema:
- scientific.main_habitat { pose, composition_rules[], habitat_hint_elements[2-4], background_rules[], must_not[] }
- scientific.flight_clean (optional)
- scientific.nesting_clean (optional)
- iconic { silhouette_focus[2-3], simplify_features[], color_guidance?, must_not[], background: "none" }

Constraints:
- scientific.main_habitat must be full-body, dominant side view, with only a very mild habitat hint.
- iconic must be bird-only (background: none). Habitat backgrounds are provided externally (stock assets).
- Avoid invented anatomy, fantasy colors, or mixing with confusion species.`;

function zodIssuesToStrings(error: ZodError) {
  return error.issues
    .slice(0, 25)
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`);
}

export async function generateScienceDossierV1(args: {
  bird: Bird;
  dossier: BirdDossier | null;
}): Promise<{ payload: ScienceDossierV1; model: string; request_id: string; finish_reason: string }> {
  const requestId = randomUUID();

  const messages: OpenAIChatMessage[] = [
    { role: "system", content: SCIENCE_SYSTEM_PROMPT },
    {
      role: "user",
      content: JSON.stringify(
        {
          bird: {
            id: args.bird.id,
            slug: args.bird.slug,
            name_hu: args.bird.name_hu,
            name_latin: args.bird.name_latin ?? null,
          },
          field_guide_dossier: args.dossier
            ? {
                signature_trait: args.dossier.signature_trait,
                header: args.dossier.header,
                pill_meta: args.dossier.pill_meta,
                identification: args.dossier.identification,
                distribution: args.dossier.distribution,
                nesting: args.dossier.nesting,
                migration: args.dossier.migration,
              }
            : null,
        },
        null,
        2
      ),
    },
  ];

  const completion = await callOpenAIChatCompletion({
    model: AI_MODEL_TEXT,
    temperature: 0.2,
    max_tokens: 900,
    messages,
    response_format: { type: "json_object" },
  });

  const modelName = completion.model ?? AI_MODEL_TEXT;
  const finishReason = completion.choices?.[0]?.finish_reason ?? "unknown";
  const message = completion.choices?.[0]?.message?.content ?? "";

  if (!message) {
    throw new Error("OpenAI response did not include a message.");
  }

  const extracted = extractJsonPayload(message);
  if (!extracted.success) {
    throw new AIJsonParseError(
      requestId,
      modelName,
      extracted.error.reason,
      extracted.error.raw_head,
      extracted.error.raw_tail,
      finishReason
    );
  }

  const rawJson = extracted.raw;
  try {
    const payload = scienceDossierSchemaV1.parse(extracted.payload);
    return { payload, model: modelName, request_id: requestId, finish_reason: finishReason };
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AISchemaMismatchError(zodIssuesToStrings(error), rawJson);
    }
    throw error;
  }
}

export async function generateVisualBriefV1(args: {
  bird: Bird;
  dossier: BirdDossier | null;
  scienceDossier: ScienceDossierV1;
}): Promise<{ payload: VisualBriefV1; model: string; request_id: string; finish_reason: string }> {
  const requestId = randomUUID();

  const messages: OpenAIChatMessage[] = [
    { role: "system", content: VISUAL_SYSTEM_PROMPT },
    {
      role: "user",
      content: JSON.stringify(
        {
          bird: {
            id: args.bird.id,
            slug: args.bird.slug,
            name_hu: args.bird.name_hu,
            name_latin: args.bird.name_latin ?? null,
          },
          science_dossier: args.scienceDossier,
          field_guide_dossier: args.dossier
            ? {
                signature_trait: args.dossier.signature_trait,
                header: args.dossier.header,
                pill_meta: args.dossier.pill_meta,
                identification: args.dossier.identification,
                distribution: args.dossier.distribution,
              }
            : null,
        },
        null,
        2
      ),
    },
  ];

  const completion = await callOpenAIChatCompletion({
    model: AI_MODEL_TEXT,
    temperature: 0.2,
    max_tokens: 900,
    messages,
    response_format: { type: "json_object" },
  });

  const modelName = completion.model ?? AI_MODEL_TEXT;
  const finishReason = completion.choices?.[0]?.finish_reason ?? "unknown";
  const message = completion.choices?.[0]?.message?.content ?? "";

  if (!message) {
    throw new Error("OpenAI response did not include a message.");
  }

  const extracted = extractJsonPayload(message);
  if (!extracted.success) {
    throw new AIJsonParseError(
      requestId,
      modelName,
      extracted.error.reason,
      extracted.error.raw_head,
      extracted.error.raw_tail,
      finishReason
    );
  }

  const rawJson = extracted.raw;
  try {
    const payload = visualBriefSchemaV1.parse(extracted.payload);
    return { payload, model: modelName, request_id: requestId, finish_reason: finishReason };
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AISchemaMismatchError(zodIssuesToStrings(error), rawJson);
    }
    throw error;
  }
}
