"use client";

import { useState } from "react";
import PlacesMap from "@/components/maps/PlacesMap";
import { HUNGARY_FULL_BOUNDS_V1 } from "@/components/maps/viewPresets";
import type { PlaceMarker } from "@/types/place";
import type { PlacesMapLayersV1 } from "@/types/placesMap";
import styles from "./LandingPlacesMap.module.css";

export default function LandingPlacesMap({
  markers,
  layers,
}: {
  markers: PlaceMarker[];
  layers: PlacesMapLayersV1;
}) {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  return (
    <section className={styles.mapFrame} aria-label="Places map preview">
      <PlacesMap
        markers={markers}
        layers={layers}
        selectedSlug={selectedSlug}
        onSelect={setSelectedSlug}
        layoutVariant="fill_parent_v1"
        basemap="bird"
        regionVisualization="places_regions_v1"
        markerColorMode="place_type_category_v1"
        interactionMode="bounded_hu_v1"
        defaultBounds={HUNGARY_FULL_BOUNDS_V1}
        defaultBoundsOptions={{ padding: [18, 18] }}
        toolBarVariant="bottom_right_v1"
        showResetViewButton
      />
    </section>
  );
}
