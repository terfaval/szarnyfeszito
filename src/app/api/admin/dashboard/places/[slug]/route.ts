import { NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { getPlaceBySlug } from "@/lib/placeService";
import { getLatestApprovedContentBlockForPlace } from "@/lib/placeContentService";
import { placeUiVariantsSchemaV1 } from "@/lib/placeContentSchema";
import { listApprovedPublishedBirdLinksForPlace } from "@/lib/placeBirdService";
import { getCurrentSeasonKey } from "@/lib/season";

export const dynamic = "force-dynamic";

function isBirdVisibleInSeason(
  row: Awaited<ReturnType<typeof listApprovedPublishedBirdLinksForPlace>>[number],
  season: ReturnType<typeof getCurrentSeasonKey>
) {
  if (season === "spring") return row.visible_in_spring;
  if (season === "summer") return row.visible_in_summer;
  if (season === "autumn") return row.visible_in_autumn;
  return row.visible_in_winter;
}

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

  const currentSeason = getCurrentSeasonKey();
  const approvedContent = await getLatestApprovedContentBlockForPlace(place.id);
  const parsedContent =
    approvedContent?.review_status === "approved" && approvedContent.blocks_json
      ? placeUiVariantsSchemaV1.safeParse(approvedContent.blocks_json)
      : null;

  const variants =
    parsedContent && parsedContent.success ? parsedContent.data.variants : null;

  const placeBirds = await listApprovedPublishedBirdLinksForPlace(place.id);
  const seasonalTopBirds = placeBirds
    .filter((row) => isBirdVisibleInSeason(row, currentSeason))
    .slice(0, 5)
    .map((row) => ({
      id: row.bird?.id ?? "",
      slug: row.bird?.slug ?? "",
      name_hu: row.bird?.name_hu ?? "",
      rank: row.rank,
      frequency_band: row.frequency_band,
      is_iconic: row.is_iconic,
    }))
    .filter((row) => Boolean(row.id));

  return NextResponse.json({
    data: {
      place: {
        id: place.id,
        slug: place.slug,
        name: place.name,
        place_type: place.place_type,
        county: place.county,
        nearest_city: place.nearest_city,
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

