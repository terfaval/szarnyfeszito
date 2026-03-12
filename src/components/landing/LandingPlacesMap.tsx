"use client";

import { useState } from "react";
import Link from "next/link";
import PlacesMap from "@/components/maps/PlacesMap";
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
    <section className={styles.root} aria-label="Places map preview">
      <div className={styles.mapFrame}>
        <PlacesMap
          markers={markers}
          layers={layers}
          selectedSlug={selectedSlug}
          onSelect={setSelectedSlug}
          basemap="bird"
          regionVisualization="places_regions_v1"
          markerColorMode="water_highlight_v1"
          interactionMode="bounded_hu_v1"
          toolBarVariant="bottom_right_v1"
          showResetViewButton
        />
      </div>

      <div className={styles.footerRow}>
        <p className={styles.footerHint}>
          Kattints egy jelölőre, vagy nyisd meg a teljes helyszín térképet a részletes panelhez.
        </p>
        <Link className="btn btn--secondary" href="/places">
          Helyszínek
        </Link>
      </div>
    </section>
  );
}

