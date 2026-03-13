import { NextResponse } from "next/server";
import { filterPublicPlacesListV1, getPublicPlacesListV1 } from "@/lib/publicRead";
import { publicApiCacheControlValue } from "@/lib/publicRead/cache";

export const revalidate = 120;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const list = await getPublicPlacesListV1();
  const { places, filters } = filterPublicPlacesListV1({
    list,
    query: {
      search: url.searchParams.get("search") ?? "",
      place_type: url.searchParams.get("place_type") ?? "",
      region: url.searchParams.get("region") ?? "",
    },
  });

  return NextResponse.json(
    {
      data: { places, filters },
    },
    {
      headers: {
        "cache-control": publicApiCacheControlValue(),
        "x-public-generated-at": list.generatedAtIso,
      },
    }
  );
}
