import Link from "next/link";
import PublicShell from "@/ui/components/PublicShell";
import { Card } from "@/ui/components/Card";
import DashboardPlacesMap from "@/components/admin/DashboardPlacesMap";
import BirdIcon from "@/components/admin/BirdIcon";
import { listBirds } from "@/lib/birdService";
import { listPublishedPlaceDashboardMarkers, listPublishedPlacesByPrimaryType } from "@/lib/placeService";
import { buildPlacesMapLayersV1 } from "@/lib/placesMapLayers";
import { supabaseServerClient } from "@/lib/supabaseServerClient";
import { getCurrentSeasonKey } from "@/lib/season";
import { getSignedImageUrl, listApprovedCurrentIconicImagesForBirds } from "@/lib/imageService";
import { getSignedApprovedHabitatTileUrlsByAssetKeys } from "@/lib/habitatStockAssetService";
import type { PlaceType } from "@/types/place";

export const metadata = {
  title: "Szárnyfeszítő",
  description: "Útikalauz szárnyaló kalandoroknak",
};

export const dynamic = "force-dynamic";

type SpotlightPlace = { id: string; name: string; slug: string };
type SpotlightBird = {
  id: string;
  slug: string;
  name_hu: string;
  habitatIconSrc: string | null;
  places: SpotlightPlace[];
  bestRank: number;
};

export default async function Home() {
  const publishedBirds = await listBirds({ status: "published" });
  const recentBirds = publishedBirds.slice(0, 5);
  const recentBirdIds = recentBirds.map((bird) => bird.id);

  const recentHabitatKeys = recentBirds
    .map((bird) => (Array.isArray(bird.habitat_stock_asset_keys) ? bird.habitat_stock_asset_keys[0] : ""))
    .filter((k): k is string => typeof k === "string" && k.trim().length > 0);
  const recentSignedHabitatTilesByKey = await getSignedApprovedHabitatTileUrlsByAssetKeys(recentHabitatKeys);

  const iconicImages = await listApprovedCurrentIconicImagesForBirds(recentBirdIds);
  const iconicPreviewByBirdId = new Map<string, string>();
  await Promise.all(
    iconicImages.map(async (image) => {
      const signedUrl = await getSignedImageUrl(image.storage_path);
      if (signedUrl) {
        iconicPreviewByBirdId.set(image.entity_id, signedUrl);
      }
    })
  );

  const publishedMarkers = await listPublishedPlaceDashboardMarkers();
  const dashboardLayers = await buildPlacesMapLayersV1({
    placeRegionIds: publishedMarkers.map((m) => m.leaflet_region_id ?? "").filter(Boolean),
    includeCountries: false,
  });

  const currentSeason = getCurrentSeasonKey();
  const currentSeasonLabel =
    currentSeason === "spring"
      ? "Tavasz"
      : currentSeason === "summer"
      ? "Nyár"
      : currentSeason === "autumn"
      ? "Ősz"
      : "Tél";

  const spotlightGroups: Array<{
    key: "water" | "forest" | "mountain";
    label: string;
    placeTypes: PlaceType[];
  }> = [
    {
      key: "water",
      label: "Vízpart",
      placeTypes: [
        "lake",
        "river",
        "fishpond",
        "reservoir",
        "marsh",
        "reedbed",
        "salt_lake",
        "urban_waterfront",
      ],
    },
    { key: "forest", label: "Erdő", placeTypes: ["forest_edge", "protected_area"] },
    { key: "mountain", label: "Hegység", placeTypes: ["mountain_area"] },
  ];

  const publishedPlacesByGroup = await Promise.all(
    spotlightGroups.map(async (group) => ({
      key: group.key,
      label: group.label,
      places: await listPublishedPlacesByPrimaryType(group.placeTypes),
    }))
  );

  const spotlightBirdsByGroup = new Map<string, SpotlightBird[]>();
  const habitatKeyByBirdId = new Map<string, string>();

  for (const group of publishedPlacesByGroup) {
    const placeById = new Map(group.places.map((place) => [place.id, place] as const));
    const placeIds = Array.from(placeById.keys());
    if (placeIds.length === 0) {
      spotlightBirdsByGroup.set(group.key, []);
      continue;
    }

    type Row = {
      place_id: string;
      rank: number;
      visible_in_spring: boolean;
      visible_in_summer: boolean;
      visible_in_autumn: boolean;
      visible_in_winter: boolean;
      bird: { id: string; slug: string; name_hu: string; status?: string; habitat_stock_asset_keys?: string[] } | null;
    };

    const { data, error } = await supabaseServerClient
      .from("place_birds")
      .select(
        "place_id,rank,visible_in_spring,visible_in_summer,visible_in_autumn,visible_in_winter,bird:birds(id,slug,name_hu,status,habitat_stock_asset_keys)"
      )
      .eq("review_status", "approved")
      .not("bird_id", "is", null)
      .in("place_id", placeIds)
      .order("rank", { ascending: true })
      .limit(600);

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as unknown as Row[];
    const seasonalRows = rows.filter((row) => {
      if (!row.bird || row.bird.status !== "published") return false;
      if (currentSeason === "spring") return row.visible_in_spring;
      if (currentSeason === "summer") return row.visible_in_summer;
      if (currentSeason === "autumn") return row.visible_in_autumn;
      return row.visible_in_winter;
    });

    const byBirdId = new Map<string, SpotlightBird>();
    for (const row of seasonalRows) {
      const bird = row.bird;
      if (!bird) continue;
      const place = placeById.get(row.place_id);
      if (!place) continue;

      const existing = byBirdId.get(bird.id);
      if (!existing) {
        byBirdId.set(bird.id, {
          id: bird.id,
          slug: bird.slug,
          name_hu: bird.name_hu,
          habitatIconSrc: null,
          places: [{ id: place.id, name: place.name, slug: place.slug }],
          bestRank: row.rank,
        });
      } else {
        existing.bestRank = Math.min(existing.bestRank, row.rank);
        if (!existing.places.some((p) => p.id === place.id)) {
          existing.places.push({ id: place.id, name: place.name, slug: place.slug });
          if (existing.places.length > 3) {
            existing.places = existing.places.slice(0, 3);
          }
        }
      }

      const habitatKey = bird.habitat_stock_asset_keys?.[0];
      if (habitatKey) {
        habitatKeyByBirdId.set(bird.id, habitatKey);
      }
    }

    const list = Array.from(byBirdId.values())
      .sort((a, b) => a.bestRank - b.bestRank || b.places.length - a.places.length || a.name_hu.localeCompare(b.name_hu))
      .slice(0, 7);

    spotlightBirdsByGroup.set(group.key, list);
  }

  const spotlightHabitatTiles = await getSignedApprovedHabitatTileUrlsByAssetKeys(
    Array.from(new Set(Array.from(habitatKeyByBirdId.values())))
  );

  for (const group of spotlightGroups) {
    const list = spotlightBirdsByGroup.get(group.key) ?? [];
    list.forEach((bird) => {
      const key = habitatKeyByBirdId.get(bird.id) ?? null;
      bird.habitatIconSrc = key ? spotlightHabitatTiles.get(key) ?? null : null;
    });
    spotlightBirdsByGroup.set(group.key, list);
  }

  return (
    <PublicShell>
      <section className="admin-stack">
        <DashboardPlacesMap markers={publishedMarkers} layers={dashboardLayers} />

        <Card className="stack">
          <header className="admin-heading">
            <p className="admin-heading__label">Helyszínek</p>
            <h2 className="admin-heading__title admin-heading__title--large">Élőhely spotlights</h2>
            <p className="admin-heading__description">
              {currentSeasonLabel} időszakban megfigyelhető madarak publikált helyszínek alapján.
            </p>
          </header>

          <div className="grid gap-4 md:grid-cols-3">
            {spotlightGroups.map((group) => {
              const birdsForGroup = spotlightBirdsByGroup.get(group.key) ?? [];
              return (
                <div key={group.key} className="admin-stat-card">
                  <p className="admin-stat-label">{group.label}</p>
                  {birdsForGroup.length ? (
                    <div className="mt-3 space-y-3">
                      {birdsForGroup.map((bird) => (
                        <div key={bird.id} className="flex items-start gap-3">
                          {bird.habitatIconSrc ? (
                            <img
                              src={bird.habitatIconSrc}
                              alt=""
                              className="h-10 w-10 shrink-0 rounded-xl p-2"
                              style={{ border: "1px solid var(--line)", background: "var(--panel-2)" }}
                            />
                          ) : (
                            <div
                              className="h-10 w-10 shrink-0 rounded-xl"
                              style={{ border: "1px solid var(--line)", background: "var(--panel-2)" }}
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <Link href={`/birds/${bird.slug}`} className="admin-nav-link">
                              {bird.name_hu}
                            </Link>
                            <div className="mt-1 flex flex-wrap gap-2">
                              {bird.places.map((place) => (
                                <Link
                                  key={place.id}
                                  href={`/places?place=${place.slug}`}
                                  className="admin-note-small hover:underline"
                                >
                                  {place.name}
                                </Link>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="admin-stat-note mt-3">Még nincs elérhető lista.</p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="stack">
          <header className="admin-heading">
            <p className="admin-heading__label">Felfedezés</p>
            <h2 className="admin-heading__title admin-heading__title--large">Kezdd itt</h2>
            <p className="admin-heading__description">
              Válassz madarat vagy helyszínt, és indulhat a megfigyelés.
            </p>
          </header>

          <div className="grid gap-4 md:grid-cols-2">
            <Link className="admin-link-card stack" href="/birds">
              <p className="admin-link-card__title">Madarak</p>
              <p className="admin-link-card__description">Publikált fajok, szűrőkkel és élőhely háttérrel.</p>
            </Link>

            <Link className="admin-link-card stack" href="/places/list">
              <p className="admin-link-card__title">Helyszínek</p>
              <p className="admin-link-card__description">Publikált helyszínek grides nézetben.</p>
            </Link>
          </div>
        </Card>

        <Card className="stack">
          <header className="admin-heading inline-flex items-start justify-between gap-3">
            <div>
              <p className="admin-heading__label">Madarak</p>
              <h2 className="admin-heading__title admin-heading__title--large">Friss publikált fajok</h2>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <Link className="admin-nav-link" href="/birds">
                Összes madár
              </Link>
            </div>
          </header>

          <div className="space-y-3">
            {recentBirds.length === 0 && <p className="admin-stat-note">Még nincs publikált madár.</p>}

            {recentBirds.map((bird) => (
              <Link key={bird.id} href={`/birds/${bird.slug}`} className="admin-list-link">
                <div className="admin-list-details">
                  <div className="admin-bird-list-grid">
                    <BirdIcon
                      habitatSrc={recentSignedHabitatTilesByKey.get(bird.habitat_stock_asset_keys?.[0] ?? "") ?? null}
                      iconicSrc={iconicPreviewByBirdId.get(bird.id) ?? null}
                      showHabitatBackground
                      size={76}
                    />
                    <div className="admin-bird-text-cell">
                      <p className="admin-list-title">{bird.name_hu}</p>
                      <p className="admin-list-meta">{bird.slug}</p>
                      <p className="admin-list-date">
                        Frissítve{" "}
                        {new Intl.DateTimeFormat("hu-HU", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(bird.updated_at))}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="admin-inline-actions">
                  <span className="admin-list-action">Megnyitás</span>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </section>
    </PublicShell>
  );
}
