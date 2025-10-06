"use client";

import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
/* FONTOS: a Leafletet namespace-importtal hozzuk be */
import * as L from "leaflet";
import { useEffect } from "react";
import type { Sighting } from "@/lib/types";

/* Alapértelmezett ikonok helyi fájlokkal */
if (typeof window !== "undefined") {
  // @ts-ignore
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconUrl: "/leaflet/marker-icon.png",
    iconRetinaUrl: "/leaflet/marker-icon-2x.png",
    shadowUrl: "/leaflet/marker-shadow.png",
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
}

function ClickCapture({ onClick }: { onClick: (latlng: L.LatLng) => void }) {
  useMapEvents({
    click(e) { onClick(e.latlng); }
  });
  return null;
}

function GeolocateControl() {
  const map = useMapEvents({});
  useEffect(() => {
    const handler = () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          map.setView([latitude, longitude], 12, { animate: true });
        },
        () => { /* csendben elnyeljük (http, tiltás stb.) */ }
      );
    };
    // @ts-ignore
    window.addEventListener("map:geolocate", handler);
    return () => {
      // @ts-ignore
      window.removeEventListener("map:geolocate", handler);
    };
  }, [map]);
  return null;
}

export default function MapView({
  onMapClick,
  sightings
}: {
  onMapClick: (latlng: L.LatLng) => void;
  sightings: Sighting[];
}) {
  const center: [number, number] = [47.16, 19.5];

  return (
    <div className="absolute inset-0">
      <MapContainer center={center} zoom={7} className="h-full w-full z-[300]">
        <TileLayer
          attribution='&copy; OpenStreetMap hozzájárulók'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickCapture onClick={onMapClick} />
        <GeolocateControl />

        {sightings.map((s) => (
          <Marker key={s.id} position={[s.lat, s.lng]}>
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">{s.species}</div>
                <div className="text-gray-600">
                  {new Date(s.when).toLocaleString("hu-HU")}
                </div>
                {s.notes && <div className="mt-1">{s.notes}</div>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
