import { randomUUID } from "crypto";
import type { Bird } from "@/types/bird";
import type { BirdDossier } from "@/types/dossier";
import type {
  BirdDistributionMapPayloadV1,
  DistributionGeometry,
  DistributionStatus,
  GeoJSONMultiPolygon,
} from "@/types/distributionMap";
import { DISTRIBUTION_REGION_CATALOG_SOURCE } from "@/lib/config";
import { AI_MODEL_TEXT } from "@/lib/aiConfig";
import { callOpenAIChatCompletion, OpenAIChatMessage } from "@/lib/openaiClient";
import { extractJsonPayload, AIJsonParseError } from "@/lib/aiUtils";
import { leafletsSchema } from "@/lib/leafletsSchema";
import { getHungaryRegionV2Def, getWorldRegionV2Def } from "@/lib/leafletsRegionsV2";
import {
  getDistributionRegionGeometriesById,
  listDistributionRegionCatalogMeta,
} from "@/lib/distributionRegionCatalogService";
import { loadRegionCatalogFromRepo } from "@/lib/distributionRegionCatalogFile";
import { ZodError } from "zod";
import { hashPrompt } from "@/lib/promptHash";
import { geometrySchema, parseDistributionMapPayloadV1 } from "@/lib/distributionMapSchema";
import { z } from "zod";

const SYSTEM_PROMPT = `
You generate strict JSON for a bird guide admin tool.
Output JSON only. No markdown fences. No commentary.
Do NOT output polygon coordinates.
Only select region_ids from the provided candidate lists.
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

type Bounds = { south: number; west: number; north: number; east: number };

function bboxIntersects(a: Bounds, b: Bounds) {
  return a.west <= b.east && a.east >= b.west && a.south <= b.north && a.north >= b.south;
}

function asMultiPolygon(geom: DistributionGeometry): GeoJSONMultiPolygon {
  if (geom.type === "MultiPolygon") return geom;
  return { type: "MultiPolygon", coordinates: [geom.coordinates] };
}

function mergeAsMultiPolygon(geoms: DistributionGeometry[]): GeoJSONMultiPolygon {
  const merged: GeoJSONMultiPolygon["coordinates"] = [];
  geoms.forEach((g) => merged.push(...asMultiPolygon(g).coordinates));
  return { type: "MultiPolygon", coordinates: merged };
}

const trimmed = () => z.string().trim().min(1);
const statusSchema = z.enum(["resident", "breeding", "wintering", "passage"] as const);
const confidenceSchema = z.number().min(0).max(1);

const selectionRangeSchema = z
  .object({
    status: statusSchema,
    confidence: confidenceSchema,
    note: trimmed().max(600),
    region_ids: z.array(trimmed()).min(1).max(60),
  })
  .strict();

const selectionPayloadSchemaV1 = z
  .object({
    species_common_name: trimmed(),
    species_scientific_name: trimmed(),
    summary: trimmed().max(1200),
    references: z.array(trimmed().max(400)).max(24),
    ranges: z.array(selectionRangeSchema).min(1).max(24),
  })
  .strict();

type SelectionPayloadV1 = z.infer<typeof selectionPayloadSchemaV1>;

function buildCandidateLines(items: Array<{ region_id: string; name: string }>): string {
  return items.map((i) => `${i.region_id}|${i.name}`).join("\n");
}

export async function generateBirdDistributionMapV1(args: {
  bird: Bird;
  dossier?: BirdDossier | null;
}): Promise<DistributionMapGenerationResult> {
  const { bird, dossier } = args;

  const distributionRegions = dossier?.distribution?.distribution_regions ?? [];
  const distributionNote = dossier?.distribution?.distribution_note ?? "";
  const migrationNote = dossier?.migration?.migration_note ?? "";

  const leafletsParsed = leafletsSchema.safeParse(dossier?.leaflets);
  const leafletsV2 =
    leafletsParsed.success && leafletsParsed.data.schema_version === "leaflets_v2"
      ? leafletsParsed.data
      : null;

  const worldBounds: Bounds[] = leafletsV2
    ? leafletsV2.world.present.flatMap((code) => getWorldRegionV2Def(code).bounds)
    : [];

  const hungaryBounds: Bounds[] = leafletsV2
    ? leafletsV2.hungary.present.flatMap((code) => getHungaryRegionV2Def(code).bounds)
    : [];

  const allowRepo = DISTRIBUTION_REGION_CATALOG_SOURCE !== "supabase";
  const allowSupabase = DISTRIBUTION_REGION_CATALOG_SOURCE !== "repo";

  const globalRepo = allowRepo ? await loadRegionCatalogFromRepo("globalRegions") : null;
  const hungaryRepo = allowRepo ? await loadRegionCatalogFromRepo("hungaryRegions") : null;

  const globalMeta =
    globalRepo && globalRepo.length
      ? globalRepo.map((r) => ({
          region_id: r.region_id,
          name: r.name,
          scope: r.scope,
          type: r.type,
          source: r.source,
          bbox: r.bbox,
        }))
      : allowSupabase
        ? await listDistributionRegionCatalogMeta("globalRegions")
        : [];

  if (globalMeta.length === 0) {
    throw new Error([
      "Region catalog is missing/empty: globalRegions.",
      "Fix: import catalogs into Supabase (distribution_region_catalog_items) OR provide repo catalog files.",
      "",
      "Supabase import (recommended):",
      '- npm run region:catalog:import -- \"TICKETS/leaflet shapefile builder/out/globalRegions.json\" \"TICKETS/leaflet shapefile builder/out/hungaryRegions.json\"',
      "- npm run region:catalog:verify",
      "",
      "Repo catalogs (dev/local):",
      "- Set DISTRIBUTION_REGION_CATALOG_SOURCE=repo (or auto)",
      "- Provide globalRegions.json(.gz) and hungaryRegions.json(.gz)",
      "- Optional: set DISTRIBUTION_REGION_CATALOG_REPO_DIR to the folder containing those files",
    ].join("\n"));
  }

  const hungaryMeta =
    hungaryRepo && hungaryRepo.length
      ? hungaryRepo.map((r) => ({
          region_id: r.region_id,
          name: r.name,
          scope: r.scope,
          type: r.type,
          source: r.source,
          bbox: r.bbox,
        }))
      : allowSupabase
        ? await listDistributionRegionCatalogMeta("hungaryRegions").catch(() => [])
        : [];

  const globalCandidates = worldBounds.length
    ? globalMeta.filter((r) => worldBounds.some((b) => bboxIntersects(r.bbox, b)))
    : globalMeta.filter((r) => r.type === "country");

  const ecoCandidates = globalCandidates.filter((r) => r.type === "ecoregion");
  const countryCandidates = globalCandidates.filter((r) => r.type === "country");

  const hungaryCandidates = hungaryBounds.length
    ? hungaryMeta.filter((r) => hungaryBounds.some((b) => bboxIntersects(r.bbox, b)))
    : hungaryMeta;

  const hungarySpa = hungaryCandidates.filter((r) => r.type === "spa");
  const hungaryMicro = hungaryCandidates.filter((r) => r.type === "microregion");

  const candidatesBlock = [
    `Candidate region_ids (pick ONLY from these; do NOT invent IDs):`,
    ecoCandidates.length
      ? `GLOBAL_ECOREGIONS (priority):\n${buildCandidateLines(ecoCandidates)}`
      : `GLOBAL_ECOREGIONS (priority): (none provided)`,
    countryCandidates.length
      ? `GLOBAL_COUNTRIES (fallback):\n${buildCandidateLines(countryCandidates)}`
      : `GLOBAL_COUNTRIES (fallback): (none provided)`,
    hungarySpa.length
      ? `HUNGARY_NATURA_SPA (HU map helper only, preferred):\n${buildCandidateLines(hungarySpa)}`
      : `HUNGARY_NATURA_SPA (HU map helper only, preferred): (none provided)`,
    hungaryMicro.length
      ? `HUNGARY_MICROREGIONS (HU coverage fallback):\n${buildCandidateLines(hungaryMicro)}`
      : `HUNGARY_MICROREGIONS (HU coverage fallback): (none provided)`,
  ].join("\n\n");

  const basePrompt = `
  Infer a region-based species distribution map (selection-only).

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
        "note": "required: 1-2 short sentences explaining the choice (HU focus if relevant)",
        "region_ids": ["eco_123", "country_hu"]
      }
    ]
  }

  Selection rules:
  - Prefer GLOBAL_ECOREGIONS when confident (more precise).
  - If unsure, use GLOBAL_COUNTRIES as a coarse fallback.
  - For Hungary detail, prefer HUNGARY_NATURA_SPA; use HUNGARY_MICROREGIONS only to fill gaps/ensure full HU coverage.
  - Do NOT output polygon coordinates.
  - Do NOT invent region_ids.

  Quality rules:
  - Always include at least 1 range entry.
  - If you cannot justify a status confidently, omit that status instead of guessing.
  - For every range entry you DO include, always provide a short, concrete note.
  - confidence is informational only (0..1).

  ${candidatesBlock}

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
      const selection = selectionPayloadSchemaV1.parse(extracted.payload) as SelectionPayloadV1;
      const allRegionIds = selection.ranges.flatMap((r) => r.region_ids);

      const geometryById: Record<string, unknown> = {};
      if (globalRepo && globalRepo.length) {
        globalRepo.forEach((r) => {
          geometryById[r.region_id] = r.geometry;
        });
      }
      if (hungaryRepo && hungaryRepo.length) {
        hungaryRepo.forEach((r) => {
          geometryById[r.region_id] = r.geometry;
        });
      }

      const missingFromRepo = allRegionIds.filter((id) => !geometryById[id]);
      if (allowSupabase && missingFromRepo.length) {
        const fromDb = await getDistributionRegionGeometriesById(missingFromRepo);
        Object.assign(geometryById, fromDb);
      }

      const missing = Array.from(
        new Set(allRegionIds.filter((id) => !geometryById[id]))
      ).slice(0, 24);
      if (missing.length) {
        repairHint = [
          "Your previous JSON referenced unknown region_ids.",
          "Fix it by removing/replacing ONLY those region_ids.",
          `Unknown region_ids: ${missing.join(", ")}`,
          "Do NOT output polygon coordinates. Output JSON only.",
        ].join("\n");
        continue;
      }

      const expandedRanges = selection.ranges.map((r) => {
        const geoms = r.region_ids.map((id) => geometrySchema.parse(geometryById[id]) as DistributionGeometry);
        const merged = mergeAsMultiPolygon(geoms);
        return {
          status: r.status as DistributionStatus,
          confidence: r.confidence,
          note: r.note ?? null,
          geometry: merged,
        };
      });

      const expandedPayload: BirdDistributionMapPayloadV1 = {
        species_common_name: selection.species_common_name,
        species_scientific_name: selection.species_scientific_name,
        summary: selection.summary,
        references: selection.references,
        ranges: expandedRanges,
      };

      const parsed = parseDistributionMapPayloadV1(expandedPayload);
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
