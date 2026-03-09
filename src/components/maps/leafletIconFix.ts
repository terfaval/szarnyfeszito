"use client";

import L from "leaflet";

let configured = false;

export function ensureLeafletDefaultIcon() {
  if (configured) return;
  configured = true;

  const iconRetinaUrl = new URL("leaflet/dist/images/marker-icon-2x.png", import.meta.url).toString();
  const iconUrl = new URL("leaflet/dist/images/marker-icon.png", import.meta.url).toString();
  const shadowUrl = new URL("leaflet/dist/images/marker-shadow.png", import.meta.url).toString();

  L.Icon.Default.mergeOptions({
    iconRetinaUrl,
    iconUrl,
    shadowUrl,
  });
}

