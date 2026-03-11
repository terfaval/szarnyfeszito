"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { CircleMarker, GeoJSON, MapContainer, TileLayer } from "react-leaflet";
import type { LatLngBoundsExpression, LeafletEventHandlerFnMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import styles from "./PlacesMap.module.css";
import { DEFAULT_BASEMAP, getBasemapTileLayerArgs } from "./basemaps";
import type { BasemapId } from "./basemaps";
import type { PlaceMarker, PlaceType } from "@/types/place";
import { HUNGARY_BORDER_110M, HUNGARY_WATER_MASK_110M } from "./hungaryBorder110m";
import PlacesRegionVisualization, { type PlacesRegionVisualizationVariant } from "./PlacesRegionVisualization";
import type { PlacesMapLayersV1 } from "@/types/placesMap";

export type PlacesMapMarkerColorMode = "uniform_v1" | "water_highlight_v1" | "place_type_category_v1";
export type PlacesMapInteractionMode = "static" | "bounded_hu_v1";

const HUNGARY_MAX_BOUNDS_V1: LatLngBoundsExpression = [
  [45.3, 15.7],
  [48.7, 23.2],
];

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

function buildMarkerPathOptions(args: {
  marker: PlaceMarker;
  isSelected: boolean;
  isDimmed: boolean;
  isDark: boolean;
  markerColorMode: PlacesMapMarkerColorMode;
}) {
  const { marker, isSelected, isDimmed, isDark, markerColorMode } = args;

  const uniform = {
    color: isSelected ? "#0f172a" : "#0b3b8c",
    weight: isSelected ? 2 : 1,
    fillColor: isSelected ? "#2563eb" : "#60a5fa",
    fillOpacity: isDimmed ? 0.55 : 0.9,
    opacity: isDimmed ? 0.55 : 1,
  };
  if (markerColorMode === "uniform_v1") return uniform;

  const category = getPlaceTypeCategoryV1(marker.place_type);
  if (markerColorMode === "water_highlight_v1" && category !== "waterfront") {
    return uniform;
  }
  const palette = {
    waterfront: { fill: "#38bdf8", fillSelected: "#0284c7" },
    forest: { fill: "#4ade80", fillSelected: "#16a34a" },
    mountains: { fill: "#fb923c", fillSelected: "#ea580c" },
    other: { fill: "#a78bfa", fillSelected: "#7c3aed" },
  } satisfies Record<PlaceTypeCategoryV1, { fill: string; fillSelected: string }>;

  return {
    color: isSelected ? (isDark ? "#e5e7eb" : "#0f172a") : isDark ? "#0f172a" : "#0b1220",
    weight: isSelected ? 2 : 1,
    fillColor: isSelected ? palette[category].fillSelected : palette[category].fill,
    fillOpacity: isDimmed ? 0.55 : 0.9,
    opacity: isDimmed ? 0.55 : 1,
  };
}

export type PlacesMapProps = {
  markers: PlaceMarker[];
  selectedSlug: string | null;
  selectedRegionId?: string | null;
  onSelect: (slug: string) => void;
  basemap?: BasemapId;
  regionVisualization?: PlacesRegionVisualizationVariant;
  layers?: PlacesMapLayersV1 | null;
  markerColorMode?: PlacesMapMarkerColorMode;
  interactionMode?: PlacesMapInteractionMode;
  markerEventHandlers?: (marker: PlaceMarker) => LeafletEventHandlerFnMap | undefined;
  renderMarkerChildren?: (args: {
    marker: PlaceMarker;
    isSelected: boolean;
    isDimmed: boolean;
  }) => ReactNode;
};

export default function PlacesMap({
  markers,
  selectedSlug,
  selectedRegionId = null,
  onSelect,
  basemap = DEFAULT_BASEMAP,
  regionVisualization = "places_regions_v1",
  layers = null,
  markerColorMode = "uniform_v1",
  interactionMode = "static",
  markerEventHandlers,
  renderMarkerChildren,
}: PlacesMapProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setIsDark(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const center = useMemo<[number, number]>(() => [47.16, 19.5], []);
  const tileLayerArgs = useMemo(() => {
    if (basemap === "brand") return null;
    return getBasemapTileLayerArgs({ basemap, isDark });
  }, [basemap, isDark]);

  const interactions = useMemo(() => {
    if (interactionMode === "bounded_hu_v1") {
      return {
        zoomControl: true,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        dragging: true,
        keyboard: false,
        boxZoom: false,
        touchZoom: true,
        minZoom: 1.2,
        maxZoom: 10,
        maxBounds: HUNGARY_MAX_BOUNDS_V1,
        maxBoundsViscosity: 1.0,
      } as const;
    }

    return {
      zoomControl: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      dragging: false,
      keyboard: false,
      boxZoom: false,
      touchZoom: false,
      minZoom: undefined,
      maxZoom: undefined,
      maxBounds: undefined,
      maxBoundsViscosity: undefined,
    } as const;
  }, [interactionMode]);

  return (
    <div className={`places-map ${styles.layout}`}>
      <MapContainer
        className={styles.map}
        center={center}
        zoom={1.2}
        zoomControl={interactions.zoomControl}
        scrollWheelZoom={interactions.scrollWheelZoom}
        doubleClickZoom={interactions.doubleClickZoom}
        dragging={interactions.dragging}
        keyboard={interactions.keyboard}
        boxZoom={interactions.boxZoom}
        touchZoom={interactions.touchZoom}
        minZoom={interactions.minZoom}
        maxZoom={interactions.maxZoom}
        maxBounds={interactions.maxBounds}
        maxBoundsViscosity={interactions.maxBoundsViscosity}
        attributionControl={false}
      >
        {tileLayerArgs ? (
          <TileLayer url={tileLayerArgs.url} attribution={tileLayerArgs.attribution} />
        ) : null}
        {basemap === "brand" ? (
          <>
            <GeoJSON
              data={HUNGARY_WATER_MASK_110M}
              style={{
                fillColor: "var(--sf-map-water)",
                fillOpacity: 1,
                stroke: false,
              }}
            />
            <GeoJSON
              data={HUNGARY_BORDER_110M}
              style={{
                color: "var(--brand-ink)",
                weight: 2,
                fillOpacity: 0,
              }}
            />
          </>
        ) : null}

        <PlacesRegionVisualization variant={regionVisualization} layers={layers} selectedRegionId={selectedRegionId} />

        {markers.map((marker) => {
          if (marker.lat === null || marker.lng === null) return null;
          const isSelected = selectedSlug === marker.slug;
          const isDimmed = !!selectedSlug && !isSelected;
          const handlers = markerEventHandlers?.(marker) ?? undefined;
          const mergedHandlers: LeafletEventHandlerFnMap = {
            ...(handlers ?? {}),
            click: (event) => {
              handlers?.click?.(event);
              onSelect(marker.slug);
            },
          };
          return (
            <CircleMarker
              key={marker.id}
              center={[marker.lat, marker.lng]}
              radius={isSelected ? 7 : 5}
              pathOptions={buildMarkerPathOptions({ marker, isSelected, isDimmed, isDark, markerColorMode })}
              eventHandlers={mergedHandlers}
            >
              {renderMarkerChildren ? renderMarkerChildren({ marker, isSelected, isDimmed }) : null}
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
