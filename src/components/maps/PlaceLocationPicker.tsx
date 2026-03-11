"use client";

import { useMemo } from "react";
import { Marker, useMapEvents } from "react-leaflet";
import styles from "./PlaceLocationPicker.module.css";
import { DEFAULT_BASEMAP } from "./basemaps";
import type { BasemapId, BasemapPresetKey } from "./basemaps";
import ThemedMapContainer from "./ThemedMapContainer";
import BasemapLayer from "./BasemapLayer";
import { createMapMarkerIcon } from "./markers";

type PlaceLocationPickerProps = {
  lat: number | null;
  lng: number | null;
  onPick: (coords: { lat: number; lng: number }) => void;
  basemap?: BasemapId;
  basemapPreset?: BasemapPresetKey;
};

function ClickHandler({ onPick }: { onPick: PlaceLocationPickerProps["onPick"] }) {
  useMapEvents({
    click(event) {
      onPick({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });
  return null;
}

export default function PlaceLocationPicker({
  lat,
  lng,
  onPick,
  basemap = DEFAULT_BASEMAP,
  basemapPreset,
}: PlaceLocationPickerProps) {
  const center = useMemo<[number, number]>(() => {
    if (typeof lat === "number" && typeof lng === "number") {
      return [lat, lng];
    }
    return [47.16, 19.5];
  }, [lat, lng]);

  const markerPosition =
    typeof lat === "number" && typeof lng === "number" ? ([lat, lng] as [number, number]) : null;
  const markerIcon = useMemo(() => createMapMarkerIcon({ variant: "default", selected: true, size: "lg" }), []);
  const effectiveBasemap = basemap === "brand" ? DEFAULT_BASEMAP : basemap;

  return (
    <div className={`place-location-picker ${styles.wrap}`}>
      <ThemedMapContainer
        className={styles.map}
        basemapPreset={basemapPreset}
        center={center}
        zoom={markerPosition ? 10 : 7}
        scrollWheelZoom
        zoomControl={false}
        attributionControl={false}
      >
        <BasemapLayer basemap={effectiveBasemap} basemapPreset={basemapPreset} />
        <ClickHandler onPick={onPick} />
        {markerPosition ? <Marker position={markerPosition} icon={markerIcon} keyboard={true} /> : null}
      </ThemedMapContainer>
    </div>
  );
}
