"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CircleMarker, GeoJSON, useMap } from "react-leaflet";
import type { FitBoundsOptions, LatLngBoundsExpression, LeafletEventHandlerFnMap, Map as LeafletMap } from "leaflet";
import styles from "./PlacesMap.module.css";
import { DEFAULT_BASEMAP } from "./basemaps";
import type { BasemapId, BasemapPresetKey } from "./basemaps";
import { DEFAULT_BASEMAP_PRESET } from "./basemaps";
import { Icon } from "@/ui/icons/Icon";
import type { PlaceMarker } from "@/types/place";
import { HUNGARY_BORDER_110M, HUNGARY_WATER_MASK_110M } from "./hungaryBorder110m";
import PlacesRegionVisualization, { type PlacesRegionVisualizationVariant } from "./PlacesRegionVisualization";
import type { PlacesMapLayersV1 } from "@/types/placesMap";
import ThemedMapContainer from "./ThemedMapContainer";
import BasemapLayer from "./BasemapLayer";
import { useTimeThemeMode } from "./useTimeThemeMode";
import {
  getHabitatCategoryForPlaceType,
  HABITAT_CATEGORY_STYLE,
  HABITAT_CATEGORY_WATER,
} from "@/lib/placeHabitatCategory";

export type PlacesMapMarkerColorMode = "uniform_v1" | "water_highlight_v1" | "place_type_category_v1";
export type PlacesMapInteractionMode = "static" | "bounded_hu_v1";
export type PlacesMapToolBarVariant = "none" | "bottom_right_v1";

export type RegionSlugMap = Map<string, string>;

const PLACES_DEFAULT_CENTER_V1: [number, number] = [47.16, 19.5];
const PLACES_DEFAULT_ZOOM_V1 = 6;
const PLACES_DASHBOARD_MIN_ZOOM_V1 = 6;
const PLACES_DASHBOARD_MAX_ZOOM_V1 = 10;

const HUNGARY_MAX_BOUNDS_V1: LatLngBoundsExpression = [
  [45.3, 15.7],
  [48.7, 23.2],
];

function buildMarkerPathOptions(args: {
  marker: PlaceMarker;
  isSelected: boolean;
  isDimmed: boolean;
  isDark: boolean;
  markerColorMode: PlacesMapMarkerColorMode;
}) {
  const { marker, isSelected, isDimmed, isDark, markerColorMode } = args;

  const uniform = {
    color: isSelected
      ? "rgba(var(--brand-warm-rgb), 0.95)"
      : isDark
      ? "rgba(var(--brand-ink-rgb), 0.9)"
      : "rgba(var(--brand-ink-rgb), 0.92)",
    weight: isSelected ? 2 : 1,
    fillColor: isSelected
      ? "rgba(var(--brand-accent-rgb), 0.75)"
      : isDark
      ? "rgba(var(--brand-ink-rgb), 0.45)"
      : "rgba(var(--brand-ink-rgb), 0.35)",
    fillOpacity: isDimmed ? 0.55 : 0.9,
    opacity: isDimmed ? 0.55 : 1,
  };
  if (markerColorMode === "uniform_v1") return uniform;

  const category = getHabitatCategoryForPlaceType(marker.place_type);
  if (markerColorMode === "water_highlight_v1" && !HABITAT_CATEGORY_WATER.has(category)) {
    return uniform;
  }
  const scheme = HABITAT_CATEGORY_STYLE[category];

  return {
    color: isSelected ? "rgba(var(--brand-warm-rgb), 0.95)" : scheme.color,
    weight: isSelected ? 2 : 1,
    fillColor: isSelected ? scheme.fillSelected : scheme.fill,
    fillOpacity: isDimmed ? 0.55 : 0.9,
    opacity: isDimmed ? 0.55 : 1,
  };
}

export type PlacesMapProps = {
  markers: PlaceMarker[];
  selectedSlug: string | null;
  selectedRegionId?: string | null;
  onSelect?: (slug: string) => void;
  onRegionHover?: (slug: string | null) => void;
  regionSlugById?: RegionSlugMap;
  layoutVariant?: "responsive_v1" | "fill_parent_v1";
  basemap?: BasemapId;
  basemapPreset?: BasemapPresetKey;
  regionVisualization?: PlacesRegionVisualizationVariant;
  layers?: PlacesMapLayersV1 | null;
  markerColorMode?: PlacesMapMarkerColorMode;
  interactionMode?: PlacesMapInteractionMode;
  defaultCenter?: [number, number];
  defaultZoom?: number;
  defaultBounds?: LatLngBoundsExpression;
  defaultBoundsOptions?: FitBoundsOptions;
  defaultPanBy?: [number, number]; // [x, y] pixels
  showResetViewButton?: boolean;
  toolBarVariant?: PlacesMapToolBarVariant;
  toolBarTopControls?: ReactNode;
  markerEventHandlers?: (marker: PlaceMarker) => LeafletEventHandlerFnMap | undefined;
  renderMarkerChildren?: (args: {
    marker: PlaceMarker;
    isSelected: boolean;
    isDimmed: boolean;
  }) => ReactNode;
};

function MapRefBinder({
  onMap,
  onZoom,
}: {
  onMap: (map: LeafletMap) => void;
  onZoom: (zoom: number) => void;
}) {
  const map = useMap();
  useEffect(() => {
    onMap(map);
    const handler = () => onZoom(map.getZoom());
    handler();
    map.on("zoomend", handler);
    return () => {
      map.off("zoomend", handler);
    };
  }, [map, onMap, onZoom]);
  return null;
}

export default function PlacesMap({
  markers,
  selectedSlug,
  selectedRegionId = null,
  onSelect,
  onRegionHover,
  regionSlugById,
  layoutVariant = "responsive_v1",
  basemap = DEFAULT_BASEMAP,
  basemapPreset = DEFAULT_BASEMAP_PRESET,
  regionVisualization = "places_regions_v1",
  layers = null,
  markerColorMode = "uniform_v1",
  interactionMode = "static",
  defaultCenter,
  defaultZoom,
  defaultBounds,
  defaultBoundsOptions,
  defaultPanBy,
  showResetViewButton = false,
  toolBarVariant = "none",
  toolBarTopControls,
  markerEventHandlers,
  renderMarkerChildren,
}: PlacesMapProps) {
  const { isNight } = useTimeThemeMode();
  const isDark = isNight;
  const mapRef = useRef<LeafletMap | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number | null>(null);
  const didApplyInitialPanRef = useRef(false);
  const onMap = useCallback((map: LeafletMap) => {
    mapRef.current = map;

    if (
      !defaultBounds &&
      !didApplyInitialPanRef.current &&
      defaultPanBy &&
      (defaultPanBy[0] !== 0 || defaultPanBy[1] !== 0)
    ) {
      didApplyInitialPanRef.current = true;
      map.panBy(defaultPanBy, { animate: false });
    }
  }, [defaultBounds, defaultPanBy]);

  const onZoom = useCallback((zoom: number) => {
    setCurrentZoom(zoom);
  }, []);

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
        minZoom: PLACES_DASHBOARD_MIN_ZOOM_V1,
        maxZoom: PLACES_DASHBOARD_MAX_ZOOM_V1,
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
      minZoom: PLACES_DEFAULT_ZOOM_V1,
      maxZoom: PLACES_DEFAULT_ZOOM_V1,
      maxBounds: undefined,
      maxBoundsViscosity: undefined,
    } as const;
  }, [interactionMode]);

  const mapDefaultCenter = defaultCenter ?? PLACES_DEFAULT_CENTER_V1;
  const mapDefaultZoom = defaultZoom ?? PLACES_DEFAULT_ZOOM_V1;
  const mapDefaultBounds = defaultBounds ?? null;
  const mapDefaultBoundsOptions = defaultBoundsOptions ?? null;
  const minZoom = typeof interactions.minZoom === "number" ? interactions.minZoom : mapDefaultZoom;
  const maxZoom = typeof interactions.maxZoom === "number" ? interactions.maxZoom : mapDefaultZoom;
  const canZoomIn = currentZoom === null ? true : currentZoom < maxZoom;
  const canZoomOut = currentZoom === null ? true : currentZoom > minZoom;

  const resolveSlugForRegion = useCallback(
    (regionId: string | null) => {
      if (!regionId) return null;
      const slug = regionSlugById?.get(regionId);
      return slug ?? null;
    },
    [regionSlugById]
  );

  const handleRegionClick = useCallback(
    (regionId: string) => {
      const slug = resolveSlugForRegion(regionId);
      if (!slug) return;
      onSelect?.(slug);
    },
    [onSelect, resolveSlugForRegion]
  );

  const handleRegionMouseOver = useCallback(
    (regionId: string) => {
      const slug = resolveSlugForRegion(regionId);
      if (!slug) return;
      onRegionHover?.(slug);
    },
    [onRegionHover, resolveSlugForRegion]
  );

  const handleRegionMouseOut = useCallback(() => {
    onRegionHover?.(null);
  }, [onRegionHover]);

  const applyDefaultView = useCallback(
    (map: LeafletMap, opts: { animate: boolean }) => {
      if (mapDefaultBounds) {
        map.fitBounds(mapDefaultBounds, {
          ...(mapDefaultBoundsOptions ?? {}),
          animate: opts.animate,
        });
        return;
      }
      if (defaultPanBy && (defaultPanBy[0] !== 0 || defaultPanBy[1] !== 0)) {
        map.once("moveend", () => {
          map.panBy(defaultPanBy, { animate: false });
        });
      }
      map.setView(mapDefaultCenter, mapDefaultZoom, { animate: opts.animate });
    },
    [defaultPanBy, mapDefaultBounds, mapDefaultBoundsOptions, mapDefaultCenter, mapDefaultZoom]
  );

  const onResetView = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    applyDefaultView(map, { animate: true });
  }, [applyDefaultView]);

  const onZoomIn = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    map.zoomIn();
  }, []);

  const onZoomOut = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    map.zoomOut();
  }, []);

  return (
    <div
      className={[
        "places-map",
        layoutVariant === "fill_parent_v1" ? styles.layoutFill : styles.layout,
      ].join(" ")}
    >
      {toolBarTopControls ? (
        <div className={styles.toolBarTop} aria-label="Map filters">
          {toolBarTopControls}
        </div>
      ) : null}

      {toolBarVariant === "bottom_right_v1" ? (
        <div className={styles.toolBar} aria-label="Map tools">
          <div className={styles.toolGroup} role="group" aria-label="Zoom">
            <button
              type="button"
              className={styles.toolButton}
              onClick={onZoomIn}
              disabled={!canZoomIn}
              aria-label="Nagyítás"
              title="Nagyítás"
            >
              +
            </button>
            <button
              type="button"
              className={styles.toolButton}
              onClick={onZoomOut}
              disabled={!canZoomOut}
              aria-label="Kicsinyítés"
              title="Kicsinyítés"
            >
              −
            </button>
          </div>
          <div className={styles.toolGroup} role="group" aria-label="View">
            <button
              type="button"
              className={`${styles.toolButton} ${styles.toolButtonWide}`}
              onClick={onResetView}
              aria-label="Alap nézet"
              title="Alap nézet"
            >
              <Icon name="undo" size={18} title="Alap nézet" />
            </button>
          </div>
        </div>
      ) : showResetViewButton ? (
        <div className={styles.resetView}>
          <button type="button" className={`btn btn--secondary ${styles.resetViewButton}`} onClick={onResetView}>
            <Icon name="undo" size={18} title="Alap nézet" />
          </button>
        </div>
      ) : null}
      <ThemedMapContainer
        className={styles.map}
        basemapPreset={basemapPreset}
        {...(mapDefaultBounds
          ? {
              bounds: mapDefaultBounds,
              boundsOptions: mapDefaultBoundsOptions ?? undefined,
            }
          : {
              center: mapDefaultCenter,
              zoom: mapDefaultZoom,
            })}
        zoomControl={false}
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
        <MapRefBinder onMap={onMap} onZoom={onZoom} />
        <BasemapLayer basemap={basemap} basemapPreset={basemapPreset} />
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

        <PlacesRegionVisualization
          variant={regionVisualization}
          layers={layers}
          selectedRegionId={selectedRegionId}
          fillMode={markerColorMode === "place_type_category_v1" ? "place_type_category_v1" : "uniform_v1"}
          markers={markers}
          regionEventHandlers={{
            onClick: handleRegionClick,
            onMouseOver: handleRegionMouseOver,
            onMouseOut: handleRegionMouseOut,
          }}
        />

        {markers.map((marker) => {
          if (marker.lat === null || marker.lng === null) return null;
          const isSelected = selectedSlug === marker.slug;
          const isDimmed = !!selectedSlug && !isSelected;
          const handlers = markerEventHandlers?.(marker) ?? undefined;
          const mergedHandlers: LeafletEventHandlerFnMap = {
            ...(handlers ?? {}),
            click: (event) => {
              handlers?.click?.(event);
              onSelect?.(marker.slug);
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
      </ThemedMapContainer>
    </div>
  );
}
