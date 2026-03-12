import type { Feature, FeatureCollection, GeoJsonProperties } from "geojson";

import { DISTRIBUTION_REGION_CATALOG_SOURCE } from "@/lib/config";
import { supabaseServerClient } from "@/lib/supabaseServerClient";
import {
  getDistributionRegionGeometriesById,
  type DistributionRegionCatalogItemMeta,
} from "@/lib/distributionRegionCatalogService";
import { loadRegionCatalogFromRepo } from "@/lib/distributionRegionCatalogFile";
import type { PlacesMapLayersV1 } from "@/types/placesMap";

type Bounds = { south: number; west: number; north: number; east: number };

const HUNGARY_VIEWPORT_BBOX: Bounds = {
  south: 45.3,
  west: 15.7,
  north: 48.7,
  east: 23.2,
};

function bboxIntersects(a: Bounds, b: Bounds) {
  return a.west <= b.east && a.east >= b.west && a.south <= b.north && a.north >= b.south;
}

function toFeature(region: {
  region_id: string;
  name?: string | null;
  type?: string | null;
  geometry: unknown;
}): Feature {
  const props: GeoJsonProperties = {
    region_id: region.region_id,
    name: region.name ?? null,
    type: region.type ?? null,
  };

  return {
    type: "Feature",
    properties: props,
    geometry: region.geometry as unknown as Feature["geometry"],
  };
}

function toCollection(features: Feature[]): FeatureCollection {
  return { type: "FeatureCollection", features };
}

function parseBounds(raw: unknown): Bounds | null {
  const value = raw as Partial<Record<keyof Bounds, unknown>>;
  const south = typeof value?.south === "number" ? value.south : null;
  const west = typeof value?.west === "number" ? value.west : null;
  const north = typeof value?.north === "number" ? value.north : null;
  const east = typeof value?.east === "number" ? value.east : null;
  if (south === null || west === null || north === null || east === null) return null;
  return { south, west, north, east };
}

async function loadGeometriesById(regionIds: string[]) {
  const unique = Array.from(new Set(regionIds.map((id) => id.trim()).filter(Boolean)));
  if (unique.length === 0) return {};
  return getDistributionRegionGeometriesById(unique);
}

const cache = new Map<string, PlacesMapLayersV1>();

export async function buildPlacesMapLayersV1(args: {
  placeRegionIds: string[];
  includeCountries?: boolean;
}): Promise<PlacesMapLayersV1> {
  const allowRepo = DISTRIBUTION_REGION_CATALOG_SOURCE !== "supabase";
  const allowSupabase = DISTRIBUTION_REGION_CATALOG_SOURCE !== "repo";
  const placeRegionIds = Array.from(new Set(args.placeRegionIds.map((id) => id.trim()).filter(Boolean))).sort();
  const includeCountries = args.includeCountries ?? true;
  const cacheKey = `v1:${includeCountries ? "countries" : "no_countries"}:${placeRegionIds.join("|")}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  // 1) Country borders (globalRegions -> countries intersecting HU viewport).
  let countryFeatures: Feature[] = [];

  if (includeCountries) {
    const globalRepo = allowRepo ? await loadRegionCatalogFromRepo("globalRegions") : null;
    if (globalRepo && globalRepo.length) {
      const globalCountries = globalRepo.filter(
        (r) => r.type === "country" && bboxIntersects(r.bbox, HUNGARY_VIEWPORT_BBOX)
      );
      countryFeatures = globalCountries.map((r) =>
        toFeature({ region_id: r.region_id, name: r.name, type: r.type, geometry: r.geometry })
      );
    } else if (allowSupabase) {
      const { data, error } = await supabaseServerClient
        .from("distribution_region_catalog_items")
        .select("region_id,name,type,bbox")
        .eq("catalog", "globalRegions")
        .eq("type", "country");

      if (!error) {
        const rows = (data ?? []) as Array<Record<string, unknown>>;
        const meta = rows
          .map((row) => {
            const bbox = parseBounds(row.bbox);
            if (!bbox) return null;
            const region_id = String(row.region_id ?? "").trim();
            if (!region_id) return null;
            const name = typeof row.name === "string" ? row.name : "";
            const type = typeof row.type === "string" ? row.type : "country";
            const item: DistributionRegionCatalogItemMeta = {
              region_id,
              name,
              scope: "global",
              type,
              source: "supabase",
              bbox,
            };
            return item;
          })
          .filter(Boolean) as DistributionRegionCatalogItemMeta[];

        const globalCountries = meta.filter((r) => bboxIntersects(r.bbox, HUNGARY_VIEWPORT_BBOX));
        const countryIds = globalCountries.map((r) => r.region_id);
        const geomById = await loadGeometriesById(countryIds);
        countryFeatures = globalCountries
          .map((r) => {
            const geom = geomById[r.region_id];
            if (!geom) return null;
            return toFeature({ region_id: r.region_id, name: r.name, type: r.type, geometry: geom });
          })
          .filter(Boolean) as Feature[];
      }
    }
  }

  // 2) HU regions (repo and/or Supabase, depending on DISTRIBUTION_REGION_CATALOG_SOURCE).
  let regionFeatures: Feature[] = [];
  if (placeRegionIds.length) {
    const byId = new Map<string, { region_id: string; name: string | null; type: string | null; geometry: unknown }>();

    const catalogNames = ["hungaryRegions", "hungaryExtendedRegions"] as const;
    for (const catalogName of catalogNames) {
      const repoCatalog = allowRepo ? await loadRegionCatalogFromRepo(catalogName) : null;
      if (!repoCatalog) continue;
      repoCatalog.forEach((r) => {
        if (!r.region_id || !r.geometry) return;
        byId.set(r.region_id, { region_id: r.region_id, name: r.name, type: r.type, geometry: r.geometry });
      });
    }

    const missing = allowSupabase ? placeRegionIds.filter((id) => !byId.has(id)) : [];
    if (missing.length) {
      const { data, error } = await supabaseServerClient
        .from("distribution_region_catalog_items")
        .select("region_id,name,type,geometry")
        .in("catalog", ["hungaryRegions", "hungaryExtendedRegions"])
        .in("region_id", missing);

      if (!error) {
        const rows = (data ?? []) as Array<Record<string, unknown>>;
        rows.forEach((row) => {
          const region_id = String(row.region_id ?? "").trim();
          if (!region_id) return;
          if (!row.geometry) return;
          byId.set(region_id, {
            region_id,
            name: typeof row.name === "string" ? row.name : null,
            type: typeof row.type === "string" ? row.type : null,
            geometry: row.geometry,
          });
        });
      }
    }

    regionFeatures = placeRegionIds
      .map((id) => byId.get(id) ?? null)
      .filter(Boolean)
      .map((r) => toFeature({ region_id: r!.region_id, name: r!.name, type: r!.type, geometry: r!.geometry }));
  }

  const out: PlacesMapLayersV1 = {
    schema_version: "places_map_layers_v1",
    country_borders: toCollection(countryFeatures),
    regions: toCollection(regionFeatures),
  };

  cache.set(cacheKey, out);
  return out;
}
