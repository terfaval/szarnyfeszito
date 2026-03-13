import { NextResponse } from "next/server";
import { listPublishedPlaceMarkers } from "@/lib/placeService";
import { buildPlacesMapLayersV1 } from "@/lib/placesMapLayers";

function parseCsv(value: string | null) {
  return (value ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const includeLayers = url.searchParams.get("include_layers") === "1";
  const includeMarkers = url.searchParams.get("include_markers") !== "0";
  const regionIdsParam = url.searchParams.get("region_ids");

  const regionIdsFromParam = parseCsv(regionIdsParam);

  const markers = includeMarkers ? await listPublishedPlaceMarkers() : [];
  const placeRegionIds =
    regionIdsFromParam.length > 0
      ? regionIdsFromParam
      : markers.map((m) => m.leaflet_region_id ?? "").filter(Boolean);

  const layers = includeLayers ? await buildPlacesMapLayersV1({ placeRegionIds }) : null;

  return NextResponse.json({
    data: {
      markers,
      layers,
      place_region_ids: placeRegionIds,
    },
  });
}
