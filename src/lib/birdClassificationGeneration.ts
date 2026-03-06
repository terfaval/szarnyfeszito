import { randomUUID } from "crypto";
import { ZodError } from "zod";
import { callOpenAIChatCompletion, type OpenAIChatMessage } from "@/lib/openaiClient";
import { AI_MODEL_TEXT } from "@/lib/config";
import { extractJsonPayload, AIJsonParseError, AISchemaMismatchError } from "@/lib/aiUtils";
import {
  parseBirdClassificationPayloadV1,
  type BirdClassificationPayloadSchemaV1,
} from "@/lib/birdClassificationSchema";
import type { Bird } from "@/types/bird";
import type { BirdDossier } from "@/types/dossier";

const SYSTEM_PROMPT = `You are classifying birds for a Hungarian bird guide admin registry.
Return JSON only (no commentary).

Output shape:
{
  "suggested": {
    "size_category": "very_small" | "small" | "medium" | "large" | null,
    "visibility_category": "frequent" | "seasonal" | "rare" | null,
    "confidence": "low" | "medium" | "high",
    "rationale": string
  }
}

Do NOT include any other top-level keys. (The server injects schema_version + inputs.)

SIZE BUCKET THRESHOLDS (cm):
- very_small: < 12
- small: 12 <= x < 20
- medium: 20 <= x <= 40
- large: > 40

VISIBILITY BUCKETS (Hungarian meanings):
- frequent: often encountered by a casual observer during the relevant season/habitat (common)
- seasonal: mainly visible during a limited season (migration/breeding/wintering)
- rare: rarely encountered (scarce or accidental)

If input data is insufficient, return null for the uncertain category and set confidence=low.`;

export type BirdClassificationGenerationResult = {
  payload: BirdClassificationPayloadSchemaV1;
  model: string;
  request_id: string;
  finish_reason: string;
};

function normalizeSuggestedShape(raw: Record<string, unknown>) {
  const hasFlatSuggestedKeys =
    "size_category" in raw ||
    "visibility_category" in raw ||
    "confidence" in raw ||
    "rationale" in raw;

  if (typeof raw.suggested === "object" && raw.suggested !== null) {
    if (!hasFlatSuggestedKeys) {
      return raw;
    }

    const { size_category, visibility_category, confidence, rationale, ...rest } = raw;
    return rest;
  }

  if (!hasFlatSuggestedKeys) {
    return raw;
  }

  const {
    size_category,
    visibility_category,
    confidence,
    rationale,
    ...rest
  } = raw;

  const normalizeString = (value: unknown) =>
    typeof value === "string" ? value.trim() : value;

  const normalizedConfidence =
    typeof confidence === "string" ? confidence.trim().toLowerCase() : confidence;

  return {
    ...rest,
    suggested: {
      size_category: normalizeString(size_category) ?? null,
      visibility_category: normalizeString(visibility_category) ?? null,
      confidence: normalizedConfidence ?? "low",
      rationale:
        (typeof rationale === "string" ? rationale.trim() : null) ??
        "Nincs indoklás.",
    },
  };
}

function dossierInputs(dossier: BirdDossier) {
  return {
    size_cm: {
      min: dossier.pill_meta.size_cm.min ?? null,
      max: dossier.pill_meta.size_cm.max ?? null,
    },
    distribution_regions: dossier.distribution.distribution_regions ?? [],
    is_migratory: dossier.migration.is_migratory ?? null,
    migration_timing: dossier.migration.timing ?? null,
  };
}

export async function generateBirdClassificationSuggestion(args: {
  bird: Bird;
  dossier: BirdDossier;
}): Promise<BirdClassificationGenerationResult> {
  const { bird, dossier } = args;
  const requestId = randomUUID();
  const inputs = dossierInputs(dossier);

  const messages: OpenAIChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: JSON.stringify(
        {
          bird: {
            id: bird.id,
            slug: bird.slug,
            name_hu: bird.name_hu,
            name_latin: bird.name_latin ?? null,
          },
          inputs,
        },
        null,
        2
      ),
    },
  ];

  const completion = await callOpenAIChatCompletion({
    model: AI_MODEL_TEXT,
    temperature: 0.2,
    max_tokens: 450,
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
    const normalized = normalizeSuggestedShape(extracted.payload);
    const payload = parseBirdClassificationPayloadV1({
      ...normalized,
      schema_version: "v1",
      inputs,
    });

    return {
      payload,
      model: modelName,
      request_id: requestId,
      finish_reason: finishReason,
    };
  } catch (error) {
    if (error instanceof ZodError) {
      const issues = error.issues
        .slice(0, 20)
        .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`);
      throw new AISchemaMismatchError(issues, rawJson);
    }

    throw error;
  }
}
