"use client";

import dynamic from "next/dynamic";
import type { PlacesMapProps } from "./PlacesMap.leaflet";

const PlacesMap = dynamic<PlacesMapProps>(() => import("./PlacesMap.leaflet"), {
  ssr: false,
  loading: () => null,
});

export default PlacesMap;

export type { PlacesMapInteractionMode, PlacesMapMarkerColorMode, PlacesMapProps, PlacesMapToolBarVariant } from "./PlacesMap.leaflet";
