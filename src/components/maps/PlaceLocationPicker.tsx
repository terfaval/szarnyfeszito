"use client";

import dynamic from "next/dynamic";
import type { PlaceLocationPickerProps } from "./PlaceLocationPicker.leaflet";

const PlaceLocationPicker = dynamic<PlaceLocationPickerProps>(() => import("./PlaceLocationPicker.leaflet"), {
  ssr: false,
  loading: () => null,
});

export default PlaceLocationPicker;

export type { PlaceLocationPickerProps } from "./PlaceLocationPicker.leaflet";
