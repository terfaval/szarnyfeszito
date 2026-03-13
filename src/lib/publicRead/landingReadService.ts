import { unstable_cache } from "next/cache";

import { getPublicLandingV1 } from "@/lib/landingService";
import { logPublicReadRegenerate, PUBLIC_READ_REVALIDATE_SECONDS } from "@/lib/publicRead/cache";

export type PublicLandingReadV1 = Awaited<ReturnType<typeof getPublicLandingV1>> & { generatedAtIso: string };

async function buildPublicLandingReadV1(): Promise<PublicLandingReadV1> {
  const generatedAtIso = new Date().toISOString();
  const landing = await getPublicLandingV1();
  logPublicReadRegenerate("landingV1", {
    generatedAtIso,
    featuredBirds: landing.featured_birds.length,
    spotlightPlaces: landing.spotlight_places.length,
    markers: landing.places_map.markers.length,
  });
  return { ...landing, generatedAtIso };
}

const getPublicLandingReadV1Cached = unstable_cache(
  async () => buildPublicLandingReadV1(),
  ["public-landing-read-v1"],
  { revalidate: PUBLIC_READ_REVALIDATE_SECONDS }
);

export async function getPublicLandingReadV1(): Promise<PublicLandingReadV1> {
  return getPublicLandingReadV1Cached();
}

