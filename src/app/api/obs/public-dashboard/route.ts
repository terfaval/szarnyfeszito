import { SIGNED_IMAGE_URL_TTL_SECONDS } from "@/lib/imageSigning";
import { getPublicDashboardV1, PUBLIC_DASHBOARD_REVALIDATE_SECONDS } from "@/lib/publicDashboardService";

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

function byteSizeJson(value: unknown) {
  const json = JSON.stringify(value);
  return Buffer.byteLength(json, "utf8");
}

export async function GET(request: Request) {
  const token = requireObsToken(request);
  if (!token.ok) {
    return okJson({ error: token.message }, { status: token.status });
  }

  const dashboard = await getPublicDashboardV1();
  const nowIso = new Date().toISOString();
  const ageSeconds = Math.max(
    0,
    Math.round((Date.parse(nowIso) - Date.parse(dashboard.generatedAtIso)) / 1000)
  );

  const layersBytes = byteSizeJson(dashboard.placesMap.layers);
  const markersBytes = byteSizeJson(dashboard.placesMap.markers);
  const spotlightBytes = byteSizeJson(dashboard.spotlightBirdsByGroup);

  return okJson(
    {
      nowIso,
      generatedAtIso: dashboard.generatedAtIso,
      ageSeconds,
      currentSeason: dashboard.currentSeason,
      policy: {
        publicDashboardRevalidateSeconds: PUBLIC_DASHBOARD_REVALIDATE_SECONDS,
        signedImageUrlTtlSeconds: SIGNED_IMAGE_URL_TTL_SECONDS,
      },
      counts: {
        markers: dashboard.placesMap.markers.length,
        spotlightWaterBirds: dashboard.spotlightBirdsByGroup.water.length,
        spotlightForestBirds: dashboard.spotlightBirdsByGroup.forest.length,
        spotlightMountainBirds: dashboard.spotlightBirdsByGroup.mountain.length,
        recentBirds: dashboard.recentBirds.length,
      },
      payloadBytesApprox: {
        mapLayersJsonBytes: layersBytes,
        markersJsonBytes: markersBytes,
        spotlightJsonBytes: spotlightBytes,
      },
    },
    {
      headers: {
        "cache-control": "no-store",
        "x-public-dashboard-generated-at": dashboard.generatedAtIso,
      },
    }
  );
}

