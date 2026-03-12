import { buildPlacesMapLayersV1 } from "@/lib/placesMapLayers";
import { listPublishedPlaceDashboardMarkers } from "@/lib/placeService";
import { getLatestApprovedContentBlockForPlace } from "@/lib/placeContentService";
import { placeUiVariantsSchemaV1 } from "@/lib/placeContentSchema";
import { listApprovedPublishedBirdLinksForPlace } from "@/lib/placeBirdService";
import { listBirds } from "@/lib/birdService";
import { supabaseServerClient } from "@/lib/supabaseServerClient";
import {
  getApprovedCurrentPlaceHeroImage,
  getSignedImageUrl,
  listApprovedCurrentIconicImagesForBirds,
} from "@/lib/imageService";
import type { BirdVisibilityCategory } from "@/types/bird";

type FeaturedBirdV1 = {
  id: string;
  slug: string;
  name_hu: string;
  visibility_category: BirdVisibilityCategory | null;
  visibility_label_hu: string;
  iconic_src: string | null;
};

type SpotlightPlaceV1 = {
  id: string;
  slug: string;
  name: string;
  teaser: string | null;
  short: string | null;
  hero_image_src: string | null;
  birds: Array<{
    id: string;
    slug: string;
    name_hu: string;
    iconic_src: string | null;
  }>;
};

export type PublicLandingV1 = {
  places_map: {
    markers: Awaited<ReturnType<typeof listPublishedPlaceDashboardMarkers>>;
    layers: Awaited<ReturnType<typeof buildPlacesMapLayersV1>>;
  };
  featured_birds: FeaturedBirdV1[];
  spotlight_places: SpotlightPlaceV1[];
};

function pickRandom<T>(items: T[]): T | null {
  if (items.length === 0) return null;
  return items[Math.floor(Math.random() * items.length)] ?? null;
}

function uniqueById<T extends { id: string }>(items: T[]) {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

function visibilityLabelHu(value: BirdVisibilityCategory | null) {
  if (value === "common_hu") return "Gyakori (HU)";
  if (value === "seasonal_hu") return "Szezonális (HU)";
  if (value === "not_in_hu") return "Nem HU";
  return "Ismeretlen";
}

function pickFeaturedBirdsV1(args: {
  birds: Array<{
    id: string;
    slug: string;
    name_hu: string;
    visibility_category: BirdVisibilityCategory | null;
  }>;
  count: number;
}) {
  const { birds, count } = args;
  const byVisibility = new Map<BirdVisibilityCategory | null, typeof birds>();
  birds.forEach((bird) => {
    const key = bird.visibility_category ?? null;
    const existing = byVisibility.get(key) ?? [];
    existing.push(bird);
    byVisibility.set(key, existing);
  });

  const picks: typeof birds = [];
  const want: Array<{ key: BirdVisibilityCategory; count: number }> = [
    { key: "common_hu", count: 2 },
    { key: "seasonal_hu", count: 2 },
    { key: "not_in_hu", count: 1 },
  ];

  for (const entry of want) {
    const pool = byVisibility.get(entry.key) ?? [];
    for (let i = 0; i < entry.count; i += 1) {
      const choice = pickRandom(pool.filter((bird) => !picks.some((p) => p.id === bird.id)));
      if (choice) picks.push(choice);
    }
  }

  const remainingPool = birds.filter((bird) => !picks.some((p) => p.id === bird.id));
  while (picks.length < count && remainingPool.length > 0) {
    const choice = pickRandom(remainingPool.filter((bird) => !picks.some((p) => p.id === bird.id)));
    if (!choice) break;
    picks.push(choice);
  }

  return picks.slice(0, count);
}

export async function getPublicLandingV1(): Promise<PublicLandingV1> {
  const [markers, publishedBirds, publishedPlaces] = await Promise.all([
    listPublishedPlaceDashboardMarkers(),
    listBirds({ status: "published" }),
    // Keep this small and deterministic: take the most recently updated published places.
    // (We still filter out any place missing approved UI variants in the next step.)
    (async () => {
      const { data, error } = await supabaseServerClient
        .from("places")
        .select("id,slug,name,status,updated_at")
        .eq("status", "published")
        .order("updated_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; slug: string; name: string; status: "published"; updated_at: string }>;
    })(),
  ]);

  const placeRegionIds = markers.map((m) => m.leaflet_region_id ?? "").filter(Boolean);
  const layers = await buildPlacesMapLayersV1({ placeRegionIds });

  const featuredBase = pickFeaturedBirdsV1({
    birds: publishedBirds.map((bird) => ({
      id: bird.id,
      slug: bird.slug,
      name_hu: bird.name_hu,
      visibility_category: bird.visibility_category ?? null,
    })),
    count: 5,
  });

  const spotlightPlaces: SpotlightPlaceV1[] = [];
  for (const place of publishedPlaces) {
    if (spotlightPlaces.length >= 3) break;

    const contentBlock = await getLatestApprovedContentBlockForPlace(place.id);
    if (!contentBlock?.blocks_json) continue;

    const parsed = placeUiVariantsSchemaV1.safeParse(contentBlock.blocks_json);
    if (!parsed.success) continue;

    const heroImage = await getApprovedCurrentPlaceHeroImage(place.id);
    const heroImageSrc = heroImage?.storage_path ? await getSignedImageUrl(heroImage.storage_path) : null;

    const placeBirdLinks = await listApprovedPublishedBirdLinksForPlace(place.id);
    const placeBirds = uniqueById(
      placeBirdLinks
        .map((row) => row.bird)
        .filter((bird): bird is NonNullable<typeof bird> => Boolean(bird))
        .map((bird) => ({ id: bird.id, slug: bird.slug, name_hu: bird.name_hu }))
    ).slice(0, 5);

    spotlightPlaces.push({
      id: place.id,
      slug: place.slug,
      name: place.name,
      teaser: parsed.data.variants.teaser ?? null,
      short: parsed.data.variants.short ?? null,
      hero_image_src: heroImageSrc ?? null,
      birds: placeBirds.map((bird) => ({ ...bird, iconic_src: null })),
    });
  }

  const birdIdsToResolve = Array.from(
    new Set([
      ...featuredBase.map((bird) => bird.id),
      ...spotlightPlaces.flatMap((place) => place.birds.map((bird) => bird.id)),
    ])
  );

  const iconicImages = await listApprovedCurrentIconicImagesForBirds(birdIdsToResolve);
  const iconicSrcByBirdId = new Map<string, string | null>();
  await Promise.all(
    iconicImages.map(async (row) => {
      const url = row.storage_path ? await getSignedImageUrl(row.storage_path) : null;
      iconicSrcByBirdId.set(row.entity_id, url ?? null);
    })
  );

  const featured_birds: FeaturedBirdV1[] = featuredBase.map((bird) => ({
    id: bird.id,
    slug: bird.slug,
    name_hu: bird.name_hu,
    visibility_category: bird.visibility_category ?? null,
    visibility_label_hu: visibilityLabelHu(bird.visibility_category ?? null),
    iconic_src: iconicSrcByBirdId.get(bird.id) ?? null,
  }));

  const spotlight_places: SpotlightPlaceV1[] = spotlightPlaces.map((place) => ({
    ...place,
    birds: place.birds.map((bird) => ({
      ...bird,
      iconic_src: iconicSrcByBirdId.get(bird.id) ?? null,
    })),
  }));

  return {
    places_map: { markers, layers },
    featured_birds,
    spotlight_places,
  };
}
