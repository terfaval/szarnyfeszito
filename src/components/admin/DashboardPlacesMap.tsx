"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

import PlacesMap from "@/components/maps/PlacesMap";
import { HUNGARY_FULL_BOUNDS_V1 } from "@/components/maps/viewPresets";
import type { PlacesMapLayersV1 } from "@/types/placesMap";
import type { PlaceMarker } from "@/types/place";
import styles from "./DashboardPlacesMap.module.css";

const Tooltip = dynamic(() => import("react-leaflet").then((module) => module.Tooltip), {
  ssr: false,
  loading: () => null,
});

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

export type DashboardPlacesMapProps = {
  markers: PlaceMarker[];
  layers: PlacesMapLayersV1 | null;
  detailApiBasePath?: string;
  birdLinkBasePath?: string;
  birdLinkJoiner?: string;
  birdLinkKey?: "id" | "slug";
  birdsIndexHref?: string;
  placeLinkBasePath?: string;
  placeLinkJoiner?: string;
  placeLinkKey?: "id" | "slug";
};

function joinHref(basePath: string, joiner: string, value: string) {
  return `${basePath}${joiner}${encodeURIComponent(value)}`;
}

export default function DashboardPlacesMap({
  markers,
  layers,
  detailApiBasePath = "/api/admin/dashboard/places",
  birdLinkBasePath = "/admin/birds",
  birdLinkJoiner = "/",
  birdLinkKey = "id",
  birdsIndexHref = "/admin/birds",
  placeLinkBasePath = "/admin/places",
  placeLinkJoiner = "/",
  placeLinkKey = "id",
}: DashboardPlacesMapProps) {
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const [pinnedSlug, setPinnedSlug] = useState<string | null>(null);
  const [detail, setDetail] = useState<HoverPlaceDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboardTopInsetPx, setDashboardTopInsetPx] = useState<number>(0);

  const cacheRef = useRef<Map<string, HoverPlaceDetail>>(new Map());
  const activeSlug = pinnedSlug ?? hoveredSlug;
  const panelOpen = Boolean(pinnedSlug);

  useEffect(() => {
    const readPx = (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return 0;
      const num = Number.parseFloat(trimmed);
      return Number.isFinite(num) ? num : 0;
    };

    const update = () => {
      const computed = window.getComputedStyle(document.documentElement);
      const topBar = readPx(computed.getPropertyValue("--admin-dashboard-topbar-offset"));
      const shellPad = readPx(computed.getPropertyValue("--admin-shell-pad-block"));
      setDashboardTopInsetPx(topBar + shellPad);
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

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
      const response = await fetch(`${detailApiBasePath}/${encodeURIComponent(activeSlug)}`, {
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
    const boundsOptions = useMemo(() => {
      const inset = Math.max(0, dashboardTopInsetPx);
      return {
        padding: [18, 18] as [number, number],
        paddingTopLeft: [18, Math.round(inset + 18)] as [number, number],
        paddingBottomRight: [18, 18] as [number, number],
      };
    }, [dashboardTopInsetPx]);

  return (
    <section className={styles.section} aria-label="Published places map">
      <div className={styles.layout} style={{ position: "relative" }}>
          <PlacesMap
            markers={markers}
            layers={layers}
            selectedSlug={activeSlug}
            selectedRegionId={selectedRegionId}
            layoutVariant="fill_parent_v1"
            basemap="bird"
            regionVisualization="places_regions_v1"
            markerColorMode="place_type_category_v1"
            interactionMode="bounded_hu_v1"
            toolBarVariant="bottom_right_v1"
            defaultBounds={HUNGARY_FULL_BOUNDS_V1}
            defaultBoundsOptions={boundsOptions}
            showResetViewButton
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
                className="sf-map-tooltip--chrome-less"
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
                            <Link
                              key={bird.id}
                              href={joinHref(
                                birdLinkBasePath,
                                birdLinkJoiner,
                                birdLinkKey === "slug" ? bird.slug : bird.id
                              )}
                              className={styles.tooltipBirdLink}
                            >
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
                        <Link
                          href={joinHref(
                            placeLinkBasePath,
                            placeLinkJoiner,
                            placeLinkKey === "slug" ? detail.place.slug : detail.place.id
                          )}
                          className={styles.tooltipFooterLink}
                        >
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
                  <Link
                    href={joinHref(
                      placeLinkBasePath,
                      placeLinkJoiner,
                      placeLinkKey === "slug" ? detail.place.slug : detail.place.id
                    )}
                    className="btn btn--secondary"
                  >
                    Helyszín
                  </Link>
                ) : null}
                <Link href={birdsIndexHref} className="btn btn--ghost">
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
                          <Link
                            key={bird.id}
                            href={joinHref(
                              birdLinkBasePath,
                              birdLinkJoiner,
                              birdLinkKey === "slug" ? bird.slug : bird.id
                            )}
                            className={styles.tooltipBirdLink}
                          >
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
