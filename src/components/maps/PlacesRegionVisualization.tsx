"use client";

import type { Feature, FeatureCollection } from "geojson";
import type { PathOptions } from "leaflet";
import { GeoJSON } from "react-leaflet";

import type { PlaceMarker, PlaceType } from "@/types/place";
import type { PlacesMapLayersV1 } from "@/types/placesMap";

export type PlacesRegionVisualizationVariant =
  | "none"
  | "places_regions_v1"
  | "places_regions_v1_countries_filled";

export type PlacesRegionFillMode = "uniform_v1" | "place_type_category_v1";

type PlaceTypeCategoryV1 = "waterfront" | "forest" | "mountains" | "other";

function getPlaceTypeCategoryV1(placeType: PlaceType): PlaceTypeCategoryV1 {
  if (
    placeType === "lake" ||
    placeType === "river" ||
    placeType === "fishpond" ||
    placeType === "reservoir" ||
    placeType === "marsh" ||
    placeType === "reedbed" ||
    placeType === "salt_lake" ||
    placeType === "urban_waterfront"
  ) {
    return "waterfront";
  }
  if (placeType === "forest_edge" || placeType === "urban_park" || placeType === "protected_area") {
    return "forest";
  }
  if (placeType === "mountain_area") return "mountains";
  return "other";
}

function categoryStyleV1(category: PlaceTypeCategoryV1): Pick<PathOptions, "color" | "fillColor"> {
  if (category === "forest") {
    return {
      color: "rgba(var(--brand-accent-rgb), 0.34)",
      fillColor: "rgba(var(--brand-accent-rgb), 0.10)",
    };
  }
  if (category === "mountains") {
    return {
      color: "rgba(var(--brand-warm-rgb), 0.34)",
      fillColor: "rgba(var(--brand-warm-rgb), 0.09)",
    };
  }
  if (category === "waterfront") {
    return {
      color: "rgba(var(--brand-ink-rgb), 0.30)",
      fillColor: "rgba(var(--brand-ink-rgb), 0.08)",
    };
  }
  return {
    color: "rgba(var(--brand-ink-rgb), 0.22)",
    fillColor: "rgba(var(--brand-ink-rgb), 0.06)",
  };
}

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

  const categoryByRegionId = (() => {
    if (fillMode !== "place_type_category_v1") return new Map<string, PlaceTypeCategoryV1>();
    const byRegion = new Map<string, Map<PlaceTypeCategoryV1, number>>();
    markers.forEach((marker) => {
      const regionId = (marker.leaflet_region_id ?? "").trim();
      if (!regionId) return;
      const category = getPlaceTypeCategoryV1(marker.place_type);
      const counts = byRegion.get(regionId) ?? new Map<PlaceTypeCategoryV1, number>();
      counts.set(category, (counts.get(category) ?? 0) + 1);
      byRegion.set(regionId, counts);
    });

    const order: PlaceTypeCategoryV1[] = ["waterfront", "forest", "mountains", "other"];
    const out = new Map<string, PlaceTypeCategoryV1>();
    byRegion.forEach((counts, regionId) => {
      let bestCategory: PlaceTypeCategoryV1 | null = null;
      let bestCount = 0;
      for (const category of order) {
        const count = counts.get(category) ?? 0;
        if (count <= 0) continue;
        if (bestCategory === null || count > bestCount) {
          bestCategory = category;
          bestCount = count;
        }
        // tie-breaker uses order (earlier wins) by not replacing
      }
      if (bestCategory) out.set(regionId, bestCategory);
    });
    return out;
  })();

  const regionStyle = (feature?: Feature): PathOptions => {
    const props = (feature?.properties ?? {}) as Record<string, unknown>;
    const id = typeof props.region_id === "string" ? props.region_id : "";
    const isSelected = Boolean(selectedRegionId) && id === selectedRegionId;
    if (isSelected) {
      return {
        color: "rgba(var(--brand-accent-rgb), 0.95)",
        weight: 2,
        fillColor: "rgba(var(--brand-accent-rgb), 0.22)",
        fillOpacity: 1,
      };
    }
    const category = categoryByRegionId.get(id) ?? null;
    if (category) {
      const palette = categoryStyleV1(category);
      return {
        color: palette.color,
        weight: 1,
        fillColor: palette.fillColor,
        fillOpacity: 1,
      };
    }
    return {
      color: "rgba(var(--brand-ink-rgb), 0.22)",
      weight: 1,
      fillColor: "rgba(var(--brand-ink-rgb), 0.06)",
      fillOpacity: 1,
    };
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
