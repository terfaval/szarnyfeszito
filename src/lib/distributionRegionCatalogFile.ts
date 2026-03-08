import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

import type { DistributionGeometry } from "@/types/distributionMap";
import type { DistributionRegionCatalogName } from "@/lib/distributionRegionCatalogService";

export type RegionCatalogItem = {
  region_id: string;
  name: string;
  scope: "global" | "hungary";
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
    scope: z.enum(["global", "hungary"]),
    type: z.string().trim().min(1),
    source: z.string().trim().min(1),
    bbox: bboxSchema,
    geometry: geometrySchema,
  })
  .strict();

const catalogSchema = z
  .object({
    catalog: z.string().trim().min(1),
    schema_version: z.string().trim().min(1),
    regions: z.array(itemSchema),
  })
  .strict();

let cache: Partial<Record<DistributionRegionCatalogName, RegionCatalogItem[]>> = {};

function catalogPath(catalog: DistributionRegionCatalogName) {
  return path.join(process.cwd(), "data", "distribution-region-catalog", "v1", `${catalog}.json`);
}

export async function loadRegionCatalogFromRepo(
  catalog: DistributionRegionCatalogName
): Promise<RegionCatalogItem[] | null> {
  if (cache[catalog]) return cache[catalog] ?? null;

  const filePath = catalogPath(catalog);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
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

