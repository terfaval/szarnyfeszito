"use client";

import { useEffect, useMemo, useState } from "react";
import type { Feature, FeatureCollection } from "geojson";
import type { DistributionRange, DistributionStatus } from "@/types/distributionMap";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import type { PathOptions } from "leaflet";
import "leaflet/dist/leaflet.css";
import styles from "./BirdDistributionMap.module.css";
import { getBasemapTileLayerArgs } from "./basemaps";

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
};

function toFeature(range: DistributionRange): Feature {
  return {
    type: "Feature",
    properties: {
      status: range.status,
      confidence: range.confidence,
      note: range.note ?? null,
    },
    geometry: range.geometry as any,
  };
}

function buildCollection(ranges: DistributionRange[]): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: ranges.map(toFeature) as any,
  };
}

export default function BirdDistributionMap({
  mapType,
  ranges,
  activeStatuses,
  speciesSummary,
}: BirdDistributionMapProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setIsDark(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const center: [number, number] =
    mapType === "global" ? [20, 0] : [47.16, 19.5];
  const zoom = mapType === "global" ? 2 : 6;
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
    const confidence =
      confidenceRaw === null ? null : Math.round(confidenceRaw * 100);

    const lines = [
      speciesSummary,
      status ? `Status: ${status}` : "",
      note ? `Note: ${note}` : "",
      confidence === null ? "" : `Confidence: ${confidence}%`,
    ].filter(Boolean);

    const layerWithTooltip = layer as {
      bindTooltip: (html: string, options: { sticky: boolean; opacity: number }) => void;
    };
    layerWithTooltip.bindTooltip(lines.join("<br/>"), {
      sticky: true,
      opacity: 0.95,
    });
  };

  return (
    <div className={styles.wrap}>
      <MapContainer
        className={styles.map}
        center={center}
        zoom={zoom}
        zoomControl={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        dragging={false}
        keyboard={false}
        attributionControl={false}
      >
        <TileLayer url={tileLayerArgs.url} attribution={tileLayerArgs.attribution} />
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
