"use client";

import { useEffect, useMemo, useState } from "react";
import PlacesMap from "@/components/maps/PlacesMap";
import type {
  PlaceFrequencyBand,
  PlaceLocationPrecision,
  PlaceMarker,
  PlaceNotableUnit,
  PlaceSensitivityLevel,
  PlaceStatus,
  PlaceType,
} from "@/types/place";
import type { PlacesMapLayersV1 } from "@/types/placesMap";
import PlacePublishPreview from "@/components/admin/PlacePublishPreview";
import type { SeasonKey } from "@/lib/season";
import type { PlaceUiVariantsV1 } from "@/lib/placeContentSchema";

type PublicPlaceDetail = {
  place: {
    id: string;
    slug: string;
    name: string;
    place_type: PlaceType;
    status: PlaceStatus;
    leaflet_region_id: string | null;
    region_landscape: string | null;
    county: string | null;
    district: string | null;
    nearest_city: string | null;
    distance_from_nearest_city_km: number | null;
    settlement: string | null;
    location_precision: PlaceLocationPrecision;
    sensitivity_level: PlaceSensitivityLevel;
    is_beginner_friendly: boolean;
    access_note: string | null;
    parking_note: string | null;
    best_visit_note: string | null;
    notable_units_json: PlaceNotableUnit[] | null;
    updated_at: string;
  };
  marker: { lat: number | null; lng: number | null } | null;
  content: PlaceUiVariantsV1;
  current_season: SeasonKey;
  hero_image_src: string | null;
  birds: Array<{
    id: string;
    slug: string;
    name_hu: string;
    iconicSrc: string | null;
    rank: number;
    frequency_band: PlaceFrequencyBand;
  }>;
};

function getSelectedSlugFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("place");
}

function replacePlaceQueryParam(slug: string | null) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (slug) {
    url.searchParams.set("place", slug);
  } else {
    url.searchParams.delete("place");
  }
  const search = url.searchParams.toString();
  window.history.replaceState(null, "", search ? `${url.pathname}?${search}` : url.pathname);
}

export default function PlacesExplorer() {
  const [markers, setMarkers] = useState<PlaceMarker[]>([]);
  const [layers, setLayers] = useState<PlacesMapLayersV1 | null>(null);
  const [loadingMarkers, setLoadingMarkers] = useState(true);
  const [loadingLayers, setLoadingLayers] = useState(false);
  const [markersError, setMarkersError] = useState<string | null>(null);

  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<PublicPlaceDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedSlug(getSelectedSlugFromLocation());
  }, []);

  useEffect(() => {
    if (markers.length > 0) {
      setLoadingMarkers(false);
      return;
    }

    const run = async () => {
      setLoadingMarkers(true);
      setMarkersError(null);
      const response = await fetch("/api/public/places");
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setMarkersError(payload?.error ?? "Nem sikerült betölteni a helyszíneket.");
        setLoadingMarkers(false);
        return;
      }

      const nextMarkers = (payload?.data?.markers ?? []) as PlaceMarker[];
      setMarkers(nextMarkers);
      setLoadingMarkers(false);

      const regionIds = ((payload?.data?.place_region_ids ?? []) as string[]).filter(Boolean);
      if (regionIds.length === 0) return;

      setLoadingLayers(true);
      const layersResponse = await fetch(
        `/api/public/places?include_layers=1&include_markers=0&region_ids=${encodeURIComponent(regionIds.join(","))}`
      );
      const layersPayload = await layersResponse.json().catch(() => null);
      if (layersResponse.ok) {
        setLayers((layersPayload?.data?.layers ?? null) as PlacesMapLayersV1 | null);
      }
      setLoadingLayers(false);
    };
    run();
  }, [markers.length]);

  const selectSlug = (slug: string | null) => {
    setSelectedSlug(slug);
    replacePlaceQueryParam(slug);
    if (!slug) {
      setSelectedDetail(null);
      setDetailError(null);
    }
  };

  useEffect(() => {
    if (!selectedSlug) return;

    const run = async () => {
      setLoadingDetail(true);
      setDetailError(null);
      const response = await fetch(`/api/public/places/${encodeURIComponent(selectedSlug)}`);
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setDetailError(payload?.error ?? "Nem sikerült betölteni a helyszínt.");
        setSelectedDetail(null);
        setLoadingDetail(false);
        return;
      }
      setSelectedDetail(payload?.data as PublicPlaceDetail);
      setLoadingDetail(false);
    };
    run();
  }, [selectedSlug]);

  const selectedName = useMemo(() => {
    if (selectedDetail?.place?.name) return selectedDetail.place.name;
    if (!selectedSlug) return null;
    const marker = markers.find((m) => m.slug === selectedSlug);
    return marker?.name ?? selectedSlug;
  }, [markers, selectedDetail, selectedSlug]);

  const selectedRegionId = useMemo(() => {
    const fromDetail = selectedDetail?.place?.leaflet_region_id?.trim() ?? "";
    if (fromDetail) return fromDetail;
    if (!selectedSlug) return null;
    const marker = markers.find((m) => m.slug === selectedSlug);
    const fromMarker = marker?.leaflet_region_id?.trim() ?? "";
    return fromMarker || null;
  }, [markers, selectedDetail, selectedSlug]);

  useEffect(() => {
    if (!selectedSlug) return;
    if (layers) return;
    if (!selectedRegionId) return;

    const run = async () => {
      setLoadingLayers(true);
      const response = await fetch(
        `/api/public/places?include_layers=1&include_markers=0&region_ids=${encodeURIComponent(selectedRegionId)}`
      );
      const payload = await response.json().catch(() => null);
      if (response.ok) {
        setLayers((payload?.data?.layers ?? null) as PlacesMapLayersV1 | null);
      }
      setLoadingLayers(false);
    };

    run();
  }, [layers, selectedRegionId, selectedSlug]);

  if (selectedSlug) {
    return (
      <main className="space-y-6">
        {loadingDetail ? (
          <div className="admin-stat-card admin-stat-card--note">Betöltés: {selectedName}…</div>
        ) : detailError ? (
          <div className="admin-message admin-message--error">{detailError}</div>
        ) : selectedDetail ? (
          <PlacePublishPreview
            place={selectedDetail.place}
            marker={selectedDetail.marker}
            layers={layers}
            content={selectedDetail.content}
            heroImageUrl={selectedDetail.hero_image_src}
            currentSeason={selectedDetail.current_season}
            birds={selectedDetail.birds}
            showSeasonal
            showHeading={false}
            birdLinkBasePath="/birds"
            birdLinkKey="id"
            mapBasemap="brand"
            mapInteractionMode="static"
          />
        ) : (
          <div className="admin-stat-card admin-stat-card--note">Nincs elérhető részlet.</div>
        )}
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <header className="admin-heading">
        <p className="admin-heading__label">Szárnyfeszítő</p>
        <h1 className="admin-heading__title admin-heading__title--large">Helyszínek</h1>
        <p className="admin-heading__description">
          Publikált madármegfigyelő helyszínek Magyarországon. A jelölők szándékosan közelítő helyet mutatnak.
        </p>
      </header>

      {markersError ? <div className="place-panel admin-message admin-message--error">{markersError}</div> : null}

      <section className="place-map">
        {loadingMarkers ? (
          <div className="place-panel admin-stat-card admin-stat-card--note">Térkép betöltése…</div>
        ) : (
          <PlacesMap
            markers={markers}
            layers={layers}
            selectedSlug={null}
            selectedRegionId={selectedRegionId}
            onSelect={(slug) => selectSlug(slug)}
            basemap="brand"
            regionVisualization="places_regions_v1"
            markerColorMode="place_type_category_v1"
          />
        )}
      </section>

      {!loadingMarkers && loadingLayers ? (
        <div className="place-panel admin-stat-card admin-stat-card--note">Rétegek betöltése…</div>
      ) : null}
    </main>
  );
}
