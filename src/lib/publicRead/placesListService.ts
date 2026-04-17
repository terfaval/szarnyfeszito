import { unstable_cache } from "next/cache";

import { createUserClient } from "@/lib/supabaseServerClient";
import { supabaseServerClient } from "@/lib/supabaseServerClient";
import { listLatestApprovedContentBlocksForPlaces } from "@/lib/placeContentService";
import { placeUiVariantsSchemaV1 } from "@/lib/placeContentSchema";
import { getPublicImageUrl, listApprovedCurrentIconicImagesForBirds } from "@/lib/imageService";
import {
  getSignedApprovedHabitatTileUrlsByAssetKeys,
  listHabitatStockAssets,
  resolveHabitatStockAssetKeyForPlaceType,
} from "@/lib/habitatStockAssetService";
import { logPublicReadRegenerate, PUBLIC_READ_REVALIDATE_SECONDS } from "@/lib/publicRead/cache";
import type { Place, PlaceType } from "@/types/place";
import { isUuid } from "@/lib/birdService";

type ImageRow = { entity_id?: unknown; storage_path?: unknown };
type PlaceBirdRow = {
  place_id?: unknown;
  bird_id?: unknown;
  rank?: unknown;
  bird?:
    | { id?: unknown; slug?: unknown; name_hu?: unknown; status?: unknown }
    | Array<{ id?: unknown; slug?: unknown; name_hu?: unknown; status?: unknown }>
    | null;
};

export type PublicPlaceListBirdV1 = {
  id: string;
  slug: string;
  name_hu: string;
  iconicSrc: string | null;
};

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
  birds: PublicPlaceListBirdV1[];
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

const PUBLIC_READ_ROUTE = "publicRead.placesListService";

async function buildPublicPlacesListV1(): Promise<PublicPlacesListV1> {
  const generatedAtIso = new Date().toISOString();

  const supabase = createUserClient({ route: PUBLIC_READ_ROUTE });

  const { data: placeRows, error } = await supabase
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

  const [contentBlocks, habitatAssets] = await Promise.all([
    listLatestApprovedContentBlocksForPlaces(placeIds),
    listHabitatStockAssets(),
  ]);

  const { data: placeBirdRows, error: placeBirdError } = await supabase
    .from("place_birds")
    .select("place_id,bird_id,rank,bird:birds(id,slug,name_hu,status)")
    .eq("review_status", "approved")
    .not("bird_id", "is", null)
    .in("place_id", placeIds)
    .order("rank", { ascending: true })
    .limit(5000);

  if (placeBirdError) {
    throw placeBirdError;
  }

  const birdRows = (placeBirdRows ?? []) as unknown as PlaceBirdRow[];
  const birdIdsForIconic = new Set<string>();
  const birdsByPlaceId = new Map<string, Array<{ id: string; slug: string; name_hu: string; rank: number }>>();
  const pendingBirdIds = new Set<string>();
  const pendingByPlaceId = new Map<string, Array<{ birdId: string; rank: number }>>();

  for (const row of birdRows) {
    const placeId = typeof row.place_id === "string" ? row.place_id : "";
    if (!placeId) continue;

    const birdValue = row.bird ?? null;
    const bird =
      Array.isArray(birdValue)
        ? birdValue[0] ?? null
        : birdValue && typeof birdValue === "object"
          ? birdValue
          : null;

    const rank = typeof row.rank === "number" ? row.rank : 0;

    // If join is blocked under RLS, `bird` will be null even when bird_id is present.
    // We'll try to resolve these later via admin client.
    if (!bird) {
      const birdId = typeof row.bird_id === "string" ? row.bird_id : "";
      if (birdId && isUuid(birdId)) {
        pendingBirdIds.add(birdId);
        const list = pendingByPlaceId.get(placeId) ?? [];
        list.push({ birdId, rank });
        pendingByPlaceId.set(placeId, list);
      }
      continue;
    }

    if (bird.status !== "published") continue;
    const birdId = typeof bird.id === "string" ? bird.id : "";
    const slug = typeof bird.slug === "string" ? bird.slug : "";
    const nameHu = typeof bird.name_hu === "string" ? bird.name_hu : "";
    if (!birdId || !slug || !nameHu) continue;

    const list = birdsByPlaceId.get(placeId) ?? [];
    if (list.length < 4 && !list.some((b) => b.id === birdId)) {
      list.push({ id: birdId, slug, name_hu: nameHu, rank });
      birdsByPlaceId.set(placeId, list);
      birdIdsForIconic.add(birdId);
    }
  }

  if (pendingBirdIds.size > 0) {
    const { data: birdsRows, error: birdsError } = await supabaseServerClient
      .from("birds")
      .select("id,slug,name_hu,status")
      .in("id", Array.from(pendingBirdIds))
      .eq("status", "published")
      .limit(2000);

    if (birdsError) {
      throw birdsError;
    }

    const birdById = new Map(
      (birdsRows ?? [])
        .filter((b) => b && typeof b.id === "string")
        .map((b) => [b.id, b] as const)
    );

    for (const [placeId, pending] of pendingByPlaceId.entries()) {
      const resolved = pending
        .map((p) => {
          const bird = birdById.get(p.birdId) ?? null;
          if (!bird) return null;
          const birdId = typeof bird.id === "string" ? bird.id : "";
          const slug = typeof bird.slug === "string" ? bird.slug : "";
          const nameHu = typeof bird.name_hu === "string" ? bird.name_hu : "";
          if (!birdId || !slug || !nameHu) return null;
          return { id: birdId, slug, name_hu: nameHu, rank: p.rank };
        })
        .filter(Boolean) as Array<{ id: string; slug: string; name_hu: string; rank: number }>;

      if (resolved.length === 0) continue;
      resolved.sort((a, b) => a.rank - b.rank);

      const list = birdsByPlaceId.get(placeId) ?? [];
      for (const item of resolved) {
        if (list.length >= 4) break;
        if (list.some((b) => b.id === item.id)) continue;
        list.push(item);
        birdIdsForIconic.add(item.id);
      }
      birdsByPlaceId.set(placeId, list);
    }
  }

  const iconicRows = birdIdsForIconic.size
    ? await listApprovedCurrentIconicImagesForBirds(Array.from(birdIdsForIconic))
    : [];
  const iconicUrlByBirdId = new Map<string, string | null>();
  iconicRows.forEach((row) => {
    const id = row.entity_id;
    const storagePath = row.storage_path;
    if (!id || !storagePath) return;
    iconicUrlByBirdId.set(id, getPublicImageUrl(storagePath));
  });

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
    (imageRows ?? []).map(async (row: ImageRow) => {
      const r = row as ImageRow;
      const placeId = typeof r.entity_id === "string" ? r.entity_id : "";
      const storagePath = typeof r.storage_path === "string" ? r.storage_path : "";
      if (!placeId || !storagePath) return;
      const url = getPublicImageUrl(storagePath);
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
      // Fallback to legacy content blocks that lack the schema wrapper.
      const parsed = block?.blocks_json
        ? placeUiVariantsSchemaV1.safeParse(block.blocks_json)
        : null;
      const variants = parsed && parsed.success ? parsed.data.variants : null;
      const fallbackShort = typeof block?.short === "string" ? block.short : "";
      const fallbackTeaser = typeof block?.short === "string" ? block.short : "";
      const habitatKey = habitatKeyByPlaceId.get(place.id) ?? null;
      const habitatSrc = habitatKey ? habitatUrlByKey.get(habitatKey) ?? null : null;
      const birds = (birdsByPlaceId.get(place.id) ?? []).map((bird) => ({
        id: bird.id,
        slug: bird.slug,
        name_hu: bird.name_hu,
        iconicSrc: iconicUrlByBirdId.get(bird.id) ?? null,
      }));
      return {
        id: place.id,
        slug: place.slug,
        name: place.name,
        place_type: place.place_type,
        region_landscape: place.region_landscape ?? null,
        county: place.county ?? null,
        nearest_city: place.nearest_city ?? null,
        teaser: variants?.teaser || fallbackTeaser,
        short: variants?.short || fallbackShort,
        hero_image_src: heroUrlByPlaceId.get(place.id) ?? null,
        habitat_key: habitatKey,
        habitat_src: habitatSrc ?? null,
        birds,
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
