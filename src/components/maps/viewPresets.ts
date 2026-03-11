"use client";

import type { LatLngBoundsExpression } from "leaflet";

export const HUNGARY_FULL_BOUNDS_V1: LatLngBoundsExpression = [
  [45.7, 16.0], // southWest [lat, lng]
  [48.7, 22.9], // northEast [lat, lng]
];

// Leaflet WebMercator clamps to ~±85 deg; using ~±80 keeps "full Earth" framing stable.
export const WORLD_FULL_BOUNDS_V1: LatLngBoundsExpression = [
  [-80, -180],
  [80, 180],
];

