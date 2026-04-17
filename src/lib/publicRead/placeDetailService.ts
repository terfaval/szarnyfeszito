import { unstable_cache } from "next/cache";

import { createUserClient } from "@/lib/supabaseServerClient";
import { isUuid } from "@/lib/birdService";
import { supabaseServerClient } from "@/lib/supabaseServerClient";
import { getPlaceById, getPlaceBySlug, getPlaceMarkerById } from "@/lib/placeService";
import { getLatestApprovedContentBlockForPlace } from "@/lib/placeContentService";
import { placeUiVariantsSchemaV1, type PlaceUiVariantsV1 } from "@/lib/placeContentSchema";
import { getCurrentSeasonKey, type SeasonKey } from "@/lib/season";
import {
  getPublicImageUrl,
  listApprovedCurrentIconicImagesForBirds,
} from "@/lib/imageService";
import {
  getSignedApprovedHabitatTileUrlsByAssetKeys,
  listHabitatStockAssets,
  resolveHabitatStockAssetKeyForPlaceType,
} from "@/lib/habitatStockAssetService";
import { logPublicReadRegenerate, PUBLIC_READ_REVALIDATE_SECONDS } from "@/lib/publicRead/cache";
import type { PlaceFrequencyBand, PlaceNotableUnit, PlaceType } from "@/types/place";
import { pickApprovedPlaceBirds } from "@/lib/placeBirdFilters";

export type PublicPlaceDetailV1 = {
  generatedAtIso: string;
  place: {
    id: string;
    slug: string;
    name: string;
    place_type: PlaceType;
    status: "published";
    leaflet_region_id: string | null;
    region_landscape: string | null;
    county: string | null;
    district: string | null;
    nearest_city: string | null;
    distance_from_nearest_city_km: number | null;
    settlement: string | null;
    habitat_src: string | null;
    location_precision: string;
    sensitivity_level: string;
    is_beginner_friendly: boolean;
    access_note: string | null;
    parking_note: string | null;
    best_visit_note: string | null;
    notable_units_json: PlaceNotableUnit[] | null;
    updated_at: string;
  };
  marker: { lat: number | null; lng: number | null } | null;
  content: PlaceUiVariantsV1;
  place_birds: unknown[];
  current_season: SeasonKey;
  hero_image_src: string | null;
  birds: Array<{
    id: string;
    slug: string;
    name_hu: string;
    name_latin: string;
    iconicSrc: string | null;
    rank: number;
    frequency_band: PlaceFrequencyBand;
  }>;
};

export type PlaceBirdRow = {
  rank?: unknown;
  frequency_band?: unknown;
  visible_in_spring?: unknown;
  visible_in_summer?: unknown;
  visible_in_autumn?: unknown;
  visible_in_winter?: unknown;
  bird?: { id?: unknown; slug?: unknown; name_hu?: unknown; name_latin?: unknown; status?: unknown } | null;
};

async function buildPublicPlaceDetailV1(key: string): Promise<PublicPlaceDetailV1 | null> {
  const generatedAtIso = new Date().toISOString();
  const supabase = createUserClient({ route: "publicRead.placeDetailService" });

  const place = isUuid(key) ? await getPlaceById(key) : await getPlaceBySlug(key);
  if (!place || place.status !== "published") {
    return null;
  }

  const contentBlock = await getLatestApprovedContentBlockForPlace(place.id);
  if (!contentBlock || contentBlock.review_status !== "approved") {
    return null;
  }

  const parsedContent = contentBlock.blocks_json
    ? placeUiVariantsSchemaV1.safeParse(contentBlock.blocks_json)
    : null;
  if (parsedContent && !parsedContent.success) {
    console.error("Invalid published place content payload", {
      place_id: place.id,
      block_id: contentBlock.id,
      issues: parsedContent.error.issues,
    });
  }

  const fallbackContent = placeUiVariantsSchemaV1.parse({
    schema_version: "place_ui_variants_v1",
    language: "hu",
    variants: {
      teaser: contentBlock.short ?? "",
      short: contentBlock.short ?? "",
      long: contentBlock.long ?? "",
      ethics_tip: contentBlock.ethics_tip ?? "",
      did_you_know: contentBlock.did_you_know ?? "",
    },
  });

  const content = parsedContent && parsedContent.success ? parsedContent.data : fallbackContent;

  const { data: birdLinks, error } = await supabase
    .from("place_birds")
    .select(
      "id,place_id,bird_id,pending_bird_name_hu,review_status,rank,frequency_band,is_iconic,visible_in_spring,visible_in_summer,visible_in_autumn,visible_in_winter,seasonality_note,bird:birds(id,slug,name_hu,name_latin,status)"
    )
    .eq("place_id", place.id)
    .eq("review_status", "approved")
    .not("bird_id", "is", null)
    .order("rank", { ascending: true });

  if (error) {
    throw error;
  }

  type BirdLinkRow = {
    // Supabase can return either an object (many-to-one) or an array depending on select/join shape.
    bird?:
      | { id?: unknown; slug?: unknown; name_hu?: unknown; name_latin?: unknown; status?: unknown }
      | Array<{ id?: unknown; slug?: unknown; name_hu?: unknown; name_latin?: unknown; status?: unknown }>
      | null;
  };

  let publishedBirdLinks = (birdLinks ?? [])
    .map((row: BirdLinkRow) => {
      const birdValue = row.bird ?? null;
      const bird =
        Array.isArray(birdValue) ? (birdValue[0] ?? null) : birdValue && typeof birdValue === "object" ? birdValue : null;

      if (!bird || bird.status !== "published") {
        return null;
      }

      return {
        ...row,
        bird: { id: bird.id, slug: bird.slug, name_hu: bird.name_hu, name_latin: bird.name_latin ?? "" },
      };
    })
    .filter(Boolean);

  // Fallback: if RLS blocks joining `birds` for anon in some environments, the join yields null `bird`,
  // which would empty out the list. In that case, fetch the published birds explicitly via admin client.
  if ((birdLinks ?? []).length > 0 && publishedBirdLinks.length === 0) {
    const birdIds = (birdLinks ?? [])
      .map((row) => ((row as { bird_id?: unknown }).bird_id as string | undefined) ?? "")
      .filter((id) => typeof id === "string" && isUuid(id));

    if (birdIds.length > 0) {
      const { data: birdsRows, error: birdsError } = await supabaseServerClient
        .from("birds")
        .select("id,slug,name_hu,name_latin,status")
        .in("id", birdIds)
        .eq("status", "published")
        .limit(1000);

      if (birdsError) {
        throw birdsError;
      }

      const birdById = new Map(
        (birdsRows ?? [])
          .filter((b) => b && typeof b.id === "string")
          .map((b) => [b.id, b] as const)
      );

      publishedBirdLinks = (birdLinks ?? [])
        .map((row) => {
          const birdId = ((row as { bird_id?: unknown }).bird_id as string | undefined) ?? "";
          const bird = birdById.get(birdId) ?? null;
          if (!bird) return null;
          return {
            ...row,
            bird: {
              id: bird.id,
              slug: bird.slug,
              name_hu: bird.name_hu,
              name_latin: bird.name_latin ?? "",
            },
          };
        })
        .filter(Boolean);
    }
  }

  const currentSeason = getCurrentSeasonKey();
  const visibleBirdLinks = pickApprovedPlaceBirds(publishedBirdLinks as PlaceBirdRow[]);
  const visibleBirdIds = visibleBirdLinks
    .map((row) => ((row as { bird?: { id?: unknown } | null }).bird?.id as string | undefined) ?? "")
    .filter(Boolean);
  const publicBirdIds = visibleBirdIds;
  const publicBirdLinks = visibleBirdLinks;

  const iconicRows = await listApprovedCurrentIconicImagesForBirds(publicBirdIds);
  const storagePathByBirdId = new Map(iconicRows.map((row) => [row.entity_id, row.storage_path]));
  const signedIconicPairs = await Promise.all(
    publicBirdIds.map(async (birdId) => {
      const storagePath = storagePathByBirdId.get(birdId) ?? null;
      const signedUrl = storagePath
        ? getPublicImageUrl(storagePath)
        : null;
      return [birdId, signedUrl] as const;
    })
  );
  const iconicUrlByBirdId = new Map(signedIconicPairs);

  const birds = publicBirdLinks
    .map((row) => {
      const r = row as PlaceBirdRow;
      const bird = r.bird ?? null;
      if (!bird || typeof bird.id !== "string" || typeof bird.slug !== "string" || typeof bird.name_hu !== "string") return null;
      return {
        id: bird.id,
        slug: bird.slug,
        name_hu: bird.name_hu,
        name_latin: typeof (bird as { name_latin?: unknown }).name_latin === "string" ? (bird as { name_latin?: string }).name_latin ?? "" : "",
        iconicSrc: iconicUrlByBirdId.get(bird.id) ?? null,
        rank: typeof r.rank === "number" ? r.rank : 0,
        frequency_band: typeof r.frequency_band === "string" ? (r.frequency_band as PlaceFrequencyBand) : "regular",
      };
    })
    .filter(Boolean) as PublicPlaceDetailV1["birds"];

  const marker = place.location_precision === "hidden" ? null : await getPlaceMarkerById(place.id);
  const safeMarker = marker ? { lat: marker.lat, lng: marker.lng } : null;

  const { data: heroRows, error: heroError } = await supabaseServerClient
    .from("images")
    .select("storage_path")
    .eq("entity_type", "place")
    .eq("variant", "place_hero_spring_v1")
    .eq("is_current", true)
    .eq("review_status", "approved")
    .eq("entity_id", place.id)
    .limit(1);

  if (heroError) {
    throw heroError;
  }

  const heroStoragePath = typeof (heroRows?.[0] as { storage_path?: unknown } | undefined)?.storage_path === "string"
    ? String((heroRows?.[0] as { storage_path?: unknown }).storage_path)
    : "";
  const heroImageUrl = heroStoragePath
    ? getPublicImageUrl(heroStoragePath)
    : null;

  const habitatAssets = await listHabitatStockAssets();
  const habitatKey = resolveHabitatStockAssetKeyForPlaceType({
    placeType: place.place_type,
    assets: habitatAssets,
  });
  const habitatUrlByKey = habitatKey
    ? await getSignedApprovedHabitatTileUrlsByAssetKeys([habitatKey])
    : new Map();
  const habitatSrc = habitatKey ? habitatUrlByKey.get(habitatKey) ?? null : null;

  const out: PublicPlaceDetailV1 = {
    generatedAtIso,
    place: {
      id: place.id,
      slug: place.slug,
      name: place.name,
      place_type: place.place_type,
      status: place.status,
      leaflet_region_id: place.leaflet_region_id,
      region_landscape: place.region_landscape,
      county: place.county,
      district: place.district,
      nearest_city: place.nearest_city,
      distance_from_nearest_city_km: place.distance_from_nearest_city_km,
      settlement: place.settlement,
      habitat_src: habitatSrc,
      location_precision: place.location_precision,
      sensitivity_level: place.sensitivity_level,
      is_beginner_friendly: place.is_beginner_friendly,
      access_note: place.access_note,
      parking_note: place.parking_note,
      best_visit_note: place.best_visit_note,
      notable_units_json: place.notable_units_json,
      updated_at: place.updated_at,
    },
    marker: safeMarker,
    content,
    place_birds: publicBirdLinks as unknown[],
    current_season: currentSeason,
    hero_image_src: heroImageUrl,
    birds,
  };

  logPublicReadRegenerate("placeDetailV1", {
    generatedAtIso,
    slug: place.slug,
    place_id: place.id,
    birds: out.birds.length,
    place_birds: out.place_birds.length,
  });

  return out;
}

const getPublicPlaceDetailV1Cached = unstable_cache(
  async (key: string) => buildPublicPlaceDetailV1(key),
  ["public-place-detail-v1"],
  { revalidate: PUBLIC_READ_REVALIDATE_SECONDS }
);

export async function getPublicPlaceDetailV1(key: string): Promise<PublicPlaceDetailV1 | null> {
  const normalizedKey = typeof key === "string" ? key.trim() : "";
  if (!normalizedKey) {
    return null;
  }
  return getPublicPlaceDetailV1Cached(normalizedKey);
}
