import { NextResponse } from "next/server";
import { getPublicPlaceDetailV1 } from "@/lib/publicRead";
import { publicApiCacheControlValue } from "@/lib/publicRead/cache";

export const revalidate = 120;

export async function GET(_request: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const detail = await getPublicPlaceDetailV1(slug);

  if (!detail) {
    return NextResponse.json({ error: "A helyszĂ­n nem talĂˇlhatĂł." }, { status: 404 });
  }

  const variants = detail.content?.variants ?? null;
  const short = variants?.short ?? "";
  const seasonalSnippet = variants?.seasonal_snippet?.[detail.current_season] ?? "";

  return NextResponse.json(
    {
      data: {
        place: {
          id: detail.place.id,
          slug: detail.place.slug,
          name: detail.place.name,
          place_type: detail.place.place_type,
          county: detail.place.county,
          nearest_city: detail.place.nearest_city,
        },
        content: {
          short,
          seasonal_snippet: seasonalSnippet,
          season: detail.current_season,
        },
        birds: detail.birds.slice(0, 8).map((bird) => ({
          id: bird.id,
          slug: bird.slug,
          name_hu: bird.name_hu,
          rank: bird.rank,
          frequency_band: bird.frequency_band,
          is_iconic: Boolean(bird.iconicSrc),
        })),
      },
    },
    {
      headers: {
        "cache-control": publicApiCacheControlValue(),
        "x-public-generated-at": detail.generatedAtIso,
      },
    }
  );
}
