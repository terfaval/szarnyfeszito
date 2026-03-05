import { randomUUID } from "crypto";
import type { Bird } from "@/types/bird";
import {
  callOpenAIChatCompletion,
  type OpenAIChatMessage,
} from "@/lib/openaiClient";
import {
  AISchemaMismatchError,
  AIJsonParseError,
  AIQualityGateError,
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

const SCHEMA_VERSION = "v2.2";
const MAX_TOKENS = 1800;

const SHORT_OPTION_TRIM_MIN = 70;
const SHORT_OPTION_MAX_LEN = 170;

const safeTruncate = (value: string, limit: number) => {
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
  const collapsed = option.replace(/\s+/g, " ").trim();
  if (!collapsed) return collapsed;

  const needsSentenceEnding = !/[.!?]$/.test(collapsed);
  const limitBeforePunctuation = needsSentenceEnding
    ? SHORT_OPTION_MAX_LEN - 1
    : SHORT_OPTION_MAX_LEN;

  const truncated = safeTruncate(collapsed, limitBeforePunctuation);

  if (needsSentenceEnding && truncated.length < SHORT_OPTION_MAX_LEN) {
    return `${truncated}.`;
  }

  return truncated;
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

const extractAnchorKeywords = (signature: string): string[] => {
  const stopwords = ["és", "vagy", "mint", "az", "egy", "ami", "ahol"];
  return signature
    .toLowerCase()
    .split(/\W+/)
    .filter((word) => word.length >= 4 && !stopwords.includes(word))
    .slice(0, 3);
};

const validateSignatureCoherence = (dossier: BirdDossier) => {
  const reasons: string[] = [];
  if (!dossier.signature_trait) {
    reasons.push("Missing signature_trait");
    return reasons;
  }

  const anchors = extractAnchorKeywords(dossier.signature_trait);
  if (anchors.length === 0) {
    reasons.push("signature_trait too generic");
    return reasons;
  }

  const summary = (dossier.header?.short_summary ?? "").toLowerCase();
  const longText = (dossier.long_paragraphs ?? []).join(" ").toLowerCase();
  const shortText = (dossier.short_options ?? []).join(" ").toLowerCase();

  const summaryHit = anchors.some((anchor) => summary.includes(anchor));
  const longHits = anchors.filter((anchor) => longText.includes(anchor)).length;
  const shortHit = anchors.some((anchor) => shortText.includes(anchor));

  if (!summaryHit) reasons.push("signature not reflected in summary");
  if (longHits < 2) reasons.push("signature weakly reflected in long_paragraphs");
  if (!shortHit) reasons.push("signature not reflected in short_options");

  return reasons;
};

const validateSignatureSpecificity = (signature: string): string[] => {
  const s = signature.toLowerCase();
  const reasons: string[] = [];

  const generic = ["különleges", "jellegzetes", "lenyűgöző", "látványos", "figyelemfelkeltő"];
  const genericHits = generic.filter((w) => s.includes(w)).length;

  const concrete = [
    "hang",
    "trombit",
    "sziluett",
    "v-alak",
    "vonul",
    "csapat",
    "mocsár",
    "nádas",
    "puszta",
    "rét",
    "repül",
    "nyak",
    "láb",
  ];
  const hasConcrete = concrete.some((w) => s.includes(w));

  if (!hasConcrete) {
    reasons.push("signature_trait lacks concrete field-guide anchors");
  }
  if (genericHits >= 2 && signature.length < 80) {
    reasons.push("signature_trait reads generic (adjectives-only)");
  }
  if ((signature.match(/[.!?]/g) ?? []).length > 1) {
    reasons.push("signature_trait should be a single sentence");
  }

  return reasons;
};

const MAX_GENERATION_ATTEMPTS = 3;
const SHORT_OPTION_RETRY_HINT =
  "short_options must be exactly 3 strings, each a complete sentence ending in punctuation, 90-170 chars; across the 3 sentences cover at least two different axes (morphology/plumage/beak/sound/movement/habitat/behavior); avoid shared openings, trailing conjunctions, and sensory suffix templates.";

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
  "schema_version": "v2.2",
  "signature_trait": "Ä‚ËĂ˘â€šÂ¬Ă‚Â¦",
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

// Prefer an ASCII placeholder template to avoid mojibake confusing the model output.
// Keep enum-like literals (e.g. key_features.title) aligned with the Zod schema until encoding cleanup lands.
const JSON_TEMPLATE_V2_2 = `{
  "schema_version": "v2.2",
  "signature_trait": "...",
  "header": {
    "name_hu": "...",
    "name_latin": "...",
    "subtitle": "...",
    "short_summary": "..."
  },
  "pill_meta": {
    "habitat_class": "erdő",
    "region_teaser": "...",
    "size_cm": { "min": null, "max": null },
    "wingspan_cm": { "min": null, "max": null },
    "diet_short": "...",
    "lifespan_years": { "min": null, "max": null }
  },
  "short_options": ["...", "...", "..."],
  "long_paragraphs": ["...", "..."],
  "identification": {
    "key_features": [
      { "title": "CsĹ‘r", "description": "..." },
      { "title": "Tollazat", "description": "..." },
      { "title": "Hang", "description": "..." },
      { "title": "MozgĂˇs", "description": "..." }
    ],
    "identification_paragraph": "..."
  },
  "distribution": {
    "taxonomy": { "order": null, "family": null, "genus": null, "species": null },
    "iucn_status": null,
    "distribution_regions": ["..."],
    "distribution_note": "..."
  },
  "nesting": {
    "nesting_type": null,
    "nest_site": null,
    "breeding_season": null,
    "clutch_or_chicks_count": null,
    "nesting_note": "..."
  },
  "migration": {
    "is_migratory": null,
    "timing": null,
    "route": null,
    "migration_note": "..."
  },
  "fun_fact": "...",
  "did_you_know": "...",
  "ethics_tip": "...",
  "typical_places": ["..."]
}`;

const SYSTEM_PROMPT = `
Return ONLY a single JSON object. No markdown, no commentary, no code fences.

You MUST output EXACTLY the following object shape (fill values, keep keys/types):
${JSON_TEMPLATE_V2_2}

HARD RULES:
  - Top-level keys must be present: header, pill_meta, short_options, long_paragraphs, identification, distribution, nesting, migration, fun_fact, did_you_know, ethics_tip, typical_places.
- pill_meta.habitat_class must be exactly one of: erdő, vízpart, puszta, hegy, város (pick the strongest).
- distribution/nesting/migration MUST be objects (never strings).
- Use null for nullable fields when unknown; when you do provide numbers keep ranges conservative and avoid false precision (no spans < ~2 units unless null).
- Identity lock: header.name_hu must equal the normalized Hungarian name provided as input, and header.name_latin must match the provided Latin name exactly.
- short_options: exactly 3 strings, 90-170 chars, each a complete sentence ending in punctuation; across the 3 sentences cover at least two different axes (morphology/plumage/beak/sound/movement/habitat/behavior); no trailing conjunctions, no shared openings, no reliance on sensory suffix templates.
- short_summary: 1-2 sentences can lean Durrell/Adams but must include at least one concrete observable detail; avoid being reduced to “különleges madár” or “lenyűgöző faj” without detail.
- long_paragraphs: exactly two paragraphs; Paragraph 1 is a concrete field encounter scene, Paragraph 2 is context (habitat/migration/behavior) without repeating Paragraph 1; at most one witty sentence per paragraph; otherwise stay concrete, avoid hearsay/record phrases (“a helyiek szerint”, “gyakran nevezik”, “rekord”, etc.), and do not invent digits or citations.
- identification.key_features: four entries with distinct titles; each description must be field-usable (concrete, non-generic).
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
  mustHave(payload, "signature_trait");
  mustHave(payload, "header");
  mustHave(payload, "pill_meta");
  mustHave(payload, "short_options");
  mustHave(payload, "long_paragraphs");
  mustHave(payload, "identification");
  mustHave(payload, "distribution");
  mustHave(payload, "nesting");
  mustHave(payload, "migration");
  mustHave(payload, "fun_fact");
  mustHave(payload, "did_you_know");
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
export type GenerateBirdDossierOptions = {
  reviewComment?: string;
};

export async function generateBirdDossier(
  bird: Bird,
  options?: GenerateBirdDossierOptions
): Promise<DossierGenerationResult> {
  const safeReviewComment = options?.reviewComment
    ? options.reviewComment.trim().replace(/"/g, '\\"')
    : "";

  const reviewHint = safeReviewComment
    ? `Review note: "${safeReviewComment}". Use it to adjust the relevant sections while keeping the identity lock, structure, and tone rules intact.`
    : "";

  const templatePrompt = `
  Fill the template for this bird:
  - slug: "${bird.slug}"
  - name_hu: "${bird.name_hu}"
  - name_latin: "${bird.name_latin ?? "unknown"}"
  
  Content expectations (Hungarian):
  - Identity lock: use the provided names exactly; do not substitute another species.
  - pill_meta.habitat_class: pick 1 from (erdő/vízpart/puszta/hegy/város) as the strongest fit for this bird.
  - short_options: exactly 3 sentences, 90-170 chars, end punctuation; across the 3 sentences cover at least two different axes (morphology/plumage/beak/sound/movement/habitat/behavior) but do not force axis keywords.
  - short_summary: 1-2 sentences can lean Durrell/Adams but must include at least one concrete observable detail and avoid generic phrases.
  - long_paragraphs: exactly two paragraphs; Paragraph 1 is a concrete field encounter scene, Paragraph 2 is context (habitat/migration/behavior) without repeating Paragraph 1; at most one witty sentence per paragraph; avoid hearsay/records; do not invent digits or citations.
  - identification: deliver four field-usable cues (Csőr, Tollazat, Hang, Mozgás) with concrete, non-generic descriptions.
  - Structured facts: use null when unknown or offer conservative ranges (≥2 units wide) within plausible caps.
  - distribution/nesting/migration each needs short categorical fields + 2â€“3 sentence note.
  - Do not invent impossible claims.
  
  Output JSON only, matching the template exactly.
`.trim();

const SIGNATURE_TRAIT_INSTRUCTION = `
Step 1:
Choose exactly ONE dominant defining trait of this species
(visual, acoustic, behavioral, or ecological).
Output it as "signature_trait" in Hungarian (1 concise sentence).

Step 2:
Write header.short_summary and both long_paragraphs
so that they consistently center around this signature_trait.
Do not switch dominant focus mid-text.

pill_meta.habitat_class:
- Pick from the fixed set (erdő/vízpart/puszta/hegy/város) as the strongest fit.

short_options:
- exactly 3 standalone sentences
- 90-170 characters
- must end with punctuation
- across the 3 sentences cover at least two different axes
  (silhouette / plumage / beak / sound / movement / behavior / habitat)
- do not force axis keywords

long_paragraphs:
- exactly 2 paragraphs
- Paragraph 1: field encounter scene (concrete, specific)
- Paragraph 2: context (habitat/migration/behavior) with a different focus; do not repeat Paragraph 1
- at most one light witty sentence per paragraph

identification.key_features:
- exactly 4 items
- axis-diverse
- practical for real identification

Avoid generic filler phrases like:
"különleges megjelenés",
"könnyen felismerhető",
"gyakran megtalálható".

signature_trait MUST contain at least one concrete observable: sound OR silhouette OR habitat OR movement.
Do not use generic adjectives-only signatures like 'jellegzetes' / 'lenyűgöző' without concrete anchors.

If uncertain about numeric ranges, use null.
Avoid overly narrow ranges (false precision).
`.trim();

  const signaturePrompt = `${SIGNATURE_TRAIT_INSTRUCTION}\n\n${templatePrompt}`;
  const baseUserPrompt = reviewHint
    ? `${signaturePrompt}\n\n${reviewHint}`
    : signaturePrompt;

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

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
    const repairDirective = `REPAIR: fix schema/key/type mismatches; rewrite short_options to comply (${SHORT_OPTION_RETRY_HINT}); keep the voice vivid; output JSON only.`;
    const prompt = attempt === 1 ? baseUserPrompt : `${baseUserPrompt}\n\n${repairDirective}`;

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
        const specIssues = validateSignatureSpecificity(dossier.signature_trait);
        if (specIssues.length > 0) {
          throw new AIQualityGateError(specIssues);
        }
        const signatureIssues = validateSignatureCoherence(dossier);

        if (signatureIssues.length > 0) {
          throw new AIQualityGateError(signatureIssues);
        }
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
    } catch (caughtError) {
      let issues: string[];
      let failureLabel: string;
      let repairHint: string;

      if (caughtError instanceof ZodError) {
        issues = formatDossierValidationErrors(caughtError)
          .slice(0, 20)
          .map((i) => `${i.path}: ${i.message}`);
        failureLabel = "Zod validation failed";
        repairHint = buildRepairHintFromZod(caughtError);
      } else if (caughtError instanceof QualityGateError) {
        issues = caughtError.issues;
        failureLabel = "quality gate failure";
        repairHint = buildQualityGateHint(caughtError);
      } else if (caughtError instanceof AIQualityGateError) {
        issues = caughtError.reasons;
        failureLabel = "signature gate failure";
        const baseLines = [
          "Signature coherence gate failure. Keep every narrative block anchored to the signature_trait.",
          ...caughtError.reasons.map((issue) => `- ${issue}`),
        ];
        const allowsSignatureRewrite = caughtError.reasons.some(
          (reason) =>
            reason.includes("lacks concrete field-guide anchors") ||
            reason.includes("reads generic (adjectives-only)")
        );
        if (allowsSignatureRewrite) {
          baseLines.push(
            "Rewrite signature_trait into a more concrete field-guide hook (sound/silhouette/habitat/movement) and rewrite the supporting texts to match it."
          );
        } else {
          baseLines.push(
            "Keep the same signature_trait but rewrite texts to consistently reflect it."
          );
        }
        baseLines.push("Return valid JSON only.");
        repairHint = baseLines.join("\n");
      } else {
        throw caughtError;
      }

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
        const specIssues = validateSignatureSpecificity(dossier.signature_trait);
        if (specIssues.length > 0) {
          throw new AIQualityGateError(specIssues);
        }
        const retrySignatureIssues = validateSignatureCoherence(dossier);

        if (retrySignatureIssues.length > 0) {
          throw new AIQualityGateError(retrySignatureIssues);
        }
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
        if (
          !(retryErr instanceof ZodError) &&
          !(retryErr instanceof QualityGateError) &&
          !(retryErr instanceof AIQualityGateError)
        )
          throw retryErr;
        // fall through to next loop attempt
      }
    }
  }

  throw new Error("Unable to generate dossier.");
}
