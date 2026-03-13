import { NextResponse } from "next/server";
import { getPublicPlacesMapV1 } from "@/lib/publicRead";
import { publicApiCacheControlValue } from "@/lib/publicRead/cache";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const includeLayers = url.searchParams.get("include_layers") === "1";
  const includeMarkers = url.searchParams.get("include_markers") !== "0";
  const regionIdsParam = url.searchParams.get("region_ids");

  const out = await getPublicPlacesMapV1({
    includeLayers,
    includeMarkers,
    regionIdsCsv: regionIdsParam,
  });

  return NextResponse.json(
    {
      data: {
        markers: out.markers,
        layers: out.layers,
        place_region_ids: out.place_region_ids,
      },
    },
    {
      headers: {
        "cache-control": publicApiCacheControlValue(),
        "x-public-generated-at": out.generatedAtIso,
      },
    }
  );
}
