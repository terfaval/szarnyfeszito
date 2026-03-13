import { getPublicBirdsIndexV1, getPublicLandingReadV1, getPublicPlacesListV1, getPublicPlacesMarkersV1 } from "@/lib/publicRead";
import { jsonByteSize } from "@/lib/publicRead/cache";

function okJson(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body, null, 2), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init.headers ?? {}),
    },
  });
}

function requireObsToken(request: Request) {
  const expected = process.env.PUBLIC_OBS_TOKEN ?? "";
  if (!expected) return { ok: false as const, status: 501, message: "PUBLIC_OBS_TOKEN not configured." };
  const provided = request.headers.get("x-obs-token") ?? "";
  if (provided !== expected) return { ok: false as const, status: 403, message: "Forbidden." };
  return { ok: true as const };
}

export async function GET(request: Request) {
  const token = requireObsToken(request);
  if (!token.ok) {
    return okJson({ error: token.message }, { status: token.status });
  }

  const nowIso = new Date().toISOString();
  const [landing, birdsIndex, placesList, placesMarkers] = await Promise.all([
    getPublicLandingReadV1(),
    getPublicBirdsIndexV1(),
    getPublicPlacesListV1(),
    getPublicPlacesMarkersV1(),
  ]);

  return okJson(
    {
      nowIso,
      generatedAt: {
        landing: landing.generatedAtIso,
        birdsIndex: birdsIndex.generatedAtIso,
        placesList: placesList.generatedAtIso,
        placesMarkers: placesMarkers.generatedAtIso,
      },
      counts: {
        landingFeaturedBirds: landing.featured_birds.length,
        landingSpotlightPlaces: landing.spotlight_places.length,
        birdsIndexBirds: birdsIndex.birds.length,
        placesListPlaces: placesList.places.length,
        placesMarkers: placesMarkers.markers.length,
      },
      payloadBytesApprox: {
        landingJsonBytes: jsonByteSize(landing),
        birdsIndexJsonBytes: jsonByteSize(birdsIndex),
        placesListJsonBytes: jsonByteSize(placesList),
        placesMarkersJsonBytes: jsonByteSize(placesMarkers),
      },
    },
    { headers: { "cache-control": "no-store" } }
  );
}

