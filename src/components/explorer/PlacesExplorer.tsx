"use client";

import { useEffect, useMemo, useState } from "react";
import PlacesMap from "@/components/maps/PlacesMap";
import type { PlaceMarker } from "@/types/place";

type PublicPlaceDetail = {
  place: {
    id: string;
    slug: string;
    name: string;
    place_type: string;
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
    notable_units_json: unknown | null;
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
        setMarkersError(payload?.error ?? "Unable to load places.");
        setLoadingMarkers(false);
        return;
      }
      setMarkers((payload?.data?.markers ?? []) as PlaceMarker[]);
      setLoadingMarkers(false);
    };
    run();
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
        setDetailError(payload?.error ?? "Unable to load place.");
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

  return (
    <main className="places-explorer mx-auto w-full max-w-6xl px-6 py-10">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.6em] text-zinc-500">Szárnyfeszítő</p>
        <h1 className="mt-3 text-3xl font-semibold text-zinc-900">Places</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Destination-level birding sites in Hungary. Markers are approximate and intentionally avoid sensitive micro-locations.
        </p>
      </header>

      {markersError ? (
        <div className="place-panel admin-message admin-message--error">{markersError}</div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section className="place-map">
          {loadingMarkers ? (
            <div className="place-panel admin-stat-card admin-stat-card--note">Loading map…</div>
          ) : (
            <PlacesMap
              markers={markers}
              selectedSlug={selectedSlug}
              onSelect={(slug) => selectSlug(slug)}
              basemap="brand"
            />
          )}
        </section>

        <aside className="place-panel place-panel-content rounded-2xl border border-white/40 bg-white/90 p-6 shadow-2xl shadow-black/5 backdrop-blur">
          {!selectedSlug ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-zinc-900">Pick a marker</p>
              <p className="text-sm text-zinc-600">
                Select a place on the map to open its panel. Only published places appear here.
              </p>
            </div>
          ) : loadingDetail ? (
            <p className="text-sm text-zinc-600">Loading {selectedName}…</p>
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
                  <summary className="cursor-pointer text-sm font-semibold text-zinc-900">Read more</summary>
                  <div className="mt-3 space-y-3">
                    <p className="text-sm text-zinc-700 whitespace-pre-wrap">{selectedDetail.content.variants.long}</p>
                    <div className="rounded-lg bg-zinc-50 p-3">
                      <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Ethics</p>
                      <p className="mt-2 text-sm text-zinc-700 whitespace-pre-wrap">{selectedDetail.content.variants.ethics_tip}</p>
                    </div>
                  </div>
                </details>

                <div className="place-meta grid gap-3">
                  <div className="rounded-lg bg-zinc-50 p-3">
                    <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">When to go</p>
                    <p className="mt-2 text-sm text-zinc-700 whitespace-pre-wrap">{selectedDetail.content.variants.when_to_go}</p>
                  </div>
                  <div className="rounded-lg bg-zinc-50 p-3">
                    <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Practical tip</p>
                    <p className="mt-2 text-sm text-zinc-700 whitespace-pre-wrap">{selectedDetail.content.variants.practical_tip}</p>
                  </div>
                </div>

                {selectedDetail.place_birds.length ? (
                  <div className="place-birds">
                    <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Birds</p>
                    <ul className="mt-2 space-y-2">
                      {selectedDetail.place_birds.slice(0, 12).map((row) => (
                        <li key={row.id} className="text-sm text-zinc-700">
                          <span className="font-semibold">{row.bird?.name_hu ?? row.pending_bird_name_hu ?? "Unknown"}</span>
                          <span className="text-zinc-500"> · {row.frequency_band}</span>
                          {row.is_iconic ? <span className="text-zinc-500"> · iconic</span> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </section>
            </div>
          ) : (
            <p className="text-sm text-zinc-600">No details available.</p>
          )}
        </aside>
      </div>
    </main>
  );
}
