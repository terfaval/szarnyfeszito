import { NextResponse } from "next/server";
import { getBirdBySlug } from "@/lib/birdService";
import { getLatestApprovedContentBlockForBird } from "@/lib/contentService";
import {
  computeHabitatStockAssetKeysForPlaceTypes,
  getSignedApprovedHabitatTileUrlsByAssetKeys,
  listHabitatStockAssets,
} from "@/lib/habitatStockAssetService";
import { getSignedImageUrl, listApprovedCurrentIconicImagesForBirds } from "@/lib/imageService";
import { supabaseServerClient } from "@/lib/supabaseServerClient";
import type { PlaceType } from "@/types/place";

type PlaceLinkRow = {
  place?: { place_type?: unknown; status?: unknown } | null;
};

export async function GET(_request: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const bird = await getBirdBySlug(slug);

  if (!bird || bird.status !== "published") {
    return NextResponse.json({ error: "A madár nem található." }, { status: 404 });
  }

  const content = await getLatestApprovedContentBlockForBird(bird.id);
  if (!content) {
    return NextResponse.json({ error: "A madár tartalma nem elérhető." }, { status: 404 });
  }

  const [iconicImages, habitatAssets] = await Promise.all([
    listApprovedCurrentIconicImagesForBirds([bird.id]),
    listHabitatStockAssets(),
  ]);

  const iconicImage = iconicImages[0] ?? null;
  const iconicSrc = iconicImage?.storage_path ? await getSignedImageUrl(iconicImage.storage_path) : null;

  const { data: placeLinkRows, error } = await supabaseServerClient
    .from("place_birds")
    .select("place:places!place_birds_place_id_fkey(place_type,status)")
    .eq("bird_id", bird.id)
    .eq("review_status", "approved")
    .limit(2000);

  if (error) {
    throw error;
  }

  const placeTypes: PlaceType[] = [];
  (placeLinkRows ?? []).forEach((row) => {
    const r = row as PlaceLinkRow;
    const place = r?.place ?? null;
    const status = typeof place?.status === "string" ? place.status : "";
    if (status !== "published") return;
    const placeType = typeof place?.place_type === "string" ? place.place_type : "";
    if (!placeType) return;
    placeTypes.push(placeType as PlaceType);
  });

  let habitatKey: string | null = null;
  if (placeTypes.length > 0) {
    const keys = computeHabitatStockAssetKeysForPlaceTypes({
      placeTypes: Array.from(new Set(placeTypes)),
      assets: habitatAssets,
    });
    habitatKey = keys[0] ?? null;
  }
  if (!habitatKey && Array.isArray(bird.habitat_stock_asset_keys)) {
    habitatKey = bird.habitat_stock_asset_keys[0] ?? null;
  }

  const habitatUrlByKey = habitatKey
    ? await getSignedApprovedHabitatTileUrlsByAssetKeys([habitatKey])
    : new Map<string, string | null>();
  const habitatSrc = habitatKey ? habitatUrlByKey.get(habitatKey) ?? null : null;

  return NextResponse.json({
    data: {
      bird: {
        id: bird.id,
        slug: bird.slug,
        name_hu: bird.name_hu,
        name_latin: bird.name_latin ?? null,
        size_category: bird.size_category ?? null,
        visibility_category: bird.visibility_category ?? null,
        color_tags: bird.color_tags ?? [],
      },
      content: {
        short: content.short ?? "",
        long: content.long ?? "",
        feature_block: content.feature_block ?? [],
        did_you_know: content.did_you_know ?? "",
        ethics_tip: content.ethics_tip ?? "",
      },
      media: {
        iconic_src: iconicSrc,
        habitat_key: habitatKey,
        habitat_src: habitatSrc ?? null,
      },
    },
  });
}
