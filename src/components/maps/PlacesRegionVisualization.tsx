"use client";

import type { Feature, FeatureCollection } from "geojson";
import type { PathOptions } from "leaflet";
import { GeoJSON } from "react-leaflet";

import type { PlacesMapLayersV1 } from "@/types/placesMap";

export type PlacesRegionVisualizationVariant = "none" | "places_regions_v1";

export default function PlacesRegionVisualization({
  variant,
  layers,
  selectedRegionId,
}: {
  variant: PlacesRegionVisualizationVariant;
  layers: PlacesMapLayersV1 | null;
  selectedRegionId: string | null;
}) {
  if (variant === "none") return null;
  if (!layers) return null;

  const countryStyle: PathOptions = {
    color: "rgba(var(--brand-ink-rgb), 0.35)",
    weight: 1,
    fillOpacity: 0,
  };

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
