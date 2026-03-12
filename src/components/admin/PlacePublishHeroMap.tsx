"use client";

import dynamic from "next/dynamic";

const PlacePublishHeroMap = dynamic(() => import("./PlacePublishHeroMap.leaflet"), {
  ssr: false,
  loading: () => null,
});

export default PlacePublishHeroMap;
