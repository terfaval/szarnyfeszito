"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PlacesMap from "@/components/maps/PlacesMap";
import PlaceCardShort from "@/components/shared/PlaceCardShort";
import PlaceTypeFilter from "@/components/maps/PlaceTypeFilter";
import { HUNGARY_FULL_BOUNDS_V1 } from "@/components/maps/viewPresets";
import type { PlaceMarker, PlaceType } from "@/types/place";
import type { PlacesMapLayersV1 } from "@/types/placesMap";
import { sortPlaceTypes } from "@/lib/placeTypeMeta";
import styles from "./LandingPlacesMap.module.css";

type LandingPlaceDetail = {
  place: {
    slug: string;
    name: string;
    place_type: PlaceType;
    county: string | null;
    nearest_city: string | null;
  };
  content: {
    short: string;
  };
  birds: Array<{
    id: string;
    slug: string;
    name_hu: string;
    iconicSrc: string | null;
  }>;
};

type LandingPlaceResponseBird = {
  id?: string;
  slug?: string;
  name_hu?: string;
  iconicSrc?: string | null;
};

type LandingPlaceResponseData = {
  place?: {
    slug?: string;
    name?: string;
    place_type?: PlaceType | string;
    county?: string | null;
    nearest_city?: string | null;
  };
  content?: {
    short?: string;
  };
  birds?: Array<LandingPlaceResponseBird | null | undefined>;
};

type LandingPlaceResponse = {
  data?: LandingPlaceResponseData;
  error?: string;
};

export default function LandingPlacesMap({
  markers,
  layers,
}: {
  markers: PlaceMarker[];
  layers: PlacesMapLayersV1;
}) {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<PlaceType | "all">("all");
  const [detail, setDetail] = useState<LandingPlaceDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, LandingPlaceDetail>>(new Map());
  const regionSlugById = useMemo(() => {
    const map = new Map<string, string>();
    markers.forEach((marker) => {
      const regionId = (marker.leaflet_region_id ?? "").trim();
      if (!regionId) return;
      if (!map.has(regionId)) {
        map.set(regionId, marker.slug);
      }
    });
    return map;
  }, [markers]);

  const handleRegionHover = useCallback((slug: string | null) => {
    setSelectedSlug(slug);
  }, []);

  const availableTypes = useMemo(() => sortPlaceTypes(markers.map((marker) => marker.place_type)), [markers]);

  const visibleMarkers = useMemo(() => {
    if (typeFilter === "all") return markers;
    return markers.filter((marker) => marker.place_type === typeFilter);
  }, [markers, typeFilter]);

  const activeSelectedSlug =
    selectedSlug && visibleMarkers.some((marker) => marker.slug === selectedSlug) ? selectedSlug : null;
  const displayDetail = activeSelectedSlug ? detail : null;
  const displayLoading = activeSelectedSlug ? loadingDetail : false;
  const displayError = activeSelectedSlug ? detailError : null;

  useEffect(() => {
    if (!activeSelectedSlug) return;

    const controller = new AbortController();
    const run = async () => {
      try {
        const cached = cacheRef.current.get(activeSelectedSlug);
        if (cached) {
          setDetail(cached);
          setDetailError(null);
          return;
        }

        setLoadingDetail(true);
        setDetailError(null);
        const response = await fetch(`/api/public/places/${encodeURIComponent(activeSelectedSlug)}`, {
          signal: controller.signal,
        });
        const payload = (await response.json().catch(() => null)) as LandingPlaceResponse | null;
        if (!response.ok) {
          setDetailError(payload?.error ?? "Nem sikerült betölteni a helyszínt.");
          setDetail(null);
          return;
        }

        const data: LandingPlaceResponseData | null = payload?.data ?? null;
        if (!data?.place) {
          setDetailError("Nincs elérhető helyszín.");
          setDetail(null);
          return;
        }

        const next: LandingPlaceDetail = {
          place: {
            slug: String(data.place.slug ?? activeSelectedSlug),
            name: String(data.place.name ?? activeSelectedSlug),
            place_type: (typeof data.place.place_type === "string"
              ? (data.place.place_type as PlaceType)
              : "lake"),
            county: typeof data.place.county === "string" ? data.place.county : null,
            nearest_city: typeof data.place.nearest_city === "string" ? data.place.nearest_city : null,
          },
          content: {
            short: typeof data.content?.short === "string" ? data.content.short : "",
          },
          birds: Array.isArray(data.birds)
            ? data.birds
                .map((bird) => {
                  if (
                    !bird ||
                    typeof bird.id !== "string" ||
                    typeof bird.slug !== "string" ||
                    typeof bird.name_hu !== "string"
                  ) {
                    return null;
                  }
                  return {
                    id: bird.id,
                    slug: bird.slug,
                    name_hu: bird.name_hu,
                    iconicSrc: typeof bird.iconicSrc === "string" ? bird.iconicSrc : null,
                  };
                })
                .filter((bird): bird is LandingPlaceDetail["birds"][number] => Boolean(bird))
            : [],
        };

        cacheRef.current.set(activeSelectedSlug, next);
        setDetail(next);
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }
        setDetailError(err instanceof Error ? err.message : "Nem sikerült betölteni a helyszínt.");
        setDetail(null);
      } finally {
        setLoadingDetail(false);
      }
    };

    run();

    return () => controller.abort();
  }, [activeSelectedSlug]);

  return (
    <section className={styles.mapFrame} aria-label="Places map preview">
      <div className={styles.mapBody}>
        <div className={styles.mapContainer}>
          <PlacesMap
            markers={visibleMarkers}
            layers={layers}
            selectedSlug={activeSelectedSlug}
            onSelect={(slug) => setSelectedSlug((prev) => (prev === slug ? null : slug))}
            onRegionHover={handleRegionHover}
            regionSlugById={regionSlugById}
            layoutVariant="fill_parent_v1"
            basemap="bird"
            regionVisualization="places_regions_v1"
            markerColorMode="place_type_category_v1"
            interactionMode="bounded_hu_v1"
            defaultBounds={HUNGARY_FULL_BOUNDS_V1}
            defaultBoundsOptions={{ padding: [18, 18] }}
            toolBarVariant="bottom_right_v1"
            toolBarTopControls={
              <PlaceTypeFilter
                variant="toolbar"
                label="Szűrés"
                value={typeFilter}
                onChange={setTypeFilter}
                availableTypes={availableTypes}
              />
            }
            showResetViewButton
          />
          <div className={styles.mapOverlay} aria-live="polite">
            {displayDetail ? (
              <PlaceCardShort
                className={styles.placeCard}
                place={displayDetail.place}
                shortDescription={displayDetail.content.short}
                birds={displayDetail.birds}
                placeLinkBasePath="/places"
                birdLinkBasePath="/birds"
                onClose={() => setSelectedSlug(null)}
              />
            ) : activeSelectedSlug ? (
              <div className={styles.overlayCard}>
                <p className={styles.overlayTitle}>{displayError ? "Hiba" : "Betöltés…"}</p>
                <p className={styles.overlaySubtitle}>
                  {displayError ?? (displayLoading ? "Betöltés…" : "Várj a részletekért…")}
                </p>
              </div>
            ) : (
              <div className={styles.overlayCard}>
                <p className={styles.overlayTitle}>Felfedezés</p>
                <p className={styles.overlaySubtitle}>Érintsd meg valamelyik jelölőt a térképen.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
