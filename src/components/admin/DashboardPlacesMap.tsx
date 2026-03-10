"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Tooltip } from "react-leaflet";

import PlacesMap from "@/components/maps/PlacesMap";
import type { PlacesMapLayersV1 } from "@/types/placesMap";
import type { PlaceMarker } from "@/types/place";
import styles from "./DashboardPlacesMap.module.css";

type HoverPlaceDetail = {
  place: {
    id: string;
    slug: string;
    name: string;
    place_type: string;
    county: string | null;
    nearest_city: string | null;
  };
  content: {
    short: string;
    seasonal_snippet: string;
    season: "spring" | "summer" | "autumn" | "winter";
  };
  birds: Array<{
    id: string;
    slug: string;
    name_hu: string;
    rank: number;
    frequency_band: string;
    is_iconic: boolean;
  }>;
};

function seasonLabelHu(season: HoverPlaceDetail["content"]["season"]) {
  if (season === "spring") return "Tavasz";
  if (season === "summer") return "Nyár";
  if (season === "autumn") return "Ősz";
  return "Tél";
}

export default function DashboardPlacesMap({
  markers,
  layers,
}: {
  markers: PlaceMarker[];
  layers: PlacesMapLayersV1 | null;
}) {
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const [pinnedSlug, setPinnedSlug] = useState<string | null>(null);
  const [detail, setDetail] = useState<HoverPlaceDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cacheRef = useRef<Map<string, HoverPlaceDetail>>(new Map());
  const activeSlug = pinnedSlug ?? hoveredSlug;
  const panelOpen = Boolean(pinnedSlug);

  useEffect(() => {
    if (!activeSlug) return;

    const ctrl = new AbortController();
    const run = async () => {
      const cached = cacheRef.current.get(activeSlug);
      if (cached) {
        setDetail(cached);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      const response = await fetch(`/api/admin/dashboard/places/${encodeURIComponent(activeSlug)}`, {
        signal: ctrl.signal,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(payload?.error ?? "Nem sikerült betölteni a helyszínt.");
        setDetail(null);
        setLoading(false);
        return;
      }
      const next = payload?.data as HoverPlaceDetail;
      cacheRef.current.set(activeSlug, next);
      setDetail(next);
      setLoading(false);
    };

    run().catch((err) => {
      if (ctrl.signal.aborted) return;
      setError(err instanceof Error ? err.message : "Nem sikerült betölteni a helyszínt.");
      setDetail(null);
      setLoading(false);
    });

    return () => ctrl.abort();
  }, [activeSlug]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      if (pinnedSlug) {
        setPinnedSlug(null);
        return;
      }

      if (hoveredSlug) {
        setHoveredSlug(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hoveredSlug, pinnedSlug]);

  const markerBySlug = useMemo(() => new Map(markers.map((m) => [m.slug, m])), [markers]);
  const activeMarker = activeSlug ? markerBySlug.get(activeSlug) ?? null : null;
  const selectedRegionId = activeMarker?.leaflet_region_id?.trim() || null;

  return (
    <section className={styles.section} aria-label="Published places map">
      <div className={styles.layout} style={{ position: "relative" }}>
        <PlacesMap
          markers={markers}
          layers={layers}
          selectedSlug={activeSlug}
          selectedRegionId={selectedRegionId}
          basemap="bird"
          regionVisualization="places_regions_v1"
          markerColorMode="water_highlight_v1"
          onSelect={(slug) => setPinnedSlug((prev) => (prev === slug ? null : slug))}
          markerEventHandlers={(marker) => ({
            mouseover: () => setHoveredSlug(marker.slug),
            mouseout: () => {
              if (!pinnedSlug) {
                setHoveredSlug(null);
              }
            },
          })}
          renderMarkerChildren={({ marker, isSelected }) => {
            if (!isSelected) return null;
            if (panelOpen) return null;
            const isPinned = pinnedSlug === marker.slug;
            return (
              <Tooltip
                className="sf-place-tooltip"
                direction="top"
                offset={[0, -10]}
                opacity={1}
                permanent={Boolean(isPinned)}
                interactive
              >
                <div className={styles.tooltipCard}>
                  <p className={styles.tooltipMeta}>
                    {detail?.place?.place_type ?? marker.place_type}
                    {detail?.place?.county ? ` · ${detail.place.county}` : ""}
                    {detail?.place?.nearest_city ? ` · ${detail.place.nearest_city}` : ""}
                  </p>
                  <p className={styles.tooltipName}>{detail?.place?.name ?? marker.name}</p>

                  {loading ? (
                    <p className={styles.tooltipCopy}>Betöltés…</p>
                  ) : error ? (
                    <p className={styles.tooltipCopy}>{error}</p>
                  ) : detail ? (
                    <>
                      {detail.content.short ? <p className={styles.tooltipCopy}>{detail.content.short}</p> : null}

                      <p className={styles.tooltipSectionLabel}>Szezon · {seasonLabelHu(detail.content.season)}</p>
                      {detail.content.seasonal_snippet ? (
                        <p className={styles.tooltipCopy}>{detail.content.seasonal_snippet}</p>
                      ) : (
                        <p className={styles.tooltipCopy}>Nincs szezon snippet.</p>
                      )}

                      <p className={styles.tooltipSectionLabel}>Top madarak</p>
                      {detail.birds.length ? (
                        <div className={styles.tooltipBirdList}>
                          {detail.birds.slice(0, 5).map((bird) => (
                            <Link key={bird.id} href={`/admin/birds/${bird.id}`} className={styles.tooltipBirdLink}>
                              <span className={styles.tooltipBirdName}>{bird.name_hu}</span>
                              <span className={styles.tooltipBirdMeta}>
                                #{bird.rank} · {bird.frequency_band}
                              </span>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <p className={styles.tooltipCopy}>Nincs publikált madár a szezonban ehhez a helyhez.</p>
                      )}

                      <div className={styles.tooltipFooter}>
                        <Link href={`/admin/places/${detail.place.id}`} className={styles.tooltipFooterLink}>
                          Helyszín
                        </Link>
                      </div>
                    </>
                  ) : null}
                </div>
              </Tooltip>
            );
          }}
        />

        <div className={styles.overlay} aria-hidden>
          <div className={styles.overlayCard}>
            <p className={styles.overlayTitle}>Published places</p>
            <p className={styles.overlaySubtitle}>{activeMarker ? activeMarker.name : "Magyarország"}</p>
          </div>
        </div>
      </div>

      {panelOpen && activeSlug ? (
        <div className={styles.detailOverlay} role="dialog" aria-modal="true" aria-label="Helyszín részletek">
          <button
            type="button"
            className={styles.detailBackdrop}
            onClick={() => setPinnedSlug(null)}
            aria-label="Close"
          />
          <div className={styles.detailPanel}>
            <header className={styles.detailHeader}>
              <div>
                <p className={styles.detailTitle}>
                  {detail?.place?.place_type ?? activeMarker?.place_type ?? "Place"}
                  {detail?.place?.county ? ` · ${detail.place.county}` : ""}
                  {detail?.place?.nearest_city ? ` · ${detail.place.nearest_city}` : ""}
                </p>
                <p className={styles.detailName}>{detail?.place?.name ?? activeMarker?.name ?? ""}</p>
              </div>
              <div className={styles.detailActions}>
                {detail?.place?.id ? (
                  <Link href={`/admin/places/${detail.place.id}`} className="btn btn--secondary">
                    Helyszín
                  </Link>
                ) : null}
                <Link href="/admin/birds" className="btn btn--ghost">
                  Madarak
                </Link>
                <button type="button" className="btn btn--ghost" onClick={() => setPinnedSlug(null)}>
                  Bezárás (Esc)
                </button>
              </div>
            </header>

            <div className={styles.detailBody}>
              {loading ? <p className={styles.tooltipCopy}>Betöltés…</p> : null}
              {error ? <p className={styles.tooltipCopy}>{error}</p> : null}

              {!loading && !error && detail ? (
                <>
                  {detail.content.short ? <p className={styles.tooltipCopy}>{detail.content.short}</p> : null}

                  <div>
                    <p className={styles.tooltipSectionLabel}>Szezon · {seasonLabelHu(detail.content.season)}</p>
                    {detail.content.seasonal_snippet ? (
                      <p className={styles.tooltipCopy}>{detail.content.seasonal_snippet}</p>
                    ) : (
                      <p className={styles.tooltipCopy}>Nincs szezon snippet.</p>
                    )}
                  </div>

                  <div>
                    <p className={styles.tooltipSectionLabel}>Top madarak</p>
                    {detail.birds.length ? (
                      <div className={styles.tooltipBirdList}>
                        {detail.birds.slice(0, 5).map((bird) => (
                          <Link key={bird.id} href={`/admin/birds/${bird.id}`} className={styles.tooltipBirdLink}>
                            <span className={styles.tooltipBirdName}>{bird.name_hu}</span>
                            <span className={styles.tooltipBirdMeta}>
                              #{bird.rank} · {bird.frequency_band}
                            </span>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p className={styles.tooltipCopy}>Nincs publikált madár a szezonban ehhez a helyhez.</p>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
