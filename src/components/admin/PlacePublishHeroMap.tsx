"use client";

import { useMemo } from "react";
import { CircleMarker, GeoJSON, MapContainer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { HUNGARY_BORDER_110M, HUNGARY_WATER_MASK_110M } from "@/components/maps/hungaryBorder110m";
import styles from "./PlacePublishHeroMap.module.css";

const FALLBACK_CENTER: [number, number] = [47.16, 19.5];

export default function PlacePublishHeroMap({
  lat,
  lng,
  label,
}: {
  lat: number | null;
  lng: number | null;
  label: string;
}) {
  const hasPosition = Number.isFinite(lat) && Number.isFinite(lng);
  const center = useMemo<[number, number]>(() => {
    if (!hasPosition) return FALLBACK_CENTER;
    return [lat as number, lng as number];
  }, [hasPosition, lat, lng]);

  return (
    <div className={styles.wrap} aria-label={`Map preview: ${label}`}>
      {!hasPosition ? <div className={styles.overlayNote}>No location marker set yet.</div> : null}
      <MapContainer
        className={styles.map}
        center={center}
        zoom={hasPosition ? 10 : 7}
        zoomControl={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        dragging={false}
        keyboard={false}
        boxZoom={false}
        touchZoom={false}
        attributionControl={false}
      >
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
        {hasPosition ? (
          <CircleMarker
            center={[lat as number, lng as number]}
            radius={8}
            pathOptions={{
              color: "rgba(var(--brand-ink-rgb), 0.9)",
              weight: 2,
              fillColor: "var(--brand-accent)",
              fillOpacity: 0.95,
            }}
          />
        ) : null}
      </MapContainer>
    </div>
  );
}

