import { NextResponse } from "next/server";
import { getPublicPlaceDetailV1 } from "@/lib/publicRead";
import { publicApiCacheControlValue } from "@/lib/publicRead/cache";

export const revalidate = 120;

export async function GET(_request: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const detail = await getPublicPlaceDetailV1(slug);

  if (!detail) {
    return NextResponse.json({ error: "A helyszín nem található." }, { status: 404 });
  }

  return NextResponse.json(
    {
      data: {
        place: detail.place,
        marker: detail.marker,
        content: detail.content,
        place_birds: detail.place_birds,
        current_season: detail.current_season,
        hero_image_src: detail.hero_image_src,
        birds: detail.birds,
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
