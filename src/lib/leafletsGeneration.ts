import { randomUUID } from "crypto";
import type { Bird } from "@/types/bird";
import type { BirdDossier, BirdDossierLeafletsV1 } from "@/types/dossier";
import { AI_MODEL_TEXT } from "@/lib/config";
import { callOpenAIChatCompletion, OpenAIChatMessage } from "@/lib/openaiClient";
import { extractJsonPayload, AIJsonParseError } from "@/lib/aiUtils";
import { ZodError } from "zod";
import { leafletsSchemaV1, parseLeafletsV1 } from "@/lib/leafletsSchema";
import { hashPrompt } from "@/lib/promptHash";

const MAX_ATTEMPTS = 3;
const MAX_TOKENS = 1200;

const SYSTEM_PROMPT = `
You generate JSON for a bird guide admin tool.
Output JSON only. Never wrap it in markdown fences.
Keep region choices conservative and explain uncertainty in note fields.
`.trim();

const WORLD_REGIONS = [
  "europe",
  "africa",
  "asia",
  "north_america",
  "south_america",
  "oceania",
] as const;

const HUNGARY_REGIONS = [
  "HU10",
  "HU21",
  "HU22",
  "HU23",
  "HU31",
  "HU32",
  "HU33",
] as const;

function buildRepairHintFromZod(error: ZodError) {
  const issues = error.issues.slice(0, 12).map((issue) => ({
    path: issue.path.join(".") || "(root)",
    message: issue.message,
  }));
  return [
    "Your previous JSON failed validation. Fix it by editing the SAME object shape.",
    "Do NOT rename keys. Do NOT change types. Output JSON only.",
    "Validation issues:",
    ...issues.map((i) => `- ${i.path}: ${i.message}`),
  ].join("\n");
}

export type LeafletsGenerationResult = {
  leaflets: BirdDossierLeafletsV1;
  prompt: string;
  prompt_hash: string;
  model: string;
  generated_at: string;
};

export async function generateLeafletsV1(args: {
  bird: Bird;
  dossier: BirdDossier;
  source: "with_text" | "backfill";
}): Promise<LeafletsGenerationResult> {
  const { bird, dossier, source } = args;

  const visibility = bird.visibility_category ?? "unknown";
  const distributionRegions = dossier.distribution?.distribution_regions ?? [];
  const distributionNote = dossier.distribution?.distribution_note ?? "";
  const migrationNote = dossier.migration?.migration_note ?? "";
  const typicalPlaces = Array.isArray(dossier.typical_places)
    ? dossier.typical_places.slice(0, 8)
    : [];

  const basePrompt = `
Generate region-level map markers ("leaflets") for this bird.

Identity:
- name_hu: "${bird.name_hu}"
- name_latin: "${bird.name_latin ?? ""}"
- visibility_category_hu: "${visibility}" (Hungary-scoped; "not_in_hu" means the bird is not observable in Hungary)

Inputs (do not invent beyond these; prefer conservative choices):
- dossier.distribution.distribution_regions: ${JSON.stringify(distributionRegions)}
- dossier.distribution.distribution_note: ${JSON.stringify(distributionNote)}
- dossier.migration.migration_note: ${JSON.stringify(migrationNote)}
- dossier.typical_places (HU): ${JSON.stringify(typicalPlaces)}

Output JSON that matches this schema exactly:
{
  "schema_version": "leaflets_v1",
  "world": {
    "regions": [
      { "code": <WORLD_REGION_CODE>, "intensity": <0..1>, "rationale": <short> }
    ],
    "note": <short>
  },
  "hungary": {
    "regions": [
      { "code": <HUNGARY_REGION_CODE>, "intensity": <0..1>, "rationale": <short> }
    ],
    "note": <short>
  }
}

Allowed WORLD_REGION_CODE values:
${WORLD_REGIONS.map((c) => `- ${c}`).join("\n")}

Allowed HUNGARY_REGION_CODE values (7 regions):
${HUNGARY_REGIONS.map((c) => `- ${c}`).join("\n")}

Rules:
- World regions: choose 1–4 regions that best match the distribution inputs. Always include at least 1 region.
- Hungary regions:
  - If visibility_category_hu == "not_in_hu": hungary.regions MUST be [] and hungary.note must say it's not observable in Hungary.
  - Otherwise: choose 1–4 regions based on typical_places + distribution/migration notes; if uncertain, choose fewer regions with lower intensities.
- Intensities must be within 0..1 (low≈0.2, medium≈0.5, high≈0.8).
- Rationales must be short and concrete (≤220 chars).
- Notes: mention seasonality/uncertainty briefly (≤600 chars).

Output JSON only.
`.trim();

  const runCompletion = async (prompt: string) => {
    const messages: OpenAIChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ];

    const completion = await callOpenAIChatCompletion({
      model: AI_MODEL_TEXT,
      temperature: 0.2,
      max_tokens: MAX_TOKENS,
      messages,
      response_format: { type: "json_object" },
    });

    const modelName = completion.model ?? AI_MODEL_TEXT;
    const requestId = randomUUID();
    const finishReason = completion.choices?.[0]?.finish_reason ?? "unknown";
    const message = completion.choices?.[0]?.message?.content ?? "";
    return { message, modelName, requestId, finishReason };
  };

  let repairHint = "";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const prompt = repairHint ? `${basePrompt}\n\nREPAIR:\n${repairHint}` : basePrompt;
    const response = await runCompletion(prompt);
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

    try {
      const parsed = parseLeafletsV1(extracted.payload);
      const generatedAt = new Date().toISOString();
      const withMeta: BirdDossierLeafletsV1 = {
        ...parsed,
        model: response.modelName ?? AI_MODEL_TEXT,
        generated_at: generatedAt,
        source,
      };

      if (visibility === "not_in_hu" && withMeta.hungary.regions.length > 0) {
        withMeta.hungary.regions = [];
        withMeta.hungary.note = "not_in_hu: a faj nem megfigyelhető Magyarországon.";
      }

      const concatPrompt = `${SYSTEM_PROMPT}\n\n${prompt}`;
      return {
        leaflets: withMeta,
        prompt: concatPrompt,
        prompt_hash: hashPrompt(concatPrompt),
        model: response.modelName ?? AI_MODEL_TEXT,
        generated_at: generatedAt,
      };
    } catch (error) {
      if (error instanceof ZodError) {
        repairHint = buildRepairHintFromZod(error);
        continue;
      }

      const schemaPreview = leafletsSchemaV1.safeParse(extracted.payload);
      if (!schemaPreview.success) {
        repairHint = buildRepairHintFromZod(schemaPreview.error);
        continue;
      }

      throw error;
    }
  }

  throw new Error("Unable to generate valid leaflets payload.");
}
