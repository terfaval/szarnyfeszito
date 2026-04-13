"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

import PlacesMap from "@/components/maps/PlacesMap";
import PlaceCardShort from "@/components/shared/PlaceCardShort";
import BirdIcon from "@/components/shared/BirdIcon";
import PlaceTypeFilter from "@/components/maps/PlaceTypeFilter";
import { HUNGARY_FULL_BOUNDS_V1 } from "@/components/maps/viewPresets";
import type { PlacesMapLayersV1 } from "@/types/placesMap";
import type { PlaceMarker, PlaceType } from "@/types/place";
import { PLACE_TYPE_LABELS, sortPlaceTypes } from "@/lib/placeTypeMeta";
import { resolvePanelSide, type PanelSide } from "@/lib/mapPanelSide";
import { buildPlaceMetaLine } from "@/lib/placePanelMeta";
import { Icon } from "@/ui/icons/Icon";
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
    place_type: PlaceType;
    county: string | null;
    nearest_city: string | null;
    habitat_src: string | null;
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
    name_latin: string;
    iconic_src: string | null;
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
  useToolbarFilter?: boolean;
  edgeToEdge?: boolean;
  offsetTop?: boolean;
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
  useToolbarFilter = false,
  edgeToEdge = true,
  offsetTop = true,
}: DashboardPlacesMapProps) {
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const [pinnedSlug, setPinnedSlug] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<PlaceType | "all">("all");
  const [detail, setDetail] = useState<HoverPlaceDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboardTopInsetPx, setDashboardTopInsetPx] = useState<number>(0);
  const [panelSide, setPanelSide] = useState<PanelSide>("right");

  const cacheRef = useRef<Map<string, HoverPlaceDetail>>(new Map());
  const activeSlug = pinnedSlug ?? hoveredSlug;

  const visibleMarkers = useMemo(() => {
    if (typeFilter === "all") return markers;
    return markers.filter((marker) => marker.place_type === typeFilter);
  }, [markers, typeFilter]);

  const availableTypes = useMemo(() => sortPlaceTypes(markers.map((marker) => marker.place_type)), [markers]);

  const filteredActiveSlug =
    activeSlug && visibleMarkers.some((marker) => marker.slug === activeSlug) ? activeSlug : null;
  const panelOpen = Boolean(
    pinnedSlug && visibleMarkers.some((marker) => marker.slug === pinnedSlug)
  );
  const overlaySlug = pinnedSlug && visibleMarkers.some((marker) => marker.slug === pinnedSlug) ? pinnedSlug : null;
  const cardDetail = overlaySlug ? detail : null;
  const cardLoading = overlaySlug ? loading : false;
  const cardError = overlaySlug ? error : null;
  const panelDetail = overlaySlug && detail?.place?.slug === overlaySlug ? detail : null;
  const panelHabitatSrc = panelDetail?.place?.habitat_src ?? null;

  const regionSlugById = useMemo(() => {
    const map = new Map<string, string>();
    visibleMarkers.forEach((marker) => {
      const regionId = (marker.leaflet_region_id ?? "").trim();
      if (!regionId) return;
      if (!map.has(regionId)) {
        map.set(regionId, marker.slug);
      }
    });
    return map;
  }, [visibleMarkers]);

  const handleRegionHover = (slug: string | null) => {
    if (slug) {
      setHoveredSlug(slug);
      return;
    }
    if (!pinnedSlug) {
      setHoveredSlug(null);
    }
  };

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
    if (!pinnedSlug) {
      setLoading(false);
      setError(null);
      setDetail(null);
      return;
    }

    const ctrl = new AbortController();
    const run = async () => {
      try {
        const cached = cacheRef.current.get(pinnedSlug);
        if (cached) {
          setDetail(cached);
          setError(null);
          return;
        }

        setLoading(true);
        setError(null);
        const response = await fetch(`${detailApiBasePath}/${encodeURIComponent(pinnedSlug)}`, {
          signal: ctrl.signal,
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          setError(payload?.error ?? "Nem sikerült betölteni a helyszínt.");
          setDetail(null);
          return;
        }
        const next = payload?.data as HoverPlaceDetail;
        cacheRef.current.set(pinnedSlug, next);
        setDetail(next);
      } catch (err) {
        if (ctrl.signal.aborted) {
          return;
        }
        setError(err instanceof Error ? err.message : "Nem sikerült betölteni a helyszínt.");
        setDetail(null);
      } finally {
        setLoading(false);
      }
    };

    run();
    return () => ctrl.abort();
  }, [detailApiBasePath, pinnedSlug]);

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

  const markerBySlug = useMemo(() => new Map(visibleMarkers.map((m) => [m.slug, m])), [visibleMarkers]);
  const activeMarker = filteredActiveSlug ? markerBySlug.get(filteredActiveSlug) ?? null : null;
  const selectedRegionId = activeMarker?.leaflet_region_id?.trim() || null;
  const boundsOptions = useMemo(() => {
    const inset = Math.max(0, dashboardTopInsetPx);
    const extraTopPadding = 24;
    return {
      padding: [18, 18] as [number, number],
      paddingTopLeft: [18, Math.round(inset + extraTopPadding + 18)] as [number, number],
      paddingBottomRight: [18, 18] as [number, number],
    };
  }, [dashboardTopInsetPx]);

  const defaultPanBy = useMemo(() => {
    const inset = Math.max(0, dashboardTopInsetPx);
    if (inset == 0) return [0, 0] as [number, number];
    return [0, Math.round(inset * 0.6)] as [number, number];
  }, [dashboardTopInsetPx]);

  const showInlineFilterControls = !useToolbarFilter;

  return (
    <section
      className={[
        styles.section,
        edgeToEdge ? "" : styles.sectionContained,
        offsetTop ? "" : styles.sectionNoOffset,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="Published places map"
    >
      <div className={styles.layout} style={{ position: "relative" }}>
          <PlacesMap
            markers={visibleMarkers}
            layers={layers}
            selectedSlug={filteredActiveSlug}
            selectedRegionId={selectedRegionId}
            layoutVariant="fill_parent_v1"
            basemap="bird"
            regionVisualization="places_regions_v1"
            markerColorMode="place_type_category_v1"
            interactionMode="bounded_hu_v1"
            toolBarVariant="bottom_right_v1"
            toolBarTopControls={
              useToolbarFilter && availableTypes.length > 0 ? (
                <PlaceTypeFilter
                  variant="toolbar"
                  label="Szűrés"
                  value={typeFilter}
                  onChange={setTypeFilter}
                  availableTypes={availableTypes}
                />
              ) : undefined
            }
            defaultPanBy={defaultPanBy}
            regionSlugById={regionSlugById}
            onRegionHover={handleRegionHover}
            defaultBounds={HUNGARY_FULL_BOUNDS_V1}
            defaultBoundsOptions={boundsOptions}
            showResetViewButton
            onSelect={(slug, meta) => {
              setPinnedSlug((prev) => (prev === slug ? null : slug));
              if (meta) {
                setPanelSide(
                  resolvePanelSide({
                    containerX: meta.containerPoint.x,
                    containerWidth: meta.mapSize.x,
                  })
                );
              }
            }}
            onMapClick={() => {
              if (pinnedSlug) {
                setPinnedSlug(null);
              }
            }}
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
            const cachedDetail = cacheRef.current.get(marker.slug) ?? null;
            const tooltipDetail = cachedDetail ?? (detail?.place?.slug === marker.slug ? detail : null);
            const tooltipName = tooltipDetail?.place?.name ?? marker.name;
            const tooltipRegion =
              tooltipDetail?.place?.county ?? tooltipDetail?.place?.nearest_city ?? "";
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
                  <p className={styles.tooltipName}>{tooltipName}</p>
                  {tooltipRegion ? <p className={styles.tooltipMeta}>{tooltipRegion}</p> : null}
                </div>
              </Tooltip>
            );
          }}
        />

        <div className={styles.overlay}>
          {showInlineFilterControls ? (
            <div className={styles.overlayControls}>
              <PlaceTypeFilter
                className={styles.filterControl}
                value={typeFilter}
                onChange={setTypeFilter}
                label="Típus"
                availableTypes={availableTypes}
              />
              {typeFilter !== "all" ? (
                <button type="button" className={styles.clearFilter} onClick={() => setTypeFilter("all")}>
                  Szűrés törlése
                </button>
              ) : null}
            </div>
          ) : null}
          <div className={styles.overlayCardWrapper}>
            {!panelOpen ? (
              cardDetail ? (
                <PlaceCardShort
                  className={styles.placeCard}
                  place={cardDetail.place}
                  shortDescription={cardDetail.content.short}
                  birds={cardDetail.birds.map((bird) => ({
                    id: bird.id,
                    slug: bird.slug,
                    name_hu: bird.name_hu,
                    iconicSrc: bird.iconic_src,
                  }))}
                  placeLinkBasePath={placeLinkBasePath}
                  placeLinkJoiner={placeLinkJoiner}
                  birdLinkBasePath={birdLinkBasePath}
                  birdLinkJoiner={birdLinkJoiner}
                  birdLinkKey={birdLinkKey}
                  onClose={() => {
                    setHoveredSlug(null);
                    setPinnedSlug(null);
                  }}
                />
              ) : (
                <div className={styles.overlayCard}>
                  <p className={styles.overlayTitle}>
                    {cardError ? "Hiba" : cardLoading ? "Betöltés…" : "Published places"}
                  </p>
                  <p className={styles.overlaySubtitle}>
                    {cardError ? cardError : cardLoading ? "Betöltés…" : "Magyarország"}
                  </p>
                </div>
              )
            ) : null}
          </div>
        </div>
      </div>

      {panelOpen && filteredActiveSlug ? (
        <div
          className={[
            styles.floatingPanel,
            panelSide === "left" ? styles.floatingPanelLeft : styles.floatingPanelRight,
          ]
            .filter(Boolean)
            .join(" ")}
          role="dialog"
          aria-modal="false"
          aria-label="Helyszín részletek"
        >
          <header className={styles.detailHeader}>
            <div>
              <p className={styles.detailName}>{panelDetail?.place?.name ?? activeMarker?.name ?? ""}</p>
              {panelDetail ? (
                <p className={styles.detailMeta}>
                  {buildPlaceMetaLine({
                    typeLabel:
                      PLACE_TYPE_LABELS[panelDetail.place.place_type] ??
                      PLACE_TYPE_LABELS[activeMarker?.place_type ?? "lake"] ??
                      "",
                    county: panelDetail.place.county ?? null,
                    nearestCity: panelDetail.place.nearest_city ?? null,
                  })}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              className={styles.detailClose}
              onClick={() => setPinnedSlug(null)}
              aria-label="Bezárás"
            >
              <Icon name="x" size={18} />
            </button>
          </header>

          <div className={styles.detailBody}>
            {loading ? <p className={styles.tooltipCopy}>Betöltés…</p> : null}
            {error ? <p className={styles.tooltipCopy}>{error}</p> : null}

            {!loading && !error && panelDetail ? (
              <>
                {panelDetail.content.short ? <p className={styles.tooltipCopy}>{panelDetail.content.short}</p> : null}

                <div>
                  <p className={styles.tooltipSectionLabel}>
                    Szezon · {seasonLabelHu(panelDetail.content.season)}
                  </p>
                  {panelDetail.content.seasonal_snippet ? (
                    <p className={styles.tooltipCopy}>{panelDetail.content.seasonal_snippet}</p>
                  ) : (
                    <p className={styles.tooltipCopy}>Nincs szezon snippet.</p>
                  )}
                </div>

                <div>
                  <p className={styles.tooltipSectionLabel}>Top madarak</p>
                  {panelDetail.birds.length ? (
                    <div className={styles.detailBirdList}>
                      {panelDetail.birds.slice(0, 6).map((bird) => (
                        <Link
                          key={bird.id}
                          href={joinHref(
                            birdLinkBasePath,
                            birdLinkJoiner,
                            birdLinkKey === "slug" ? bird.slug : bird.id
                          )}
                          className={styles.detailBirdRow}
                        >
                          <BirdIcon
                            iconicSrc={bird.iconic_src}
                            habitatSrc={panelHabitatSrc}
                            showHabitatBackground
                            size={44}
                            className={styles.detailBirdIconShell}
                          />
                          <span className={styles.detailBirdText}>
                            <span className={styles.detailBirdName}>{bird.name_hu}</span>
                            <span className={styles.detailBirdLatin}>{bird.name_latin}</span>
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
      ) : null}
    </section>
  );
}
