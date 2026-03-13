import { unstable_cache } from "next/cache";

import { supabaseServerClient } from "@/lib/supabaseServerClient";
import { listLatestApprovedContentBlocksForPlaces } from "@/lib/placeContentService";
import { placeUiVariantsSchemaV1 } from "@/lib/placeContentSchema";
import { getSignedImageUrl } from "@/lib/imageService";
import {
  getSignedApprovedHabitatTileUrlsByAssetKeys,
  listHabitatStockAssets,
  resolveHabitatStockAssetKeyForPlaceType,
} from "@/lib/habitatStockAssetService";
import { logPublicReadRegenerate, PUBLIC_READ_REVALIDATE_SECONDS } from "@/lib/publicRead/cache";
import type { Place, PlaceType } from "@/types/place";

type ImageRow = { entity_id?: unknown; storage_path?: unknown };

export type PublicPlaceListItemV1 = {
  id: string;
  slug: string;
  name: string;
  place_type: PlaceType;
  region_landscape: string | null;
  county: string | null;
  nearest_city: string | null;
  teaser: string;
  short: string;
  hero_image_src: string | null;
  habitat_key: string | null;
  habitat_src: string | null;
};

export type PublicPlaceFiltersV1 = {
  place_types: string[];
  regions: string[];
};

export type PublicPlacesListV1 = {
  generatedAtIso: string;
  places: PublicPlaceListItemV1[];
};

export type PublicPlacesListQueryV1 = {
  search: string;
  place_type: string;
  region: string;
};

async function buildPublicPlacesListV1(): Promise<PublicPlacesListV1> {
  const generatedAtIso = new Date().toISOString();

  const { data: placeRows, error } = await supabaseServerClient
    .from("places")
    .select("id,slug,name,place_type,region_landscape,county,nearest_city,status")
    .eq("status", "published")
    .order("name", { ascending: true })
    .limit(300);

  if (error) {
    throw error;
  }

  const places = (placeRows ?? []) as Place[];
  const placeIds = places.map((place) => place.id);

  const [contentBlocks, habitatAssets] = await Promise.all([listLatestApprovedContentBlocksForPlaces(placeIds), listHabitatStockAssets()]);

  const { data: imageRows, error: imageError } = await supabaseServerClient
    .from("images")
    .select("entity_id,storage_path")
    .eq("entity_type", "place")
    .eq("variant", "place_hero_spring_v1")
    .eq("is_current", true)
    .eq("review_status", "approved")
    .in("entity_id", placeIds);

  if (imageError) {
    throw imageError;
  }

  const heroUrlByPlaceId = new Map<string, string | null>();
  await Promise.all(
    (imageRows ?? []).map(async (row) => {
      const r = row as ImageRow;
      const placeId = typeof r.entity_id === "string" ? r.entity_id : "";
      const storagePath = typeof r.storage_path === "string" ? r.storage_path : "";
      if (!placeId || !storagePath) return;
      const url = await getSignedImageUrl(storagePath);
      heroUrlByPlaceId.set(placeId, url ?? null);
    })
  );

  const habitatKeyByPlaceId = new Map<string, string | null>();
  places.forEach((place) => {
    const key = resolveHabitatStockAssetKeyForPlaceType({
      placeType: place.place_type,
      assets: habitatAssets,
    });
    habitatKeyByPlaceId.set(place.id, key);
  });

  const habitatUrlByKey = await getSignedApprovedHabitatTileUrlsByAssetKeys(
    Array.from(new Set(Array.from(habitatKeyByPlaceId.values()).filter(Boolean))) as string[]
  );

  const base = places
    .map((place) => {
      const block = contentBlocks.get(place.id) ?? null;
      if (!block?.blocks_json) return null;
      const parsed = placeUiVariantsSchemaV1.safeParse(block.blocks_json);
      if (!parsed.success) return null;
      const habitatKey = habitatKeyByPlaceId.get(place.id) ?? null;
      const habitatSrc = habitatKey ? habitatUrlByKey.get(habitatKey) ?? null : null;
      return {
        id: place.id,
        slug: place.slug,
        name: place.name,
        place_type: place.place_type,
        region_landscape: place.region_landscape ?? null,
        county: place.county ?? null,
        nearest_city: place.nearest_city ?? null,
        teaser: parsed.data.variants.teaser ?? "",
        short: parsed.data.variants.short ?? "",
        hero_image_src: heroUrlByPlaceId.get(place.id) ?? null,
        habitat_key: habitatKey,
        habitat_src: habitatSrc ?? null,
      } satisfies PublicPlaceListItemV1;
    })
    .filter(Boolean) as PublicPlaceListItemV1[];

  logPublicReadRegenerate("placesListV1", { generatedAtIso, places: base.length });
  return { generatedAtIso, places: base };
}

const getPublicPlacesListV1Cached = unstable_cache(
  async () => buildPublicPlacesListV1(),
  ["public-places-list-v1"],
  { revalidate: PUBLIC_READ_REVALIDATE_SECONDS }
);

export async function getPublicPlacesListV1(): Promise<PublicPlacesListV1> {
  return getPublicPlacesListV1Cached();
}

export function filterPublicPlacesListV1(args: { list: PublicPlacesListV1; query: PublicPlacesListQueryV1 }) {
  const { list, query } = args;
  const search = (query.search ?? "").trim().toLowerCase();
  const placeType = (query.place_type ?? "").trim();
  const region = (query.region ?? "").trim();

  const filtered = list.places.filter((place) => {
    if (placeType && place.place_type !== placeType) return false;
    if (region && place.region_landscape !== region) return false;
    if (search) {
      const hit = place.name.toLowerCase().includes(search) || place.teaser.toLowerCase().includes(search) || place.short.toLowerCase().includes(search);
      if (!hit) return false;
    }
    return true;
  });

  const placeTypeSet = new Set(filtered.map((p) => p.place_type));
  const regionSet = new Set(filtered.map((p) => p.region_landscape).filter(Boolean) as string[]);
  const filters: PublicPlaceFiltersV1 = {
    place_types: Array.from(placeTypeSet.values()).sort(),
    regions: Array.from(regionSet.values()).sort(),
  };

  return {
    places: filtered,
    filters,
  };
}

