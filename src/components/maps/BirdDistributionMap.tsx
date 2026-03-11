"use client";

import { useEffect, useMemo, useState } from "react";
import type { Feature, FeatureCollection } from "geojson";
import type { DistributionRange, DistributionStatus } from "@/types/distributionMap";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import type { LatLngBoundsExpression, PathOptions } from "leaflet";
import "leaflet/dist/leaflet.css";
import styles from "./BirdDistributionMap.module.css";
import { getBasemapTileLayerArgs } from "./basemaps";
import { HUNGARY_FULL_BOUNDS_V1, WORLD_FULL_BOUNDS_V1 } from "./viewPresets";

const STATUS_COLORS: Record<DistributionStatus, string> = {
  resident: "#BE2D12",
  breeding: "#D9480F",
  wintering: "#F76707",
  passage: "#FFD43B",
};

const LAYER_ORDER: DistributionStatus[] = [
  "resident",
  "breeding",
  "wintering",
  "passage",
];

export type BirdDistributionMapProps = {
  mapType: "global" | "hungary";
  ranges: DistributionRange[];
  activeStatuses: Record<DistributionStatus, boolean>;
  speciesSummary: string;
  onHover?: (info: DistributionMapHoverInfo | null) => void;
};

export type DistributionMapHoverInfo = {
  status: DistributionStatus;
  confidence: number | null; // 0..1
  note: string | null;
};

function toFeature(range: DistributionRange): Feature {
  return {
    type: "Feature",
    properties: {
      status: range.status,
      confidence: range.confidence,
      note: range.note ?? null,
    },
    geometry: range.geometry as Feature["geometry"],
  };
}

function buildCollection(ranges: DistributionRange[]): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: ranges.map(toFeature),
  };
}

export default function BirdDistributionMap({
  mapType,
  ranges,
  activeStatuses,
  speciesSummary,
  onHover,
}: BirdDistributionMapProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setIsDark(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const tileLayerArgs = useMemo(
    () => getBasemapTileLayerArgs({ basemap: "bird", isDark }),
    [isDark]
  );

  const byStatus = useMemo(() => {
    const grouped: Record<DistributionStatus, DistributionRange[]> = {
      resident: [],
      breeding: [],
      wintering: [],
      passage: [],
    };
    ranges.forEach((r) => grouped[r.status].push(r));
    return grouped;
  }, [ranges]);

  const bounds: LatLngBoundsExpression = useMemo(() => {
    if (mapType === "hungary") {
      // Deterministic "show full HU" viewport for a static display map.
      return HUNGARY_FULL_BOUNDS_V1;
    }

    // Leaflet WebMercator clamps to ~±85 deg; using ~±80 keeps "full Earth" framing stable.
    return WORLD_FULL_BOUNDS_V1;
  }, [mapType]);

  const collections = useMemo(() => {
    const out: Partial<Record<DistributionStatus, FeatureCollection>> = {};
    LAYER_ORDER.forEach((status) => {
      if (!activeStatuses[status]) return;
      const items = byStatus[status];
      if (!items.length) return;
      out[status] = buildCollection(items);
    });
    return out;
  }, [activeStatuses, byStatus]);

  const makeStyle = (status: DistributionStatus): PathOptions => ({
    fillColor: STATUS_COLORS[status],
    fillOpacity: 0.55,
    stroke: false,
  });

  const bindTooltip = (feature: Feature, layer: unknown) => {
    const props = (feature.properties ?? {}) as Record<string, unknown>;
    const status = typeof props.status === "string" ? props.status : "";
    const note = typeof props.note === "string" ? props.note.trim() : "";
    const confidenceRaw =
      typeof props.confidence === "number" ? props.confidence : null;

    const lines = [speciesSummary, status ? `Status: ${status}` : ""].filter(Boolean);

    if (onHover) {
      const maybeStatus = status as DistributionStatus;
      const hoverInfo: DistributionMapHoverInfo | null =
        maybeStatus && (STATUS_COLORS as Record<string, string>)[maybeStatus]
          ? { status: maybeStatus, confidence: confidenceRaw, note: note || null }
          : null;

      const layerWithEvents = layer as unknown as {
        on: (handlers: Record<string, () => void>) => void;
      };

      layerWithEvents.on({
        mouseover: () => onHover(hoverInfo),
        mouseout: () => onHover(null),
        focus: () => onHover(hoverInfo),
        blur: () => onHover(null),
      });
    }

    // Keep a minimal in-map tooltip as a fallback when the legend panel is absent.
    const layerWithTooltip = layer as {
      bindTooltip?: (html: string, options: { sticky: boolean; opacity: number }) => void;
    };

    if (layerWithTooltip.bindTooltip && !onHover) {
      layerWithTooltip.bindTooltip(lines.join("<br/>"), {
        sticky: true,
        opacity: 0.95,
      });
    }
  };

  return (
    <div className={styles.wrap}>
      <MapContainer
        className={styles.map}
        bounds={bounds}
        boundsOptions={{ padding: [12, 12] }}
        zoomControl={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        dragging={false}
        keyboard={false}
        boxZoom={false}
        touchZoom={false}
        attributionControl={false}
      >
        <TileLayer
          url={tileLayerArgs.url}
          attribution={tileLayerArgs.attribution}
          noWrap={true}
        />
        {LAYER_ORDER.map((status) => {
          const data = collections[status];
          if (!data) return null;
          return (
            <GeoJSON
              key={status}
              data={data}
              style={makeStyle(status)}
              onEachFeature={bindTooltip}
            />
          );
        })}
      </MapContainer>
    </div>
  );
}
