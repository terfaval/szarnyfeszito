import { NextResponse } from "next/server";
import { getPublicBirdDetailV1 } from "@/lib/publicRead";
import { publicApiCacheControlValue } from "@/lib/publicRead/cache";

export const revalidate = 120;

export async function GET(_request: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const detail = await getPublicBirdDetailV1(slug);

  if (!detail) {
    return NextResponse.json({ error: "A madár nem található." }, { status: 404 });
  }

  return NextResponse.json(
    {
      data: {
        bird: detail.bird,
        content: detail.content,
        media: {
          iconic_src: detail.iconicSrc,
          habitat_key: detail.habitatKey,
          habitat_src: detail.habitatSrc ?? null,
        },
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
