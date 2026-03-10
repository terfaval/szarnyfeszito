import { NextResponse } from "next/server";
import { listPublishedPlaceMarkers } from "@/lib/placeService";
import { buildPlacesMapLayersV1 } from "@/lib/placesMapLayers";

export async function GET() {
  const markers = await listPublishedPlaceMarkers();
  const placeRegionIds = markers.map((m) => m.leaflet_region_id ?? "").filter(Boolean);
  const layers = await buildPlacesMapLayersV1({ placeRegionIds });
  return NextResponse.json({ data: { markers, layers } });
}
