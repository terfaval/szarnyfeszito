import { z } from "zod";
import { supabaseServerClient } from "@/lib/supabaseServerClient";

export type DistributionRegionCatalogName = "globalRegions" | "hungaryRegions";

export type DistributionRegionCatalogItemMeta = {
  region_id: string;
  name: string;
  scope: "global" | "hungary";
  type: string;
  source: string;
  bbox: { south: number; west: number; north: number; east: number };
};

const bboxSchema = z
  .object({
    south: z.number(),
    west: z.number(),
    north: z.number(),
    east: z.number(),
  })
  .strict();

function parseBbox(raw: unknown) {
  return bboxSchema.parse(raw) as DistributionRegionCatalogItemMeta["bbox"];
}

export async function listDistributionRegionCatalogMeta(
  catalog: DistributionRegionCatalogName
): Promise<DistributionRegionCatalogItemMeta[]> {
  const { data, error } = await supabaseServerClient
    .from("distribution_region_catalog_items")
    .select("region_id,name,scope,type,source,bbox")
    .eq("catalog", catalog);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    region_id: String(row.region_id ?? ""),
    name: String(row.name ?? ""),
    scope: (row.scope as "global" | "hungary") ?? "global",
    type: String(row.type ?? ""),
    source: String(row.source ?? ""),
    bbox: parseBbox(row.bbox),
  }));
}

export async function getDistributionRegionCatalogMetaById(
  regionId: string
): Promise<DistributionRegionCatalogItemMeta | null> {
  const id = regionId.trim();
  if (!id) return null;

  const { data, error } = await supabaseServerClient
    .from("distribution_region_catalog_items")
    .select("region_id,name,scope,type,source,bbox")
    .eq("region_id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) return null;

  const row = data as Record<string, unknown>;
  const scopeRaw = String(row.scope ?? "");
  const scope: "global" | "hungary" = scopeRaw === "hungary" ? "hungary" : "global";

  return {
    region_id: String(row.region_id ?? ""),
    name: String(row.name ?? ""),
    scope,
    type: String(row.type ?? ""),
    source: String(row.source ?? ""),
    bbox: parseBbox(row.bbox),
  };
}

export async function getDistributionRegionGeometriesById(regionIds: string[]): Promise<
  Record<string, unknown>
> {
  const unique = Array.from(new Set(regionIds.map((id) => id.trim()).filter(Boolean)));
  if (unique.length === 0) return {};

  const { data, error } = await supabaseServerClient
    .from("distribution_region_catalog_items")
    .select("region_id,geometry")
    .in("region_id", unique);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const out: Record<string, unknown> = {};
  rows.forEach((row) => {
    const id = String(row.region_id ?? "");
    if (!id) return;
    out[id] = row.geometry;
  });
  return out;
}

export async function getDistributionRegionBboxesById(regionIds: string[]): Promise<
  Record<string, DistributionRegionCatalogItemMeta["bbox"]>
> {
  const unique = Array.from(new Set(regionIds.map((id) => id.trim()).filter(Boolean)));
  if (unique.length === 0) return {};

  const { data, error } = await supabaseServerClient
    .from("distribution_region_catalog_items")
    .select("region_id,bbox")
    .in("region_id", unique);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const out: Record<string, DistributionRegionCatalogItemMeta["bbox"]> = {};
  rows.forEach((row) => {
    const id = String(row.region_id ?? "");
    if (!id) return;
    out[id] = parseBbox(row.bbox);
  });
  return out;
}
