import { unstable_cache } from "next/cache";

import { listPublishedBirdsForHabitatAssetsRefill } from "@/lib/birdService";
import {
  computeHabitatStockAssetKeysForPlaceTypes,
  getSignedApprovedHabitatTileUrlsByAssetKeys,
  listHabitatStockAssets,
} from "@/lib/habitatStockAssetService";
import { SIGNED_IMAGE_URL_TTL_SECONDS } from "@/lib/imageSigning";
import { getSignedImageUrl, listApprovedCurrentIconicImagesForBirds } from "@/lib/imageService";
import { buildPlacesMapLayersV1 } from "@/lib/placesMapLayers";
import { listPublishedPlaceDashboardMarkers, listPublishedPlacesByPrimaryType } from "@/lib/placeService";
import { getCurrentSeasonKey, type SeasonKey } from "@/lib/season";
import { supabaseServerClient } from "@/lib/supabaseServerClient";
import type { PlaceType } from "@/types/place";

export const PUBLIC_DASHBOARD_REVALIDATE_SECONDS = 120;

export type PublicDashboardSpotlightGroupV1 = {
  key: "water" | "forest" | "mountain";
  label: string;
  placeTypes: PlaceType[];
};

export const PUBLIC_DASHBOARD_SPOTLIGHT_GROUPS_V1: PublicDashboardSpotlightGroupV1[] = [
  {
    key: "water",
    label: "Vízpart",
    placeTypes: ["lake", "river", "fishpond", "reservoir", "marsh", "reedbed", "salt_lake", "urban_waterfront"],
  },
  { key: "forest", label: "Erdő", placeTypes: ["forest_edge", "protected_area"] },
  { key: "mountain", label: "Hegység", placeTypes: ["mountain_area"] },
];

type SpotlightPlaceV1 = { id: string; name: string; slug: string; place_type: PlaceType };

export type SpotlightBirdV1 = {
  id: string;
  slug: string;
  name_hu: string;
  habitatIconSrc: string | null;
  places: SpotlightPlaceV1[];
  bestRank: number;
};

export type PublicDashboardV1 = {
  currentSeason: SeasonKey;
  currentSeasonLabelHu: string;
  generatedAtIso: string;
  placesMap: {
    markers: Awaited<ReturnType<typeof listPublishedPlaceDashboardMarkers>>;
    layers: Awaited<ReturnType<typeof buildPlacesMapLayersV1>>;
  };
  spotlightBirdsByGroup: Record<PublicDashboardSpotlightGroupV1["key"], SpotlightBirdV1[]>;
  recentBirds: Awaited<ReturnType<typeof listPublishedBirdsForHabitatAssetsRefill>>;
  iconicPreviewByBirdId: Record<string, string | null>;
  habitatTilesByKey: Record<string, string | null>;
  spotlightGroupHabitatTiles: Record<PublicDashboardSpotlightGroupV1["key"], string | null>;
};

function seasonLabelHu(currentSeason: SeasonKey) {
  if (currentSeason === "spring") return "Tavasz";
  if (currentSeason === "summer") return "Nyár";
  if (currentSeason === "autumn") return "Ősz";
  return "Tél";
}

function isObsEnabled() {
  return process.env.PUBLIC_DASHBOARD_OBSERVABILITY === "1";
}

const getPublicDashboardV1Cached = unstable_cache(
  async (currentSeason: SeasonKey): Promise<PublicDashboardV1> => {
    const generatedAtIso = new Date().toISOString();
    const spotlightGroups = PUBLIC_DASHBOARD_SPOTLIGHT_GROUPS_V1;
    const currentSeasonLabelHu = seasonLabelHu(currentSeason);

    if (isObsEnabled() && PUBLIC_DASHBOARD_REVALIDATE_SECONDS >= SIGNED_IMAGE_URL_TTL_SECONDS) {
      console.warn(
        `[publicDashboard] revalidate (${PUBLIC_DASHBOARD_REVALIDATE_SECONDS}s) >= signedUrlTtl (${SIGNED_IMAGE_URL_TTL_SECONDS}s) — assets may expire before ISR refresh`
      );
    }

    const allSpotlightPlaceTypes = Array.from(new Set(spotlightGroups.flatMap((g) => g.placeTypes)));

    const [recentBirds, publishedMarkers, allSpotlightPlaces, habitatAssets] = await Promise.all([
      listPublishedBirdsForHabitatAssetsRefill({ limit: 5 }),
      listPublishedPlaceDashboardMarkers(),
      listPublishedPlacesByPrimaryType(allSpotlightPlaceTypes),
      listHabitatStockAssets(),
    ]);

    const dashboardLayersPromise = buildPlacesMapLayersV1({
      placeRegionIds: publishedMarkers.map((m) => m.leaflet_region_id ?? "").filter(Boolean),
      includeCountries: false,
    });

    const placeTypesByGroup = new Map<PublicDashboardSpotlightGroupV1["key"], Set<PlaceType>>();
    spotlightGroups.forEach((group) => placeTypesByGroup.set(group.key, new Set(group.placeTypes)));

    const groupHabitatAssetKey = new Map<PublicDashboardSpotlightGroupV1["key"], string | null>();
    spotlightGroups.forEach((group) => {
      const keys = computeHabitatStockAssetKeysForPlaceTypes({
        placeTypes: group.placeTypes,
        assets: habitatAssets,
      });
      groupHabitatAssetKey.set(group.key, keys[0] ?? null);
    });

    const placesByGroup = new Map<PublicDashboardSpotlightGroupV1["key"], Array<(typeof allSpotlightPlaces)[number]>>();
    spotlightGroups.forEach((group) => placesByGroup.set(group.key, []));

    allSpotlightPlaces.forEach((place) => {
      const placeType = place.place_type as PlaceType;
      for (const group of spotlightGroups) {
        const allowed = placeTypesByGroup.get(group.key);
        if (allowed?.has(placeType)) {
          placesByGroup.get(group.key)!.push(place);
          break;
        }
      }
    });

    const placeById = new Map(allSpotlightPlaces.map((place) => [place.id, place] as const));
    const groupKeyByPlaceId = new Map<string, PublicDashboardSpotlightGroupV1["key"]>();
    for (const group of spotlightGroups) {
      const groupPlaces = placesByGroup.get(group.key) ?? [];
      groupPlaces.forEach((place) => {
        if (!groupKeyByPlaceId.has(place.id)) {
          groupKeyByPlaceId.set(place.id, group.key);
        }
      });
    }

    const allSpotlightPlaceIds = Array.from(placeById.keys());

    type Row = {
      place_id: string;
      rank: number;
      visible_in_spring: boolean;
      visible_in_summer: boolean;
      visible_in_autumn: boolean;
      visible_in_winter: boolean;
      bird: { id: string; slug: string; name_hu: string; status?: string; habitat_stock_asset_keys?: string[] } | null;
    };

    const spotlightBirdsByGroup: Record<PublicDashboardSpotlightGroupV1["key"], SpotlightBirdV1[]> = {
      water: [],
      forest: [],
      mountain: [],
    };

    const habitatKeyByBirdId = new Map<string, string>();

    if (allSpotlightPlaceIds.length) {
      const { data, error } = await supabaseServerClient
        .from("place_birds")
        .select(
          "place_id,rank,visible_in_spring,visible_in_summer,visible_in_autumn,visible_in_winter,bird:birds(id,slug,name_hu,status,habitat_stock_asset_keys)"
        )
        .eq("review_status", "approved")
        .not("bird_id", "is", null)
        .in("place_id", allSpotlightPlaceIds)
        .order("rank", { ascending: true })
        .limit(3000);

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

      const byBirdIdByGroup = new Map<PublicDashboardSpotlightGroupV1["key"], Map<string, SpotlightBirdV1>>();
      spotlightGroups.forEach((group) => byBirdIdByGroup.set(group.key, new Map()));

      for (const row of seasonalRows) {
        const bird = row.bird;
        if (!bird) continue;
        const groupKey = groupKeyByPlaceId.get(row.place_id);
        if (!groupKey) continue;

        const place = placeById.get(row.place_id);
        if (!place) continue;

        const byBirdId = byBirdIdByGroup.get(groupKey)!;
        const existing = byBirdId.get(bird.id);
        if (!existing) {
          byBirdId.set(bird.id, {
            id: bird.id,
            slug: bird.slug,
            name_hu: bird.name_hu,
            habitatIconSrc: null,
            places: [{ id: place.id, name: place.name, slug: place.slug, place_type: place.place_type }],
            bestRank: row.rank,
          });
        } else {
          existing.bestRank = Math.min(existing.bestRank, row.rank);
          if (!existing.places.some((p) => p.id === place.id)) {
            existing.places.push({ id: place.id, name: place.name, slug: place.slug, place_type: place.place_type });
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

      for (const group of spotlightGroups) {
        const list = Array.from(byBirdIdByGroup.get(group.key)?.values() ?? [])
          .sort(
            (a, b) =>
              a.bestRank - b.bestRank || b.places.length - a.places.length || a.name_hu.localeCompare(b.name_hu)
          )
          .slice(0, 7);
        spotlightBirdsByGroup[group.key] = list;
      }
    }

    const recentBirdIds = recentBirds.map((bird) => bird.id);
    const iconicImages = await listApprovedCurrentIconicImagesForBirds(recentBirdIds);
    const iconicPreviewByBirdId: Record<string, string | null> = {};
    await Promise.all(
      iconicImages.map(async (image) => {
        const signedUrl = image.storage_path ? await getSignedImageUrl(image.storage_path) : null;
        iconicPreviewByBirdId[image.entity_id] = signedUrl ?? null;
      })
    );

    const groupHabitatKeys = Array.from(
      new Set(
        Array.from(groupHabitatAssetKey.values()).filter(
          (k): k is string => typeof k === "string" && k.trim().length > 0
        )
      )
    );
    const habitatKeys = Array.from(
      new Set([
        ...recentBirds
          .map((bird) => (Array.isArray(bird.habitat_stock_asset_keys) ? bird.habitat_stock_asset_keys[0] : ""))
          .filter((k): k is string => typeof k === "string" && k.trim().length > 0),
        ...Array.from(habitatKeyByBirdId.values()),
        ...groupHabitatKeys,
      ])
    );
    const habitatTilesMap = await getSignedApprovedHabitatTileUrlsByAssetKeys(habitatKeys);

    const habitatTilesByKey: Record<string, string | null> = {};
    habitatKeys.forEach((key) => {
      habitatTilesByKey[key] = habitatTilesMap.get(key) ?? null;
    });

    const spotlightGroupHabitatTiles: Record<PublicDashboardSpotlightGroupV1["key"], string | null> = {
      water: null,
      forest: null,
      mountain: null,
    };
    for (const group of spotlightGroups) {
      const assetKey = groupHabitatAssetKey.get(group.key) ?? null;
      spotlightGroupHabitatTiles[group.key] = assetKey ? habitatTilesByKey[assetKey] ?? null : null;
    }

    for (const group of spotlightGroups) {
      spotlightBirdsByGroup[group.key] = (spotlightBirdsByGroup[group.key] ?? []).map((bird) => {
        const key = habitatKeyByBirdId.get(bird.id) ?? null;
        return {
          ...bird,
          habitatIconSrc: key ? habitatTilesByKey[key] ?? null : null,
        };
      });
    }

    if (isObsEnabled()) {
      console.info("[publicDashboard] regenerate", {
        generatedAtIso,
        currentSeason,
        markers: publishedMarkers.length,
        recentBirds: recentBirds.length,
        spotlightWaterBirds: spotlightBirdsByGroup.water.length,
        spotlightForestBirds: spotlightBirdsByGroup.forest.length,
        spotlightMountainBirds: spotlightBirdsByGroup.mountain.length,
      });
    }

    return {
      currentSeason,
      currentSeasonLabelHu,
      generatedAtIso,
      placesMap: { markers: publishedMarkers, layers: await dashboardLayersPromise },
      spotlightBirdsByGroup,
      recentBirds,
      iconicPreviewByBirdId,
      habitatTilesByKey,
      spotlightGroupHabitatTiles,
    };
  },
  ["public-dashboard-v1"],
  { revalidate: PUBLIC_DASHBOARD_REVALIDATE_SECONDS }
);

export async function getPublicDashboardV1(): Promise<PublicDashboardV1> {
  const currentSeason = getCurrentSeasonKey();
  return getPublicDashboardV1Cached(currentSeason);
}
