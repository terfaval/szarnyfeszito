import { z } from "zod";
import { supabaseServerClient } from "@/lib/supabaseServerClient";
import { DISTRIBUTION_REGION_CATALOG_SOURCE } from "@/lib/config";
import { loadRegionCatalogFromRepo, type RegionCatalogItem } from "@/lib/distributionRegionCatalogFile";

export type DistributionRegionCatalogName =
  | "globalRegions"
  | "hungaryRegions"
  | "hungaryExtendedRegions";
 
export type DistributionRegionCatalogItemMeta = {
  catalog: DistributionRegionCatalogName;
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

const repoCatalogOrder: DistributionRegionCatalogName[] = [
  "hungaryExtendedRegions",
  "hungaryRegions",
  "globalRegions",
];

type RepoCatalogEntry = { catalog: DistributionRegionCatalogName; item: RegionCatalogItem };

const repoCatalogLoaders = new Map<DistributionRegionCatalogName, Promise<void>>();
const repoRegionIndex = new Map<string, RepoCatalogEntry>();

async function ensureRepoCatalogIndexed(catalog: DistributionRegionCatalogName) {
  const existing = repoCatalogLoaders.get(catalog);
  if (existing) {
    await existing;
    return;
  }

  const loader = (async () => {
    const items = await loadRegionCatalogFromRepo(catalog);
    if (items) {
      items.forEach((item) => {
        if (item.region_id) {
          repoRegionIndex.set(item.region_id, { catalog, item });
        }
      });
    }
  })();

  repoCatalogLoaders.set(catalog, loader);
  await loader;
}

async function findRegionCatalogEntryInRepo(regionId: string): Promise<RepoCatalogEntry | null> {
  const normalized = regionId.trim();
  if (!normalized) return null;

  const cached = repoRegionIndex.get(normalized);
  if (cached) return cached;

  for (const catalog of repoCatalogOrder) {
    await ensureRepoCatalogIndexed(catalog);
    const found = repoRegionIndex.get(normalized);
    if (found) return found;
  }

  return null;
}

function repoEntryToMeta(entry: RepoCatalogEntry): DistributionRegionCatalogItemMeta {
  return {
    catalog: entry.catalog,
    region_id: entry.item.region_id,
    name: entry.item.name,
    scope: entry.item.scope,
    type: entry.item.type,
    source: entry.item.source,
    bbox: entry.item.bbox,
    country_code: null,
    distance_to_hungary_km: null,
    is_within_hungary: null,
    is_within_hungary_buffer: null,
    site_code: null,
  };
}

function repoItemToMeta(item: RegionCatalogItem, catalog: DistributionRegionCatalogName) {
  return repoEntryToMeta({ catalog, item });
}

function parseCatalogName(raw: unknown): DistributionRegionCatalogName {
  const value = String(raw ?? "").trim();
  if (value === "hungaryExtendedRegions") return "hungaryExtendedRegions";
  if (value === "hungaryRegions") return "hungaryRegions";
  if (value === "globalRegions") return "globalRegions";
  return "globalRegions";
}

function supabaseRowToMeta(row: Record<string, unknown>): DistributionRegionCatalogItemMeta {
  const catalog = parseCatalogName(row.catalog);
  const scopeRaw = String(row.scope ?? "");
  const scope =
    scopeRaw === "hungary_extended"
      ? "hungary_extended"
      : scopeRaw === "hungary"
      ? "hungary"
      : "global";
  const countryCode = String(row.country_code ?? "").trim();
  const distanceValue = row.distance_to_hungary_km;

  return {
    catalog,
    region_id: String(row.region_id ?? ""),
    name: String(row.name ?? ""),
    scope,
    type: String(row.type ?? ""),
    source: String(row.source ?? ""),
    bbox: parseBbox(row.bbox),
    country_code: countryCode || null,
    distance_to_hungary_km:
      typeof distanceValue === "number"
        ? distanceValue
        : typeof distanceValue === "string" && distanceValue.trim()
        ? Number(distanceValue)
        : null,
    is_within_hungary:
      typeof row.is_within_hungary === "boolean" ? row.is_within_hungary : null,
    is_within_hungary_buffer:
      typeof row.is_within_hungary_buffer === "boolean" ? row.is_within_hungary_buffer : null,
    site_code: String(row.site_code ?? "").trim() || null,
  };
}

export async function listDistributionRegionCatalogMeta(
  catalog: DistributionRegionCatalogName
): Promise<DistributionRegionCatalogItemMeta[]> {
  const allowRepo = DISTRIBUTION_REGION_CATALOG_SOURCE !== "supabase";
  const allowSupabase = DISTRIBUTION_REGION_CATALOG_SOURCE !== "repo";

  const repoItems = allowRepo ? await loadRegionCatalogFromRepo(catalog) : null;
  if (repoItems && repoItems.length > 0) {
    return repoItems.map((item) => repoItemToMeta(item, catalog));
  }

  const repoMissing = allowRepo && repoItems === null;
  const shouldFallBackToSupabase = allowSupabase || repoMissing;
  if (!shouldFallBackToSupabase) {
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
  return rows.map((row) => supabaseRowToMeta(row));
}


export async function getDistributionRegionCatalogMetaById(
  regionId: string
): Promise<DistributionRegionCatalogItemMeta | null> {
  const id = regionId.trim();
  if (!id) return null;

  const allowRepo = DISTRIBUTION_REGION_CATALOG_SOURCE !== "supabase";
  const allowSupabase = DISTRIBUTION_REGION_CATALOG_SOURCE !== "repo";

  if (allowRepo) {
    const repoEntry = await findRegionCatalogEntryInRepo(id);
    if (repoEntry) {
      return repoEntryToMeta(repoEntry);
    }
  }

  if (!allowSupabase) {
    return null;
  }

  const { data, error } = await supabaseServerClient
    .from("distribution_region_catalog_items")
    .select("catalog,region_id,name,scope,type,source,bbox,country_code,distance_to_hungary_km,is_within_hungary,is_within_hungary_buffer,site_code")
    .eq("region_id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) return null;

  const row = data as Record<string, unknown>;
  return supabaseRowToMeta(row);
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
