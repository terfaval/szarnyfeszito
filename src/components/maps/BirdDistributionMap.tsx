"use client";

import dynamic from "next/dynamic";
import type { BirdDistributionMapProps } from "./BirdDistributionMap.leaflet";

const BirdDistributionMap = dynamic<BirdDistributionMapProps>(() => import("./BirdDistributionMap.leaflet"), {
  ssr: false,
  loading: () => null,
});

export default BirdDistributionMap;

export type { BirdDistributionMapProps, DistributionMapHoverInfo } from "./BirdDistributionMap.leaflet";
