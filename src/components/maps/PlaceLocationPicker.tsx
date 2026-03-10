"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import styles from "./PlaceLocationPicker.module.css";
import { DEFAULT_BASEMAP, getBasemapTileLayerArgs } from "./basemaps";
import type { BasemapId } from "./basemaps";
import { ensureLeafletDefaultIcon } from "./leafletIconFix";

type PlaceLocationPickerProps = {
  lat: number | null;
  lng: number | null;
  onPick: (coords: { lat: number; lng: number }) => void;
  basemap?: BasemapId;
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
}: PlaceLocationPickerProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    ensureLeafletDefaultIcon();
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setIsDark(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const center = useMemo<[number, number]>(() => {
    if (typeof lat === "number" && typeof lng === "number") {
      return [lat, lng];
    }
    return [47.16, 19.5];
  }, [lat, lng]);

  const markerPosition =
    typeof lat === "number" && typeof lng === "number" ? ([lat, lng] as [number, number]) : null;
  const tileLayerArgs = useMemo(
    () => getBasemapTileLayerArgs({ basemap, isDark }),
    [basemap, isDark]
  );

  return (
    <div className={`place-location-picker ${styles.wrap}`}>
      <MapContainer className={styles.map} center={center} zoom={markerPosition ? 10 : 7} scrollWheelZoom>
        <TileLayer url={tileLayerArgs.url} attribution={tileLayerArgs.attribution} />
        <ClickHandler onPick={onPick} />
        {markerPosition ? <Marker position={markerPosition} /> : null}
      </MapContainer>
    </div>
  );
}
