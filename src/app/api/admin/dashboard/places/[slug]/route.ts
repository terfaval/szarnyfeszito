import { NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { getPlaceBySlug } from "@/lib/placeService";
import { getLatestApprovedContentBlockForPlace } from "@/lib/placeContentService";
import { placeUiVariantsSchemaV1 } from "@/lib/placeContentSchema";
import { listApprovedPublishedBirdLinksForPlace } from "@/lib/placeBirdService";
import { getCurrentSeasonKey } from "@/lib/season";
import { listApprovedCurrentIconicImagesForBirds, getSignedImageUrl } from "@/lib/imageService";
import {
  getSignedApprovedHabitatTileUrlsByAssetKeys,
  listHabitatStockAssets,
  resolveHabitatStockAssetKeyForPlaceType,
} from "@/lib/habitatStockAssetService";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, ctx: { params: Promise<{ slug: string }> }) {
  const admin = await getAdminUserFromCookies();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await ctx.params;
  const place = await getPlaceBySlug(slug);
  if (!place || place.status !== "published") {
    return NextResponse.json({ error: "Place not found." }, { status: 404 });
  }

  const habitatAssets = await listHabitatStockAssets();
  const habitatKey = resolveHabitatStockAssetKeyForPlaceType({
    placeType: place.place_type,
    assets: habitatAssets,
  });
  const habitatUrlByKey = habitatKey
    ? await getSignedApprovedHabitatTileUrlsByAssetKeys([habitatKey])
    : new Map();
  const habitatSrc = habitatKey ? habitatUrlByKey.get(habitatKey) ?? null : null;

  const currentSeason = getCurrentSeasonKey();
  const approvedContent = await getLatestApprovedContentBlockForPlace(place.id);
  const parsedContent =
    approvedContent?.review_status === "approved" && approvedContent.blocks_json
      ? placeUiVariantsSchemaV1.safeParse(approvedContent.blocks_json)
      : null;

  const variants =
    parsedContent && parsedContent.success ? parsedContent.data.variants : null;

  const placeBirds = await listApprovedPublishedBirdLinksForPlace(place.id);
  const seasonalRows = placeBirds
    .slice(0, 6)
    .map((row) => ({
      id: row.bird?.id ?? "",
      slug: row.bird?.slug ?? "",
      name_hu: row.bird?.name_hu ?? "",
      name_latin: row.bird?.name_latin ?? "",
      rank: row.rank,
      frequency_band: row.frequency_band,
      is_iconic: row.is_iconic,
    }))
    .filter((row) => Boolean(row.id));

  const uniqueBirdIds = Array.from(new Set(seasonalRows.map((row) => row.id))).filter(Boolean);
  const iconicRows = await listApprovedCurrentIconicImagesForBirds(uniqueBirdIds);
  const storageByBirdId = new Map(iconicRows.map((row) => [row.entity_id, row.storage_path]));
  const iconicPairs = await Promise.all(
    uniqueBirdIds.map(async (birdId) => {
      const storagePath = storageByBirdId.get(birdId) ?? null;
      const signed = storagePath ? await getSignedImageUrl(storagePath) : null;
      return [birdId, signed] as const;
    })
  );
  const iconicUrlByBirdId = new Map(iconicPairs);

  const seasonalTopBirds = seasonalRows.map((row) => ({
    ...row,
    iconic_src: iconicUrlByBirdId.get(row.id) ?? null,
  }));

  return NextResponse.json({
    data: {
      place: {
        id: place.id,
        slug: place.slug,
        name: place.name,
        place_type: place.place_type,
        county: place.county,
        nearest_city: place.nearest_city,
        habitat_src: habitatSrc,
      },
      content: {
        short: variants?.short ?? "",
        seasonal_snippet: variants?.seasonal_snippet?.[currentSeason] ?? "",
        season: currentSeason,
      },
      birds: seasonalTopBirds,
    },
  });
}
