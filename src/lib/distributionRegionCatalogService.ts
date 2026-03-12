import { z } from "zod";
import { supabaseServerClient } from "@/lib/supabaseServerClient";
import { DISTRIBUTION_REGION_CATALOG_SOURCE } from "@/lib/config";
import { loadRegionCatalogFromRepo, type RegionCatalogItem } from "@/lib/distributionRegionCatalogFile";

export type DistributionRegionCatalogName =
  | "globalRegions"
  | "hungaryRegions"
  | "hungaryExtendedRegions";

export type DistributionRegionCatalogItemMeta = {
  region_id: string;
  name: string;
  scope: "global" | "hungary" | "hungary_extended";
  type: string;
  source: string;
  bbox: { south: number; west: number; north: number; east: number };
  country_code?: string | null;
  distance_to_hungary_km?: number | null;
  is_within_hungary?: boolean | null;
  is_within_hungary_buffer?: boolean | null;
  site_code?: string | null;
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
  const allowRepo = DISTRIBUTION_REGION_CATALOG_SOURCE !== "supabase";
  const allowSupabase = DISTRIBUTION_REGION_CATALOG_SOURCE !== "repo";

  if (allowRepo) {
    const repoItems = await loadRegionCatalogFromRepo(catalog);
    if (repoItems && repoItems.length > 0) {
      return repoItems.map(repoItemToMeta);
    }
  }

  if (!allowSupabase) {
    return [];
  }

  const { data, error } = await supabaseServerClient
    .from("distribution_region_catalog_items")
    .select(
      "region_id,name,scope,type,source,bbox,country_code,distance_to_hungary_km,is_within_hungary,is_within_hungary_buffer,site_code"
    )
    .eq("catalog", catalog);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    region_id: String(row.region_id ?? ""),
    name: String(row.name ?? ""),
    scope:
      row.scope === "hungary_extended"
        ? "hungary_extended"
        : row.scope === "hungary"
        ? "hungary"
        : "global",
    type: String(row.type ?? ""),
    source: String(row.source ?? ""),
    bbox: parseBbox(row.bbox),
    country_code: String(row.country_code ?? "").trim() || null,
    distance_to_hungary_km:
      typeof row.distance_to_hungary_km === "number"
        ? row.distance_to_hungary_km
        : typeof row.distance_to_hungary_km === "string" &&
          row.distance_to_hungary_km.trim()
        ? Number(row.distance_to_hungary_km)
        : null,
    is_within_hungary:
      typeof row.is_within_hungary === "boolean" ? row.is_within_hungary : null,
    is_within_hungary_buffer:
      typeof row.is_within_hungary_buffer === "boolean" ? row.is_within_hungary_buffer : null,
    site_code: String(row.site_code ?? "").trim() || null,
  }));
}

function repoItemToMeta(item: RegionCatalogItem): DistributionRegionCatalogItemMeta {
  return {
    region_id: item.region_id,
    name: item.name,
    scope: item.scope,
    type: item.type,
    source: item.source,
    bbox: item.bbox,
    country_code: null,
    distance_to_hungary_km: null,
    is_within_hungary: null,
    is_within_hungary_buffer: null,
    site_code: null,
  };
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
