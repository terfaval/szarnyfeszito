"use client";

import { useEffect, useMemo, useState } from "react";
import PlacesMap from "@/components/maps/PlacesMap";
import type { PlaceMarker, PlaceNotableUnit } from "@/types/place";
import { normalizePlaceNotableUnits } from "@/lib/placeNotableUnits";
import type { PlacesMapLayersV1 } from "@/types/placesMap";

type PublicPlaceDetail = {
  place: {
    id: string;
    slug: string;
    name: string;
    place_type: string;
    leaflet_region_id: string | null;
    region_landscape: string | null;
    county: string | null;
    district: string | null;
    nearest_city: string | null;
    distance_from_nearest_city_km: number | null;
    settlement: string | null;
    location_precision: string;
    sensitivity_level: string;
    is_beginner_friendly: boolean;
    access_note: string | null;
    parking_note: string | null;
    best_visit_note: string | null;
    notable_units_json: PlaceNotableUnit[] | null;
  };
  content: {
    schema_version: string;
    language: string;
    variants: {
      teaser: string;
      short: string;
      long: string;
      seasonal_snippet: { spring: string; summer: string; autumn: string; winter: string };
      ethics_tip: string;
      did_you_know: string;
      practical_tip: string;
      when_to_go: string;
      who_is_it_for: string;
      nearby_protection_context: string;
    };
  };
  place_birds: Array<{
    id: string;
    rank: number;
    frequency_band: string;
    is_iconic: boolean;
    pending_bird_name_hu: string | null;
    bird: { id: string; slug: string; name_hu: string } | null;
  }>;
};

export default function PlacesExplorer() {
  const [markers, setMarkers] = useState<PlaceMarker[]>([]);
  const [layers, setLayers] = useState<PlacesMapLayersV1 | null>(null);
  const [loadingMarkers, setLoadingMarkers] = useState(true);
  const [markersError, setMarkersError] = useState<string | null>(null);

  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<PublicPlaceDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
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
      setMarkers((payload?.data?.markers ?? []) as PlaceMarker[]);
      setLayers((payload?.data?.layers ?? null) as PlacesMapLayersV1 | null);
      setLoadingMarkers(false);
    };
    run();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const slug = new URLSearchParams(window.location.search).get("place");
    if (slug) {
      setSelectedSlug(slug);
    }
  }, []);

  const selectSlug = (slug: string | null) => {
    setSelectedSlug(slug);
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

  const notableUnits = useMemo(() => {
    return normalizePlaceNotableUnits(selectedDetail?.place?.notable_units_json ?? []);
  }, [selectedDetail]);

  const selectedRegionId = useMemo(() => {
    const fromDetail = selectedDetail?.place?.leaflet_region_id?.trim() ?? "";
    if (fromDetail) return fromDetail;
    if (!selectedSlug) return null;
    const marker = markers.find((m) => m.slug === selectedSlug);
    const fromMarker = marker?.leaflet_region_id?.trim() ?? "";
    return fromMarker || null;
  }, [markers, selectedDetail, selectedSlug]);

  return (
    <main className="space-y-6">
      <header className="admin-heading">
        <p className="admin-heading__label">Szárnyfeszítő</p>
        <h1 className="admin-heading__title admin-heading__title--large">Helyszínek</h1>
        <p className="admin-heading__description">
          Publikált madármegfigyelő helyszínek Magyarországon. A jelölők szándékosan közelítő helyet mutatnak.
        </p>
      </header>

      {markersError ? (
        <div className="place-panel admin-message admin-message--error">{markersError}</div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section className="place-map">
          {loadingMarkers ? (
            <div className="place-panel admin-stat-card admin-stat-card--note">Térkép betöltése…</div>
          ) : (
            <PlacesMap
              markers={markers}
              layers={layers}
              selectedSlug={selectedSlug}
              selectedRegionId={selectedRegionId}
              onSelect={(slug) => selectSlug(slug)}
              basemap="brand"
              regionVisualization="places_regions_v1"
              markerColorMode="place_type_category_v1"
            />
          )}
        </section>

        <aside className="place-panel place-panel-content rounded-2xl border border-white/40 bg-white/90 p-6 shadow-2xl shadow-black/5 backdrop-blur">
          {!selectedSlug ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-zinc-900">Válassz egy jelölőt</p>
              <p className="text-sm text-zinc-600">
                Kattints egy helyszínre a részletek megnyitásához. Itt csak publikált helyszínek láthatók.
              </p>
            </div>
          ) : loadingDetail ? (
            <p className="text-sm text-zinc-600">Betöltés: {selectedName}…</p>
          ) : detailError ? (
            <p className="text-sm text-red-600">{detailError}</p>
          ) : selectedDetail ? (
            <div className="place-panel">
              <header className="place-panel-header space-y-1">
                <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">
                  {selectedDetail.place.place_type}
                  {selectedDetail.place.county ? ` · ${selectedDetail.place.county}` : ""}
                </p>
                <h2 className="text-2xl font-semibold text-zinc-900">{selectedDetail.place.name}</h2>
                <p className="text-sm text-zinc-600">{selectedDetail.content.variants.teaser}</p>
              </header>

              <section className="place-content mt-5 space-y-3">
                <p className="text-sm text-zinc-800 whitespace-pre-wrap">{selectedDetail.content.variants.short}</p>
                <details className="rounded-xl border border-zinc-200 bg-white p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-zinc-900">Részletek</summary>
                  <div className="mt-3 space-y-3">
                    <p className="text-sm text-zinc-700 whitespace-pre-wrap">{selectedDetail.content.variants.long}</p>
                    <div className="rounded-lg bg-zinc-50 p-3">
                      <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Etika</p>
                      <p className="mt-2 text-sm text-zinc-700 whitespace-pre-wrap">{selectedDetail.content.variants.ethics_tip}</p>
                    </div>
                  </div>
                </details>

                <div className="place-meta grid gap-3">
                  <div className="rounded-lg bg-zinc-50 p-3">
                    <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Mikor érdemes menni</p>
                    <p className="mt-2 text-sm text-zinc-700 whitespace-pre-wrap">{selectedDetail.content.variants.when_to_go}</p>
                  </div>
                  <div className="rounded-lg bg-zinc-50 p-3">
                    <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Praktikus tipp</p>
                    <p className="mt-2 text-sm text-zinc-700 whitespace-pre-wrap">{selectedDetail.content.variants.practical_tip}</p>
                  </div>
                </div>

                {selectedDetail.place_birds.length ? (
                  <div className="place-birds">
                    <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Madarak</p>
                    <ul className="mt-2 space-y-2">
                      {selectedDetail.place_birds.slice(0, 12).map((row) => (
                        <li key={row.id} className="text-sm text-zinc-700">
                          <span className="font-semibold">
                            {row.bird?.name_hu ?? row.pending_bird_name_hu ?? "Ismeretlen"}
                          </span>
                          <span className="text-zinc-500"> · {row.frequency_band}</span>
                          {row.is_iconic ? <span className="text-zinc-500"> · ikonikus</span> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {notableUnits.length ? (
                  <section id="place-notable-units" className="place-notable-units">
                    <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Helyszínek</p>
                    <ul className="mt-2 space-y-3">
                      {notableUnits.map((unit) => (
                        <li
                          key={`${unit.order_index}:${unit.name}`}
                          className="place-notable-units-item rounded-lg bg-zinc-50 p-3"
                        >
                          <p className="place-notable-units-name text-sm font-semibold text-zinc-900">
                            {unit.name}
                          </p>
                          <p className="place-notable-units-note mt-1 text-sm text-zinc-700 whitespace-pre-wrap">
                            {unit.short_note}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-500">
                            {unit.unit_type ? (
                              <span className="rounded bg-white px-2 py-1">
                                {unit.unit_type.replaceAll("_", " ")}
                              </span>
                            ) : null}
                            {unit.distance_text ? (
                              <span className="place-notable-units-distance rounded bg-white px-2 py-1">
                                {unit.distance_text}
                              </span>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </section>
            </div>
          ) : (
            <p className="text-sm text-zinc-600">Nincs elérhető részlet.</p>
          )}
        </aside>
      </div>
    </main>
  );
}
