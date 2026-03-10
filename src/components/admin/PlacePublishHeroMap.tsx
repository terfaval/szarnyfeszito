"use client";

import { useMemo } from "react";
import type { GeoJsonObject } from "geojson";
import { CircleMarker, GeoJSON, MapContainer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { HUNGARY_BORDER_110M } from "@/components/maps/hungaryBorder110m";
import styles from "./PlacePublishHeroMap.module.css";

const FALLBACK_CENTER: [number, number] = [47.16, 19.5];

export default function PlacePublishHeroMap({
  lat,
  lng,
  overlayGeoJson,
  overlayBbox,
}: {
  lat: number | null;
  lng: number | null;
  overlayGeoJson?: GeoJsonObject | null;
  overlayBbox?: { south: number; west: number; north: number; east: number } | null;
}) {
  const hasPosition = Number.isFinite(lat) && Number.isFinite(lng);
  const center = useMemo<[number, number]>(() => {
    if (!hasPosition) return FALLBACK_CENTER;
    return [lat as number, lng as number];
  }, [hasPosition, lat, lng]);

  const fallbackCenter = useMemo<[number, number]>(() => {
    if (!overlayBbox) return FALLBACK_CENTER;
    const hasBbox =
      Number.isFinite(overlayBbox.south) &&
      Number.isFinite(overlayBbox.west) &&
      Number.isFinite(overlayBbox.north) &&
      Number.isFinite(overlayBbox.east);
    if (!hasBbox) return FALLBACK_CENTER;
    return [(overlayBbox.south + overlayBbox.north) / 2, (overlayBbox.west + overlayBbox.east) / 2];
  }, [overlayBbox]);

  const effectiveCenter = hasPosition ? center : fallbackCenter;

  return (
    <div className={styles.wrap} aria-label="Map preview">
      {!hasPosition ? <div className={styles.overlayNote}>No location marker set yet.</div> : null}
      <MapContainer
        className={styles.map}
        center={effectiveCenter}
        zoom={8}
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
          data={HUNGARY_BORDER_110M}
          style={{
            color: "var(--brand-ink)",
            weight: 2,
            fillColor: "var(--brand-paper)",
            fillOpacity: 1,
          }}
        />
        {overlayGeoJson ? (
          <GeoJSON
            data={overlayGeoJson}
            style={{
              color: "rgba(var(--brand-accent-rgb), 0.9)",
              weight: 2,
              fillColor: "rgba(var(--brand-accent-rgb), 0.22)",
              fillOpacity: 1,
            }}
          />
        ) : null}
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
