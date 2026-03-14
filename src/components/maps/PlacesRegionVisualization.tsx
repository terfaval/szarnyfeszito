"use client";

import type { Feature, FeatureCollection } from "geojson";
import type { PathOptions } from "leaflet";
import { GeoJSON } from "react-leaflet";

import type { PlaceMarker } from "@/types/place";
import type { PlacesMapLayersV1 } from "@/types/placesMap";
import {
  getHabitatCategoryForPlaceType,
  HABITAT_CATEGORY_STYLE,
  HABITAT_CATEGORY_ORDER,
} from "@/lib/placeHabitatCategory";

export type PlacesRegionVisualizationVariant =
  | "none"
  | "places_regions_v1"
  | "places_regions_v1_countries_filled";

export type PlacesRegionFillMode = "uniform_v1" | "place_type_category_v1";

const UNIFORM_STYLE: PathOptions = {
  color: "rgba(var(--brand-ink-rgb), 0.22)",
  weight: 1,
  fillColor: "rgba(var(--brand-ink-rgb), 0.06)",
  fillOpacity: 1,
};

const buildRegionCategoryMap = (
  markers: PlaceMarker[],
  fillMode: PlacesRegionFillMode
): Map<string, (typeof HABITAT_CATEGORY_ORDER)[number]> => {
  if (fillMode !== "place_type_category_v1") return new Map();

  const byRegion = new Map<string, Map<(typeof HABITAT_CATEGORY_ORDER)[number], number>>();
  markers.forEach((marker) => {
    const regionId = (marker.leaflet_region_id ?? "").trim();
    if (!regionId) return;
    const category = getHabitatCategoryForPlaceType(marker.place_type);
    const bucket = byRegion.get(regionId) ?? new Map();
    bucket.set(category, (bucket.get(category) ?? 0) + 1);
    byRegion.set(regionId, bucket);
  });

  const out = new Map<string, (typeof HABITAT_CATEGORY_ORDER)[number]>();
  byRegion.forEach((counts, regionId) => {
    let bestCategory: (typeof HABITAT_CATEGORY_ORDER)[number] | null = null;
    let bestCount = 0;
    for (const candidate of HABITAT_CATEGORY_ORDER) {
      const count = counts.get(candidate) ?? 0;
      if (count <= 0) continue;
      if (bestCategory === null || count > bestCount) {
        bestCategory = candidate;
        bestCount = count;
      }
    }
    if (bestCategory) {
      out.set(regionId, bestCategory);
    }
  });
  return out;
};

export default function PlacesRegionVisualization({
  variant,
  layers,
  selectedRegionId,
  fillMode = "uniform_v1",
  markers = [],
}: {
  variant: PlacesRegionVisualizationVariant;
  layers: PlacesMapLayersV1 | null;
  selectedRegionId: string | null;
  fillMode?: PlacesRegionFillMode;
  markers?: PlaceMarker[];
}) {
  if (variant === "none") return null;
  if (!layers) return null;

  const countryStyle: PathOptions =
    variant === "places_regions_v1_countries_filled"
      ? {
          color: "rgba(var(--brand-ink-rgb), 0.32)",
          weight: 1,
          fillColor: "rgba(var(--brand-ink-rgb), 0.06)",
          fillOpacity: 1,
        }
      : {
          color: "rgba(var(--brand-ink-rgb), 0.35)",
          weight: 1,
          fillOpacity: 0,
        };

  const categoryByRegionId = buildRegionCategoryMap(markers ?? [], fillMode);

  const regionStyle = (feature?: Feature): PathOptions => {
    const props = (feature?.properties ?? {}) as Record<string, unknown>;
    const id = typeof props.region_id === "string" ? props.region_id : "";
    const isSelected = Boolean(selectedRegionId) && id === selectedRegionId;
    if (isSelected) {
      return {
        color: "rgba(var(--brand-accent-rgb), 0.95)",
        weight: 2,
        fillColor: "rgba(var(--brand-accent-rgb), 0.25)",
        fillOpacity: 1,
      };
    }
    const category = categoryByRegionId.get(id);
    if (category) {
      const scheme = HABITAT_CATEGORY_STYLE[category];
      return {
        color: scheme.color,
        weight: 1,
        fillColor: scheme.fill,
        fillOpacity: 1,
      };
    }
    return UNIFORM_STYLE;
  };

  const hasCountries = (layers.country_borders?.features?.length ?? 0) > 0;
  const hasRegions = (layers.regions?.features?.length ?? 0) > 0;

  return (
    <>
      {hasCountries ? <GeoJSON data={layers.country_borders as FeatureCollection} style={countryStyle} /> : null}
      {hasRegions ? <GeoJSON data={layers.regions as FeatureCollection} style={regionStyle} /> : null}
    </>
  );
}
