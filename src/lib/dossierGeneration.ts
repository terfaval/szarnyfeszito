import { randomUUID } from "crypto";
import type { Bird } from "@/types/bird";
import {
  callOpenAIChatCompletion,
  type OpenAIChatMessage,
} from "@/lib/openaiClient";
import {
  AISchemaMismatchError,
  AIJsonParseError,
  extractJsonPayload,
} from "@/lib/aiUtils";
import { AI_MODEL_TEXT } from "@/lib/config";
import { parseBirdDossier, formatDossierValidationErrors } from "@/lib/dossierSchema";
import { hashPrompt } from "@/lib/promptHash";
import type { BirdDossier } from "@/types/dossier";
import { normalizeHungarianName } from "@/lib/stringUtils";
import { ZodError } from "zod";
import {
  QualityGateError,
  buildQualityGateHint,
  runQualityGates,
} from "@/lib/dossierQualityGates";

const SCHEMA_VERSION = "v2.1";
const MAX_TOKENS = 1800;

const SHORT_OPTION_TRIM_MIN = 70;
const SHORT_OPTION_MAX_LEN = 170;

const trimToWordBoundary = (value: string, limit: number) => {
  if (value.length <= limit) return value;
  const truncated = value.slice(0, limit);
  const sentenceBreak = Math.max(
    truncated.lastIndexOf(". "),
    truncated.lastIndexOf("! "),
    truncated.lastIndexOf("? ")
  );
  if (sentenceBreak > SHORT_OPTION_TRIM_MIN) {
    return truncated.slice(0, sentenceBreak + 1).trim();
  }

  let lastSpace = truncated.lastIndexOf(" ");
  let fallback = -1;
  while (lastSpace > 0) {
    if (lastSpace >= SHORT_OPTION_TRIM_MIN) {
      return truncated.slice(0, lastSpace).trim();
    }
    fallback = lastSpace;
    lastSpace = truncated.lastIndexOf(" ", lastSpace - 1);
  }
  if (fallback > 0) {
    return truncated.slice(0, fallback).trim();
  }
  return truncated.trim();
};

const normalizeShortOption = (option: string) => {
  let normalized = option.replace(/\s+/g, " ").trim();
  if (!normalized) return normalized;

  const needsSentenceEnding = !/[.!?]$/.test(normalized);
  const limitBeforePunctuation = needsSentenceEnding
    ? SHORT_OPTION_MAX_LEN - 1
    : SHORT_OPTION_MAX_LEN;

  if (normalized.length > limitBeforePunctuation) {
    normalized = trimToWordBoundary(normalized, limitBeforePunctuation);
  }

  if (needsSentenceEnding && normalized.length < SHORT_OPTION_MAX_LEN) {
    normalized = `${normalized}.`;
  }

  return normalized;
};

const normalizeShortOptionsPayload = (payload: Record<string, unknown>) => {
  const options = payload.short_options;
  if (!Array.isArray(options)) return payload;
  const normalizedOptions = options.map((item) =>
    typeof item === "string" ? normalizeShortOption(item) : item
  );
  const changed = normalizedOptions.some((value, index) => value !== options[index]);
  if (!changed) return payload;
  return { ...payload, short_options: normalizedOptions };
};

const MAX_GENERATION_ATTEMPTS = 3;
const SHORT_OPTION_RETRY_HINT =
  "short_options must be exactly 3 strings, 90â€“170 chars, full sentences ending in punctuation, each tied to a separate axis (morphology/plumage/beak/sound/movement/habitat/behavior) without suffix dominance.";

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

type CompletionResult = {
  message: string;
  modelName: string;
  requestId: string;
  finishReason: string;
};

export type DossierGenerationResult = {
  dossier: BirdDossier;
  model: string;
  prompt: string;
  prompt_hash: string;
  generated_at: string;
};

// ---------- strict template ----------
const JSON_TEMPLATE = `{
  "schema_version": "v2.1",
  "header": {
    "name_hu": "Ă˘â‚¬Â¦",
    "name_latin": "Ă˘â‚¬Â¦",
    "subtitle": "Ă˘â‚¬Â¦",
    "short_summary": "Ă˘â‚¬Â¦"
  },
  "pill_meta": {
    "region_teaser": "Ă˘â‚¬Â¦",
    "size_cm": { "min": null, "max": null },
    "wingspan_cm": { "min": null, "max": null },
    "diet_short": "Ă˘â‚¬Â¦",
    "lifespan_years": { "min": null, "max": null }
  },
  "short_options": ["Ă˘â‚¬Â¦", "Ă˘â‚¬Â¦", "Ă˘â‚¬Â¦"],
  "long_paragraphs": ["Ă˘â‚¬Â¦", "Ă˘â‚¬Â¦"],
  "identification": {
    "key_features": [
      { "title": "Ă˘â‚¬Â¦", "description": "Ă˘â‚¬Â¦" },
      { "title": "Ă˘â‚¬Â¦", "description": "Ă˘â‚¬Â¦" },
      { "title": "Ă˘â‚¬Â¦", "description": "Ă˘â‚¬Â¦" },
      { "title": "Ă˘â‚¬Â¦", "description": "Ă˘â‚¬Â¦" }
    ],
    "identification_paragraph": "Ă˘â‚¬Â¦"
  },
  "distribution": {
    "taxonomy": { "order": null, "family": null, "genus": null, "species": null },
    "iucn_status": null,
    "distribution_regions": ["Ă˘â‚¬Â¦"],
    "distribution_note": "Ă˘â‚¬Â¦"
  },
  "nesting": {
    "nesting_type": null,
    "nest_site": null,
    "breeding_season": null,
    "clutch_or_chicks_count": null,
    "nesting_note": "Ă˘â‚¬Â¦"
  },
  "migration": {
    "is_migratory": null,
    "timing": null,
    "route": null,
    "migration_note": "Ă˘â‚¬Â¦"
  },
  "fun_fact": "Ă˘â‚¬Â¦",
  "ethics_tip": "Ă˘â‚¬Â¦",
  "typical_places": ["Ă˘â‚¬Â¦"]
}`;

const SYSTEM_PROMPT = `
Return ONLY a single JSON object. No markdown, no commentary, no code fences.

You MUST output EXACTLY the following object shape (fill values, keep keys/types):
${JSON_TEMPLATE}

HARD RULES:
- Top-level keys must be present: header, pill_meta, short_options, long_paragraphs, identification, distribution, nesting, migration, fun_fact, ethics_tip, typical_places.
- distribution/nesting/migration MUST be objects (never strings).
- Use null for nullable fields when unknown; when you do provide numbers keep ranges conservative and avoid false precision (no spans < ~2 units unless null).
- Identity lock: header.name_hu must equal the normalized Hungarian name provided as input, and header.name_latin must match the provided Latin name exactly.
- short_options: exactly 3 strings, 90â€“170 chars, complete sentences ending in punctuation, each tied to a distinct axis (morphology/plumage/beak/sound/movement/habitat/behavior), no trailing conjunctions, no shared openings, no reliance on sensory suffix templates.
- short_summary: 1â€“2 sentences can lean Durrell/Adams but must include at least one concrete axis anchor; avoid being reduced to “különleges madár” or “lenyűgöző faj” without detail.
- long_paragraphs: two paragraphs; the tone can carry one witty sentence per paragraph but otherwise stay concrete, avoid hearsay/record phrases (“a helyiek szerint”, “gyakran nevezik”, “rekord”, etc.), and do not invent digits or citations.
- identification.key_features: four entries with distinct titles; each description must mention the axis-specific keywords so the cue is field-usable.
- Output JSON only.
`.trim();

// ---------- validation / unwrap ----------
function unwrapCommonContainers(payload: Record<string, unknown>) {
  // If model returns { data: {...} } or { result: {...} } or { dossier: {...} }
  const candidates = ["data", "result", "dossier"];
  for (const key of candidates) {
    const v = payload[key];
    if (isPlainObject(v)) return v;
  }
  return payload;
}

function validateMinimumShape(payload: unknown, rawJson: string) {
  if (!isPlainObject(payload)) {
    throw new AISchemaMismatchError(["Root must be an object."], rawJson);
  }

  const issues: string[] = [];
  const mustHave = (obj: Record<string, unknown>, key: string) => {
    if (!(key in obj)) issues.push(`Missing key: ${key}`);
  };

  // We enforce schema_version ourselves too, but require the rest
  mustHave(payload, "header");
  mustHave(payload, "pill_meta");
  mustHave(payload, "short_options");
  mustHave(payload, "long_paragraphs");
  mustHave(payload, "identification");
  mustHave(payload, "distribution");
  mustHave(payload, "nesting");
  mustHave(payload, "migration");
  mustHave(payload, "fun_fact");
  mustHave(payload, "ethics_tip");
  mustHave(payload, "typical_places");

  if (issues.length) throw new AISchemaMismatchError(issues, rawJson);

  // Basic type checks for the usual failure mode
  const mustBeObject = (k: string) => {
    if (!isPlainObject(payload[k])) issues.push(`${k} must be an object`);
  };
  mustBeObject("header");
  mustBeObject("pill_meta");
  mustBeObject("identification");
  mustBeObject("distribution");
  mustBeObject("nesting");
  mustBeObject("migration");

  if (issues.length) throw new AISchemaMismatchError(issues, rawJson);
}

function buildRepairHintFromZod(error: ZodError) {
  const issues = formatDossierValidationErrors(error);
  const top = issues.slice(0, 12).map((i) => `${i.path}: ${i.message}`);
  return [
    "Your previous JSON failed validation. Fix it by editing the SAME object shape.",
    "Do NOT rename keys. Do NOT change types. Output JSON only.",
    `Reminder: ${SHORT_OPTION_RETRY_HINT}`,
    "Validation issues:",
    `- ${top.join("\n- ")}`,
  ].join("\n");
}

// ---------- main ----------
export async function generateBirdDossier(
  bird: Bird
): Promise<DossierGenerationResult> {
  const baseUserPrompt = `
  Fill the template for this bird:
  - slug: "${bird.slug}"
  - name_hu: "${bird.name_hu}"
  - name_latin: "${bird.name_latin ?? "unknown"}"
  
  Content expectations (Hungarian):
  - Identity lock: use the provided names exactly; do not substitute another species.
  - short_options: three axis taglines (morphology/plumage/beak/sound/movement/habitat/behavior), 90â€“170 chars, full sentences ending in punctuation, each anchored to a different axis.
  - short_summary: 1â€“2 sentences can lean Durrell/Adams but must include at least one concrete axis anchor and avoid generic phrases.
  - long_paragraphs: two paragraphs that stay concrete, avoid hearsay/records, and do not invent digits or citations.
  - identification: deliver four field-usable cues (Csőr, Tollazat, Hang, Mozgás) with axis-specific keywords in their descriptions.
  - Structured facts: use null when unknown or offer conservative ranges (≥2 units wide) within plausible caps.
  - distribution/nesting/migration each needs short categorical fields + 2â€“3 sentence note.
  - Do not invent impossible claims.
  
  Output JSON only, matching the template exactly.
`.trim();

  const runCompletion = async (prompt: string): Promise<CompletionResult> => {
    const messages: OpenAIChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ];

    const completion = await callOpenAIChatCompletion({
      model: AI_MODEL_TEXT,
      temperature: 0.3,
      max_tokens: MAX_TOKENS,
      messages,
      response_format: { type: "json_object" },
    });

    const modelName = completion.model ?? AI_MODEL_TEXT;
    const requestId = randomUUID();
    const finishReason = completion.choices?.[0]?.finish_reason ?? "unknown";
    const message = completion.choices?.[0]?.message?.content ?? "";

    if (!message) throw new Error("OpenAI response did not include a message.");

    if (process.env.DEBUG_AI === "true") {
      const snippetLimit = 800;
      console.info(
        `[AI][${requestId}] model=${modelName} finish=${finishReason} len=${message.length} head=${message.slice(
          0,
          snippetLimit
        )} tail=${message.slice(-snippetLimit)}`
      );
    }

    return { message, modelName, requestId, finishReason };
  };

  let lastRawJson = "";
  let lastModel = AI_MODEL_TEXT;
  let lastPrompt = baseUserPrompt;

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
    const prompt =
      attempt === 1
        ? baseUserPrompt
        : attempt === 2
          ? `${baseUserPrompt}\n\nREPAIR: keep sentences shorter everywhere; obey template; output JSON only.`
          : `${baseUserPrompt}\n\nREPAIR: focus on missing keys/types + short_options 60Ă˘â‚¬â€ś80 chars; output JSON only.`;

    lastPrompt = prompt;

    const response = await runCompletion(prompt);
    lastModel = response.modelName;

    const extracted = extractJsonPayload(response.message);
    if (!extracted.success) {
      throw new AIJsonParseError(
        response.requestId,
        response.modelName,
        extracted.error.reason,
        extracted.error.raw_head,
        extracted.error.raw_tail,
        response.finishReason
      );
    }

    lastRawJson = extracted.raw;

    // unwrap + enforce schema_version
    const unwrapped = unwrapCommonContainers(extracted.payload);
    const payload = {
      ...(unwrapped ?? {}),
      schema_version: SCHEMA_VERSION,
    };

    validateMinimumShape(payload, lastRawJson);

      try {
        const normalizedPayload = normalizeShortOptionsPayload(payload);
        const dossier = parseBirdDossier(normalizedPayload);
        runQualityGates(dossier, bird);
        dossier.header.name_hu = normalizeHungarianName(dossier.header.name_hu);

      const concatPrompt = `${SYSTEM_PROMPT}\n\n${prompt}`;
      const generatedAt = new Date().toISOString();

      return {
        dossier,
        prompt: concatPrompt,
        prompt_hash: hashPrompt(concatPrompt),
        model: response.modelName ?? AI_MODEL_TEXT,
        generated_at: generatedAt,
      };
    } catch (err) {
      if (!(err instanceof ZodError) && !(err instanceof QualityGateError)) throw err;

      const issues =
        err instanceof ZodError
          ? formatDossierValidationErrors(err)
              .slice(0, 20)
              .map((i) => `${i.path}: ${i.message}`)
          : err.issues;
      const failureLabel = err instanceof ZodError ? "Zod validation failed" : "quality gate failure";

      if (attempt === MAX_GENERATION_ATTEMPTS) {
        throw new AISchemaMismatchError(
          [
            `${failureLabel} after ${MAX_GENERATION_ATTEMPTS} attempts.`,
            `model=${lastModel}`,
            ...issues,
          ],
          lastRawJson || response.message
        );
      }

      const repairHint =
        err instanceof ZodError ? buildRepairHintFromZod(err) : buildQualityGateHint(err);
      const forcedPrompt = `${baseUserPrompt}\n\n${repairHint}\n\nOutput JSON only.`;

      const retry = await runCompletion(forcedPrompt);
      lastModel = retry.modelName;

      const retryExtracted = extractJsonPayload(retry.message);
      if (!retryExtracted.success) {
        throw new AIJsonParseError(
          retry.requestId,
          retry.modelName,
          retryExtracted.error.reason,
          retryExtracted.error.raw_head,
          retryExtracted.error.raw_tail,
          retry.finishReason
        );
      }

      lastRawJson = retryExtracted.raw;

      const retryUnwrapped = unwrapCommonContainers(retryExtracted.payload);
      const retryPayload = {
        ...(retryUnwrapped ?? {}),
        schema_version: SCHEMA_VERSION,
      };

      validateMinimumShape(retryPayload, lastRawJson);

      try {
        const normalizedRetryPayload = normalizeShortOptionsPayload(retryPayload);
        const dossier = parseBirdDossier(normalizedRetryPayload);
        runQualityGates(dossier, bird);
        dossier.header.name_hu = normalizeHungarianName(dossier.header.name_hu);

        const concatPrompt = `${SYSTEM_PROMPT}\n\n${forcedPrompt}`;
        const generatedAt = new Date().toISOString();

        return {
          dossier,
          prompt: concatPrompt,
          prompt_hash: hashPrompt(concatPrompt),
          model: retry.modelName ?? AI_MODEL_TEXT,
          generated_at: generatedAt,
        };
      } catch (retryErr) {
        if (!(retryErr instanceof ZodError) && !(retryErr instanceof QualityGateError)) throw retryErr;
        // fall through to next loop attempt
      }
    }
  }

  throw new Error("Unable to generate dossier.");
}
