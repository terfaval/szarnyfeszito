import fs from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";
import { z } from "zod";

import type { DistributionGeometry } from "@/types/distributionMap";
import type { DistributionRegionCatalogName } from "@/lib/distributionRegionCatalogService";
import { DISTRIBUTION_REGION_CATALOG_REPO_DIR } from "@/lib/config";

export type RegionCatalogItem = {
  region_id: string;
  name: string;
  scope: "global" | "hungary" | "hungary_extended";
  type: string;
  source: string;
  bbox: { south: number; west: number; north: number; east: number };
  geometry: DistributionGeometry;
};

const bboxSchema = z
  .object({
    south: z.number(),
    west: z.number(),
    north: z.number(),
    east: z.number(),
  })
  .strict();

const geometrySchema = z.union([
  z.object({ type: z.literal("Polygon"), coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))) }).strict(),
  z
    .object({
      type: z.literal("MultiPolygon"),
      coordinates: z.array(z.array(z.array(z.tuple([z.number(), z.number()])))),
    })
    .strict(),
]);

const itemSchema = z
  .object({
    region_id: z.string().trim().min(1),
    name: z.string().trim().min(1),
  scope: z.enum(["global", "hungary", "hungary_extended"]),
    type: z.string().trim().min(1),
    source: z.string().trim().min(1),
    bbox: bboxSchema,
    geometry: geometrySchema,
  })
  .passthrough();

const catalogSchema = z
  .object({
    catalog: z.string().trim().min(1),
    schema_version: z.string().trim().min(1),
    regions: z.array(itemSchema),
  })
  .passthrough();

let cache: Partial<Record<DistributionRegionCatalogName, RegionCatalogItem[]>> = {};

function candidateCatalogDirs(): string[] {
  const builderOut = path.resolve(process.cwd(), "TICKETS/leaflet shapefile builder/out");
  const raw = [DISTRIBUTION_REGION_CATALOG_REPO_DIR, builderOut];
  return Array.from(new Set(raw.map((p) => path.resolve(p))));
}

async function readFileIfExists(filePath: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(filePath);
  } catch (err) {
    const anyErr = err as unknown as { code?: unknown };
    if (anyErr?.code === "ENOENT") return null;
    throw err;
  }
}

async function loadCatalogJsonString(catalog: DistributionRegionCatalogName): Promise<string | null> {
  for (const dir of candidateCatalogDirs()) {
    const jsonPath = path.join(dir, `${catalog}.json`);
    const jsonBuf = await readFileIfExists(jsonPath);
    if (jsonBuf) return jsonBuf.toString("utf-8");

    const gzPath = `${jsonPath}.gz`;
    const gzBuf = await readFileIfExists(gzPath);
    if (gzBuf) return zlib.gunzipSync(gzBuf).toString("utf-8");
  }

  return null;
}

export async function loadRegionCatalogFromRepo(
  catalog: DistributionRegionCatalogName
): Promise<RegionCatalogItem[] | null> {
  if (cache[catalog]) return cache[catalog] ?? null;

  try {
    const raw = await loadCatalogJsonString(catalog);
    if (!raw) return null;

    const parsed = catalogSchema.parse(JSON.parse(raw));
    const items = parsed.regions.map((r) => ({
      region_id: r.region_id,
      name: r.name,
      scope: r.scope,
      type: r.type,
      source: r.source,
      bbox: r.bbox,
      geometry: r.geometry as DistributionGeometry,
    }));
    cache[catalog] = items;
    return items;
  } catch {
    return null;
  }
}

export function clearRegionCatalogRepoCache() {
  cache = {};
}
