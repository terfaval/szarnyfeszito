"use client";

import { useEffect, useMemo, useState } from "react";
import { CircleMarker, GeoJSON, MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import styles from "./PlacesMap.module.css";
import { DEFAULT_BASEMAP, getBasemapTileLayerArgs } from "./basemaps";
import type { BasemapId } from "./basemaps";
import type { PlaceMarker } from "@/types/place";
import { HUNGARY_BORDER_110M, HUNGARY_WATER_MASK_110M } from "./hungaryBorder110m";

export type PlacesMapProps = {
  markers: PlaceMarker[];
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
  basemap?: BasemapId;
};

export default function PlacesMap({
  markers,
  selectedSlug,
  onSelect,
  basemap = DEFAULT_BASEMAP,
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

  return (
    <div className={`places-map ${styles.layout}`}>
      <MapContainer
        className={styles.map}
        center={center}
        zoom={7}
        zoomControl={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        dragging={false}
        keyboard={false}
        boxZoom={false}
        touchZoom={false}
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
        {markers.map((marker) => {
          if (marker.lat === null || marker.lng === null) return null;
          const isSelected = selectedSlug === marker.slug;
          const isDimmed = !!selectedSlug && !isSelected;
          return (
            <CircleMarker
              key={marker.id}
              center={[marker.lat, marker.lng]}
              radius={isSelected ? 7 : 5}
              pathOptions={{
                color: isSelected ? "#0f172a" : "#0b3b8c",
                weight: isSelected ? 2 : 1,
                fillColor: isSelected ? "#2563eb" : "#60a5fa",
                fillOpacity: isDimmed ? 0.55 : 0.9,
                opacity: isDimmed ? 0.55 : 1,
              }}
              eventHandlers={{
                click: () => onSelect(marker.slug),
              }}
            />
          );
        })}
      </MapContainer>
    </div>
  );
}
