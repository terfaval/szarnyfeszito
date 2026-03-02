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

const SCHEMA_VERSION = "v2.1";
const MAX_TOKENS = 1800;

const SHORT_OPTION_MIN_LEN = 70;
const SHORT_OPTION_MAX_LEN = 80;
const SHORT_OPTION_SENSORY_SUFFIXES = [
  "hangja selymes, mintha a nadas suttog a szelben",
  "sziluettje kisimul a pircspuha fenyben, mintha arnyekbol emelkedne",
  "mozgasat susogo, ropkepet hullamzik a lombok kozott",
  "elohelye nadas peremen rezzen, ahol a viz es az avar talalkozik",
];

const trimToWordBoundary = (value: string, limit: number) => {
  if (value.length <= limit) return value;
  const truncated = value.slice(0, limit);
  const sentenceBreak = Math.max(
    truncated.lastIndexOf(". "),
    truncated.lastIndexOf("! "),
    truncated.lastIndexOf("? ")
  );
  if (sentenceBreak > SHORT_OPTION_MIN_LEN) {
    return truncated.slice(0, sentenceBreak + 1).trim();
  }

  let lastSpace = truncated.lastIndexOf(" ");
  let fallback = -1;
  while (lastSpace > 0) {
    if (lastSpace >= SHORT_OPTION_MIN_LEN) {
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
  let suffixIndex = 0;
  while (normalized.length < SHORT_OPTION_MIN_LEN) {
    const suffix = SHORT_OPTION_SENSORY_SUFFIXES[suffixIndex % SHORT_OPTION_SENSORY_SUFFIXES.length];
    const spacer = normalized.endsWith(" ") ? "" : " ";
    normalized = `${normalized}${spacer}${suffix}`.replace(/\s+/g, " ").trim();
    suffixIndex += 1;
    if (normalized.length >= SHORT_OPTION_MAX_LEN) break;
  }
  if (normalized.length > SHORT_OPTION_MAX_LEN) {
    normalized = trimToWordBoundary(normalized, SHORT_OPTION_MAX_LEN);
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
  "short_options must be exactly 3 strings, each 60–80 chars, 1–2 sentences, include a sensory detail (sound/movement/silhouette/habitat).";

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
    "name_hu": "…",
    "name_latin": "…",
    "subtitle": "…",
    "short_summary": "…"
  },
  "pill_meta": {
    "region_teaser": "…",
    "size_cm": { "min": null, "max": null },
    "wingspan_cm": { "min": null, "max": null },
    "diet_short": "…",
    "lifespan_years": { "min": null, "max": null }
  },
  "short_options": ["…", "…", "…"],
  "long_paragraphs": ["…", "…"],
  "identification": {
    "key_features": [
      { "title": "…", "description": "…" },
      { "title": "…", "description": "…" },
      { "title": "…", "description": "…" },
      { "title": "…", "description": "…" }
    ],
    "identification_paragraph": "…"
  },
  "distribution": {
    "taxonomy": { "order": null, "family": null, "genus": null, "species": null },
    "iucn_status": null,
    "distribution_regions": ["…"],
    "distribution_note": "…"
  },
  "nesting": {
    "nesting_type": null,
    "nest_site": null,
    "breeding_season": null,
    "clutch_or_chicks_count": null,
    "nesting_note": "…"
  },
  "migration": {
    "is_migratory": null,
    "timing": null,
    "route": null,
    "migration_note": "…"
  },
  "fun_fact": "…",
  "ethics_tip": "…",
  "typical_places": ["…"]
}`;

const SYSTEM_PROMPT = `
Return ONLY a single JSON object. No markdown, no commentary, no code fences.

You MUST output EXACTLY the following object shape (fill values, keep keys/types):
${JSON_TEMPLATE}

HARD RULES:
- Top-level keys must be present: header, pill_meta, short_options, long_paragraphs, identification, distribution, nesting, migration, fun_fact, ethics_tip, typical_places.
- distribution/nesting/migration MUST be objects (never strings).
- Use null for nullable fields when unknown.
- short_options: exactly 3 items, each 60–80 characters, 1–2 Hungarian sentences, include a sensory detail.
- long_paragraphs: exactly 2 standalone paragraphs (Hungarian).
- identification.key_features: exactly 4 {title, description}.
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
- Make identification strongly usable for scientific illustration (beak, plumage, sound, movement).
- distribution/nesting/migration each needs short categorical fields + 2–3 sentence note.
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
          : `${baseUserPrompt}\n\nREPAIR: focus on missing keys/types + short_options 60–80 chars; output JSON only.`;

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
      if (!(err instanceof ZodError)) throw err;

      if (attempt === MAX_GENERATION_ATTEMPTS) {
        const zodIssues = formatDossierValidationErrors(err)
          .slice(0, 20)
          .map((i) => `${i.path}: ${i.message}`);

        throw new AISchemaMismatchError(
          [
            `Zod validation failed after ${MAX_GENERATION_ATTEMPTS} attempts.`,
            `model=${lastModel}`,
            ...zodIssues,
          ],
          lastRawJson || response.message
        );
      }

      // One immediate repair attempt with concrete Zod feedback (doesn't consume next loop attempt)
      const repairHint = buildRepairHintFromZod(err);
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
        if (!(retryErr instanceof ZodError)) throw retryErr;
        // fall through to next loop attempt
      }
    }
  }

  throw new Error("Unable to generate dossier.");
}
