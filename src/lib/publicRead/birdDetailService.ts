import { unstable_cache } from "next/cache";

import { getBirdById, getBirdBySlug, isUuid } from "@/lib/birdService";
import { getLatestApprovedContentBlockForBird } from "@/lib/contentService";
import {
  computeHabitatStockAssetKeysForPlaceTypes,
  getSignedApprovedHabitatTileUrlsByAssetKeys,
  listApprovedPublishedPlaceTypesForBird,
  listHabitatStockAssets,
} from "@/lib/habitatStockAssetService";
import { getSignedImageUrl, listApprovedCurrentIconicImagesForBirds } from "@/lib/imageService";
import type { BirdColorTag, BirdSizeCategory, BirdVisibilityCategory } from "@/types/bird";
import type { FeatureBlock } from "@/types/content";

export type PublicBirdDetailV1 = {
  generatedAtIso: string;
  bird: {
    id: string;
    slug: string;
    name_hu: string;
    name_latin: string | null;
    size_category: BirdSizeCategory | null;
    visibility_category: BirdVisibilityCategory | null;
    color_tags: BirdColorTag[] | null;
  };
  content: {
    short: string;
    long: string;
    feature_block: FeatureBlock[];
    did_you_know: string;
    ethics_tip: string;
  };
  iconicSrc: string | null;
  habitatKey: string | null;
  habitatSrc: string | null;
};

async function buildPublicBirdDetailV1(key: string): Promise<PublicBirdDetailV1 | null> {
  const generatedAtIso = new Date().toISOString();

  const bird = isUuid(key) ? await getBirdById(key) : await getBirdBySlug(key);
  if (!bird || bird.status !== "published") return null;

  const content = await getLatestApprovedContentBlockForBird(bird.id);
  if (!content) return null;

  const [iconicImages, habitatAssets, placeTypes] = await Promise.all([
    listApprovedCurrentIconicImagesForBirds([bird.id]),
    listHabitatStockAssets(),
    listApprovedPublishedPlaceTypesForBird(bird.id),
  ]);

  const iconicImage = iconicImages[0] ?? null;
  const iconicSrc = iconicImage?.storage_path ? await getSignedImageUrl(iconicImage.storage_path) : null;

  let habitatKey: string | null = null;
  if (placeTypes.length > 0) {
    const keys = computeHabitatStockAssetKeysForPlaceTypes({
      placeTypes,
      assets: habitatAssets,
    });
    habitatKey = keys[0] ?? null;
  }
  if (!habitatKey && Array.isArray(bird.habitat_stock_asset_keys)) {
    habitatKey = bird.habitat_stock_asset_keys[0] ?? null;
  }

  const habitatUrlByKey = habitatKey ? await getSignedApprovedHabitatTileUrlsByAssetKeys([habitatKey]) : new Map();
  const habitatSrc = habitatKey ? habitatUrlByKey.get(habitatKey) ?? null : null;

  return {
    generatedAtIso,
    bird: {
      id: bird.id,
      slug: bird.slug,
      name_hu: bird.name_hu,
      name_latin: bird.name_latin ?? null,
      size_category: bird.size_category ?? null,
      visibility_category: bird.visibility_category ?? null,
      color_tags: bird.color_tags ?? null,
    },
    content: {
      short: content.short ?? "",
      long: content.long ?? "",
      feature_block: content.feature_block ?? [],
      did_you_know: content.did_you_know ?? "",
      ethics_tip: content.ethics_tip ?? "",
    },
    iconicSrc,
    habitatKey,
    habitatSrc,
  };
}

const getPublicBirdDetailV1Cached = unstable_cache(
  async (key: string) => buildPublicBirdDetailV1(key),
  ["public-bird-detail-v1"],
  { revalidate: 120 }
);

export async function getPublicBirdDetailV1(key: string): Promise<PublicBirdDetailV1 | null> {
  const normalizedKey = typeof key === "string" ? key.trim() : "";
  if (!normalizedKey) {
    return null;
  }

  return getPublicBirdDetailV1Cached(normalizedKey);
}
