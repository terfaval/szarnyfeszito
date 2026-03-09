"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import styles from "./PlacesMap.module.css";
import { ensureLeafletDefaultIcon } from "./leafletIconFix";
import type { PlaceMarker } from "@/types/place";

const tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

export type PlacesMapProps = {
  markers: PlaceMarker[];
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
};

export default function PlacesMap({ markers, selectedSlug, onSelect }: PlacesMapProps) {
  useEffect(() => {
    ensureLeafletDefaultIcon();
  }, []);

  const center = useMemo<[number, number]>(() => [47.16, 19.5], []);

  return (
    <div className={`places-map ${styles.layout}`}>
      <MapContainer className={styles.map} center={center} zoom={7} scrollWheelZoom>
        <TileLayer url={tileUrl} />
        {markers.map((marker) => {
          if (marker.lat === null || marker.lng === null) return null;
          return (
            <Marker
              key={marker.id}
              position={[marker.lat, marker.lng]}
              eventHandlers={{
                click: () => onSelect(marker.slug),
              }}
              opacity={selectedSlug && selectedSlug !== marker.slug ? 0.65 : 1}
            />
          );
        })}
      </MapContainer>
    </div>
  );
}

