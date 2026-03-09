"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import styles from "./PlaceLocationPicker.module.css";
import { ensureLeafletDefaultIcon } from "./leafletIconFix";

const tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

type PlaceLocationPickerProps = {
  lat: number | null;
  lng: number | null;
  onPick: (coords: { lat: number; lng: number }) => void;
};

function ClickHandler({ onPick }: { onPick: PlaceLocationPickerProps["onPick"] }) {
  useMapEvents({
    click(event) {
      onPick({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });
  return null;
}

export default function PlaceLocationPicker({ lat, lng, onPick }: PlaceLocationPickerProps) {
  useEffect(() => {
    ensureLeafletDefaultIcon();
  }, []);

  const center = useMemo<[number, number]>(() => {
    if (typeof lat === "number" && typeof lng === "number") {
      return [lat, lng];
    }
    return [47.16, 19.5];
  }, [lat, lng]);

  const markerPosition =
    typeof lat === "number" && typeof lng === "number" ? ([lat, lng] as [number, number]) : null;

  return (
    <div className={`place-location-picker ${styles.wrap}`}>
      <MapContainer className={styles.map} center={center} zoom={markerPosition ? 10 : 7} scrollWheelZoom>
        <TileLayer url={tileUrl} />
        <ClickHandler onPick={onPick} />
        {markerPosition ? <Marker position={markerPosition} /> : null}
      </MapContainer>
    </div>
  );
}

