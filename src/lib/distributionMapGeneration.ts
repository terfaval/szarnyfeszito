import { randomUUID } from "crypto";
import type { Bird } from "@/types/bird";
import type { BirdDossier } from "@/types/dossier";
import type { BirdDistributionMapPayloadV1 } from "@/types/distributionMap";
import { AI_MODEL_TEXT } from "@/lib/config";
import { callOpenAIChatCompletion, OpenAIChatMessage } from "@/lib/openaiClient";
import { extractJsonPayload, AIJsonParseError } from "@/lib/aiUtils";
import { ZodError } from "zod";
import { hashPrompt } from "@/lib/promptHash";
import { parseDistributionMapPayloadV1 } from "@/lib/distributionMapSchema";

const SYSTEM_PROMPT = `
You generate strict JSON for a bird guide admin tool.
Output JSON only. No markdown fences. No commentary.
Geometries must be valid GeoJSON Polygon or MultiPolygon in lon/lat coordinates.
If uncertain, prefer coarse, conservative polygons over overly detailed shapes.
`.trim();

const MAX_ATTEMPTS = 3;
const MAX_TOKENS = 2200;

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

export type DistributionMapGenerationResult = {
  payload: BirdDistributionMapPayloadV1;
  prompt: string;
  prompt_hash: string;
  model: string;
  generated_at: string;
};

export async function generateBirdDistributionMapV1(args: {
  bird: Bird;
  dossier?: BirdDossier | null;
}): Promise<DistributionMapGenerationResult> {
  const { bird, dossier } = args;

  const distributionRegions = dossier?.distribution?.distribution_regions ?? [];
  const distributionNote = dossier?.distribution?.distribution_note ?? "";
  const migrationNote = dossier?.migration?.migration_note ?? "";

  const basePrompt = `
Infer a polygon-based species distribution map.

Species identity:
- species_common_name: "${bird.name_hu}"
- species_scientific_name: "${bird.name_latin ?? ""}"

Helpful dossier hints (do not invent beyond these; they are only hints):
- distribution_regions: ${JSON.stringify(distributionRegions)}
- distribution_note: ${JSON.stringify(distributionNote)}
- migration_note: ${JSON.stringify(migrationNote)}

Statuses (fixed enum):
- resident: year-round presence
- breeding: breeding area
- wintering: wintering area
- passage: migration corridor / passage area

Output JSON schema (strict):
{
  "species_common_name": "...",
  "species_scientific_name": "...",
  "summary": "...",
  "references": ["..."],
  "ranges": [
    {
      "status": "resident|breeding|wintering|passage",
      "confidence": 0.0,
      "note": "optional",
      "geometry": { "type": "Polygon|MultiPolygon", "coordinates": [...] }
    }
  ]
}

Geometry rules:
- GeoJSON uses lon/lat numeric coordinates (longitude first).
- Each Polygon ring must be closed (first==last) and have at least 4 points.
- It is acceptable in v1 to approximate with coarse rectangles/polygons (do not try to trace coastlines).
- Keep coordinate values within valid ranges; avoid self-intersections by keeping shapes simple.

Quality rules:
- Always include at least 1 range entry.
- If you cannot justify a status confidently, omit that status instead of guessing.
- confidence is informational only (0..1).

Output JSON only.
`.trim();

  const runCompletion = async (prompt: string) => {
    const messages: OpenAIChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ];

    const completion = await callOpenAIChatCompletion({
      model: AI_MODEL_TEXT,
      temperature: 0.1,
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
      const parsed = parseDistributionMapPayloadV1(extracted.payload);
      const generatedAt = new Date().toISOString();
      const concatPrompt = `${SYSTEM_PROMPT}\n\n${prompt}`;
      return {
        payload: parsed,
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
      throw error;
    }
  }

  throw new Error("Unable to generate a valid distribution map payload.");
}

