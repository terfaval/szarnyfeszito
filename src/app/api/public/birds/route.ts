import { NextResponse } from "next/server";
import { supabaseServerClient } from "@/lib/supabaseServerClient";
import { listLatestApprovedContentBlocksForBirds } from "@/lib/contentService";
import { listApprovedCurrentIconicImagesForBirds, getSignedImageUrl } from "@/lib/imageService";
import {
  computeHabitatStockAssetKeysForPlaceTypes,
  getSignedApprovedHabitatTileUrlsByAssetKeys,
  listHabitatStockAssets,
} from "@/lib/habitatStockAssetService";
import type { Bird, BirdColorTag, BirdSizeCategory, BirdVisibilityCategory } from "@/types/bird";
import type { PlaceType } from "@/types/place";

type PlaceLinkRow = {
  bird_id?: unknown;
  place?: { slug?: unknown; name?: unknown; place_type?: unknown; status?: unknown; region_landscape?: unknown } | null;
};

const SIZE_LABELS: Record<BirdSizeCategory, string> = {
  very_small: "Nagyon kicsi",
  small: "Kicsi",
  medium: "Közepes",
  large: "Nagy",
};

const VISIBILITY_LABELS: Record<BirdVisibilityCategory, string> = {
  common_hu: "Gyakori (HU)",
  localized_hu: "Helyi (HU)",
  seasonal_hu: "Szezonális (HU)",
  rare_hu: "Ritka (HU)",
  not_in_hu: "Nem HU",
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const search = (url.searchParams.get("search") ?? "").trim().toLowerCase();
  const sizeCategory = (url.searchParams.get("size_category") ?? "").trim();
  const visibilityCategory = (url.searchParams.get("visibility_category") ?? "").trim();
  const colorTagsParam = (url.searchParams.get("color_tags") ?? "").trim();
  const placeType = (url.searchParams.get("place_type") ?? "").trim();
  const region = (url.searchParams.get("region") ?? "").trim();
  const placeSlug = (url.searchParams.get("place") ?? "").trim();

  const { data: birdRows, error } = await supabaseServerClient
    .from("birds")
    .select(
      "id,slug,name_hu,name_latin,status,size_category,visibility_category,color_tags,habitat_stock_asset_keys,updated_at"
    )
    .eq("status", "published")
    .order("name_hu", { ascending: true })
    .limit(500);

  if (error) {
    throw error;
  }

  const birds = (birdRows ?? []) as Bird[];
  const birdIds = birds.map((bird) => bird.id);

  const [contentBlocks, iconicImages, habitatAssets] = await Promise.all([
    listLatestApprovedContentBlocksForBirds(birdIds),
    listApprovedCurrentIconicImagesForBirds(birdIds),
    listHabitatStockAssets(),
  ]);

  const iconicUrlByBirdId = new Map<string, string | null>();
  await Promise.all(
    iconicImages.map(async (img) => {
      const url = img.storage_path ? await getSignedImageUrl(img.storage_path) : null;
      iconicUrlByBirdId.set(img.entity_id, url ?? null);
    })
  );

  const { data: placeLinkRows, error: placeLinkError } = await supabaseServerClient
    .from("place_birds")
    .select("bird_id,place:places!place_birds_place_id_fkey(slug,name,place_type,status,region_landscape)")
    .eq("review_status", "approved")
    .in("bird_id", birdIds)
    .limit(5000);

  if (placeLinkError) {
    throw placeLinkError;
  }

  const placesByBirdId = new Map<string, Array<{ slug: string; name: string; place_type: PlaceType; region: string | null }>>();
  const placeTypeSet = new Set<string>();
  const regionSet = new Set<string>();
  const placeListMap = new Map<string, { slug: string; name: string }>();

  (placeLinkRows ?? []).forEach((row) => {
    const r = row as PlaceLinkRow;
    const birdId = typeof r?.bird_id === "string" ? r.bird_id : "";
    const place = r?.place ?? null;
    const status = typeof place?.status === "string" ? place.status : "";
    if (!birdId || !place || status !== "published") return;

    const slug = typeof place.slug === "string" ? place.slug : "";
    const name = typeof place.name === "string" ? place.name : "";
    const placeTypeValue = typeof place.place_type === "string" ? place.place_type : "";
    const regionValue = typeof place.region_landscape === "string" ? place.region_landscape : null;
    if (!slug || !name || !placeTypeValue) return;

    const list = placesByBirdId.get(birdId) ?? [];
    if (!list.some((item) => item.slug === slug)) {
      list.push({
        slug,
        name,
        place_type: placeTypeValue as PlaceType,
        region: regionValue,
      });
      placesByBirdId.set(birdId, list);
    }

    placeTypeSet.add(placeTypeValue);
    if (regionValue) regionSet.add(regionValue);
    if (!placeListMap.has(slug)) {
      placeListMap.set(slug, { slug, name });
    }
  });

  const habitatKeyByBirdId = new Map<string, string | null>();
  birds.forEach((bird) => {
    const places = placesByBirdId.get(bird.id) ?? [];
    const placeTypes = Array.from(new Set(places.map((p) => p.place_type)));
    let habitatKey: string | null = null;
    if (placeTypes.length > 0) {
      const keys = computeHabitatStockAssetKeysForPlaceTypes({ placeTypes, assets: habitatAssets });
      habitatKey = keys[0] ?? null;
    }
    if (!habitatKey && Array.isArray(bird.habitat_stock_asset_keys)) {
      habitatKey = bird.habitat_stock_asset_keys[0] ?? null;
    }
    habitatKeyByBirdId.set(bird.id, habitatKey);
  });

  const habitatUrlByKey = await getSignedApprovedHabitatTileUrlsByAssetKeys(
    Array.from(new Set(Array.from(habitatKeyByBirdId.values()).filter(Boolean))) as string[]
  );

  const base = birds
    .map((bird) => {
      const content = contentBlocks.get(bird.id) ?? null;
      if (!content) return null;
      const places = placesByBirdId.get(bird.id) ?? [];
      const habitatKey = habitatKeyByBirdId.get(bird.id) ?? null;
      const habitatSrc = habitatKey ? habitatUrlByKey.get(habitatKey) ?? null : null;
      return {
        id: bird.id,
        slug: bird.slug,
        name_hu: bird.name_hu,
        name_latin: bird.name_latin ?? null,
        size_category: bird.size_category ?? null,
        size_label_hu: bird.size_category ? SIZE_LABELS[bird.size_category] : null,
        visibility_category: bird.visibility_category ?? null,
        visibility_label_hu: bird.visibility_category ? VISIBILITY_LABELS[bird.visibility_category] : "Ismeretlen",
        color_tags: bird.color_tags ?? [],
        short: content.short ?? "",
        iconic_src: iconicUrlByBirdId.get(bird.id) ?? null,
        habitat_key: habitatKey,
        habitat_src: habitatSrc ?? null,
        place_types: Array.from(new Set(places.map((p) => p.place_type))),
        regions: Array.from(new Set(places.map((p) => p.region).filter(Boolean))) as string[],
        places: places.map((p) => ({ slug: p.slug, name: p.name })),
      };
    })
    .filter(Boolean) as Array<{
    id: string;
    slug: string;
    name_hu: string;
    name_latin: string | null;
    size_category: BirdSizeCategory | null;
    size_label_hu: string | null;
    visibility_category: BirdVisibilityCategory | null;
    visibility_label_hu: string;
    color_tags: BirdColorTag[];
    short: string;
    iconic_src: string | null;
    habitat_key: string | null;
    habitat_src: string | null;
    place_types: PlaceType[];
    regions: string[];
    places: Array<{ slug: string; name: string }>;
  }>;

  const filtered = base.filter((bird) => {
    if (sizeCategory && bird.size_category !== sizeCategory) return false;
    if (visibilityCategory && bird.visibility_category !== visibilityCategory) return false;
    if (colorTagsParam) {
      const want = colorTagsParam.split(",").map((t) => t.trim()).filter(Boolean);
      if (want.length > 0 && !want.some((tag) => bird.color_tags.includes(tag as BirdColorTag))) return false;
    }
    if (placeType && !bird.place_types.includes(placeType as PlaceType)) return false;
    if (region && !bird.regions.includes(region)) return false;
    if (placeSlug && !bird.places.some((p) => p.slug === placeSlug)) return false;
    if (search) {
      const searchHit =
        bird.name_hu.toLowerCase().includes(search) ||
        (bird.name_latin ?? "").toLowerCase().includes(search) ||
        bird.places.some((p) => p.name.toLowerCase().includes(search));
      if (!searchHit) return false;
    }
    return true;
  });

  return NextResponse.json({
    data: {
      birds: filtered,
      filters: {
        place_types: Array.from(placeTypeSet.values()).sort(),
        regions: Array.from(regionSet.values()).sort(),
        places: Array.from(placeListMap.values()).sort((a, b) => a.name.localeCompare(b.name, "hu")),
      },
    },
  });
}
