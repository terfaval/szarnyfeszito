import { NextResponse } from "next/server";
import { filterPublicBirdsIndexV1, getPublicBirdsIndexV1 } from "@/lib/publicRead";
import { publicApiCacheControlValue } from "@/lib/publicRead/cache";

export const revalidate = 120;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const index = await getPublicBirdsIndexV1();
  const { birds, filters } = filterPublicBirdsIndexV1({
    index,
    query: {
      search: url.searchParams.get("search") ?? "",
      size_category: url.searchParams.get("size_category") ?? "",
      visibility_category: url.searchParams.get("visibility_category") ?? "",
      color_tags: url.searchParams.get("color_tags") ?? "",
      place_type: url.searchParams.get("place_type") ?? "",
      region: url.searchParams.get("region") ?? "",
      place: url.searchParams.get("place") ?? "",
    },
  });

  return NextResponse.json(
    {
      data: { birds, filters },
    },
    {
      headers: {
        "cache-control": publicApiCacheControlValue(),
        "x-public-generated-at": index.generatedAtIso,
      },
    }
  );
}
