import { unstable_cache } from "next/cache";

import { buildPlacesMapLayersV1 } from "@/lib/placesMapLayers";
import { listPublishedPlaceMarkers } from "@/lib/placeService";
import { logPublicReadRegenerate, PUBLIC_READ_REVALIDATE_SECONDS } from "@/lib/publicRead/cache";

export type PublicPlacesMapV1 = {
  generatedAtIso: string;
  markers: Awaited<ReturnType<typeof listPublishedPlaceMarkers>>;
  layers: Awaited<ReturnType<typeof buildPlacesMapLayersV1>> | null;
  place_region_ids: string[];
};

function parseCsv(value: string | null) {
  return (value ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

async function buildPublicPlacesMarkersV1() {
  const generatedAtIso = new Date().toISOString();
  const markers = await listPublishedPlaceMarkers();
  logPublicReadRegenerate("placesMarkersV1", { generatedAtIso, markers: markers.length });
  return { generatedAtIso, markers };
}

const getPublicPlacesMarkersV1Cached = unstable_cache(
  async () => buildPublicPlacesMarkersV1(),
  ["public-places-markers-v1"],
  { revalidate: PUBLIC_READ_REVALIDATE_SECONDS }
);

export async function getPublicPlacesMarkersV1() {
  return getPublicPlacesMarkersV1Cached();
}

async function buildPublicPlacesLayersV1(args: { regionIds: string[] }) {
  const generatedAtIso = new Date().toISOString();
  const regionIds = Array.from(new Set(args.regionIds.map((id) => id.trim()).filter(Boolean))).sort();
  const layers = await buildPlacesMapLayersV1({ placeRegionIds: regionIds });
  logPublicReadRegenerate("placesLayersV1", { generatedAtIso, regions: regionIds.length });
  return { generatedAtIso, regionIds, layers };
}

const getPublicPlacesLayersV1Cached = unstable_cache(
  async (regionIdsCsv: string) => {
    const regionIds = parseCsv(regionIdsCsv);
    return buildPublicPlacesLayersV1({ regionIds });
  },
  ["public-places-layers-v1"],
  { revalidate: PUBLIC_READ_REVALIDATE_SECONDS }
);

export async function getPublicPlacesMapV1(args: {
  includeLayers: boolean;
  includeMarkers: boolean;
  regionIdsCsv: string | null;
}): Promise<PublicPlacesMapV1> {
  const generatedAtIso = new Date().toISOString();
  const includeLayers = args.includeLayers;
  const includeMarkers = args.includeMarkers;

  const markersPayload = includeMarkers ? await getPublicPlacesMarkersV1() : null;
  const markers = markersPayload?.markers ?? [];

  const regionIdsFromParam = parseCsv(args.regionIdsCsv);
  const placeRegionIds = regionIdsFromParam.length > 0 ? regionIdsFromParam : markers.map((m) => m.leaflet_region_id ?? "").filter(Boolean);

  const layersPayload = includeLayers ? await getPublicPlacesLayersV1Cached(placeRegionIds.join(",")) : null;
  const layers = layersPayload?.layers ?? null;

  return {
    generatedAtIso,
    markers,
    layers,
    place_region_ids: placeRegionIds,
  };
}

