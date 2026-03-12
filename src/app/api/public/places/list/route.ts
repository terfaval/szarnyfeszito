import { NextResponse } from "next/server";
import { supabaseServerClient } from "@/lib/supabaseServerClient";
import { listLatestApprovedContentBlocksForPlaces } from "@/lib/placeContentService";
import { placeUiVariantsSchemaV1 } from "@/lib/placeContentSchema";
import { getSignedImageUrl } from "@/lib/imageService";
import {
  getSignedApprovedHabitatTileUrlsByAssetKeys,
  listHabitatStockAssets,
  resolveHabitatStockAssetKeyForPlaceType,
} from "@/lib/habitatStockAssetService";
import type { Place, PlaceType } from "@/types/place";

type ImageRow = { entity_id?: unknown; storage_path?: unknown };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const search = (url.searchParams.get("search") ?? "").trim().toLowerCase();
  const placeType = (url.searchParams.get("place_type") ?? "").trim();
  const region = (url.searchParams.get("region") ?? "").trim();

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

  const [contentBlocks, habitatAssets] = await Promise.all([
    listLatestApprovedContentBlocksForPlaces(placeIds),
    listHabitatStockAssets(),
  ]);

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
      };
    })
    .filter(Boolean) as Array<{
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
  }>;

  const filtered = base.filter((place) => {
    if (placeType && place.place_type !== placeType) return false;
    if (region && place.region_landscape !== region) return false;
    if (search) {
      const hit =
        place.name.toLowerCase().includes(search) ||
        place.teaser.toLowerCase().includes(search) ||
        place.short.toLowerCase().includes(search);
      if (!hit) return false;
    }
    return true;
  });

  const placeTypeSet = new Set(filtered.map((p) => p.place_type));
  const regionSet = new Set(filtered.map((p) => p.region_landscape).filter(Boolean) as string[]);

  return NextResponse.json({
    data: {
      places: filtered,
      filters: {
        place_types: Array.from(placeTypeSet.values()).sort(),
        regions: Array.from(regionSet.values()).sort(),
      },
    },
  });
}
