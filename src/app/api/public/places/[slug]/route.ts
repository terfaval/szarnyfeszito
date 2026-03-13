import { NextResponse } from "next/server";
import { supabaseServerClient } from "@/lib/supabaseServerClient";
import { getPlaceBySlug, getPlaceMarkerById } from "@/lib/placeService";
import { getLatestApprovedContentBlockForPlace } from "@/lib/placeContentService";
import { placeUiVariantsSchemaV1 } from "@/lib/placeContentSchema";
import { getCurrentSeasonKey } from "@/lib/season";
import { getSignedImageUrl, listApprovedCurrentIconicImagesForBirds } from "@/lib/imageService";
import { listLatestApprovedContentBlocksForBirds } from "@/lib/contentService";

export async function GET(_request: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const place = await getPlaceBySlug(slug);

  if (!place || place.status !== "published") {
    return NextResponse.json({ error: "A helyszín nem található." }, { status: 404 });
  }

  const contentBlock = await getLatestApprovedContentBlockForPlace(place.id);
  if (!contentBlock || contentBlock.review_status !== "approved" || !contentBlock.blocks_json) {
    return NextResponse.json({ error: "A helyszín tartalma nem elérhető." }, { status: 404 });
  }

  const parsedContent = placeUiVariantsSchemaV1.safeParse(contentBlock.blocks_json);
  if (!parsedContent.success) {
    console.error("Invalid published place content payload", {
      place_id: place.id,
      block_id: contentBlock.id,
      issues: parsedContent.error.issues,
    });
    return NextResponse.json({ error: "A helyszín tartalma nem elérhető." }, { status: 404 });
  }

  const { data: birdLinks, error } = await supabaseServerClient
    .from("place_birds")
    .select(
      "id,place_id,bird_id,pending_bird_name_hu,review_status,rank,frequency_band,is_iconic,visible_in_spring,visible_in_summer,visible_in_autumn,visible_in_winter,seasonality_note,bird:birds(id,slug,name_hu,status)"
    )
    .eq("place_id", place.id)
    .eq("review_status", "approved")
    .not("bird_id", "is", null)
    .order("rank", { ascending: true });

  if (error) {
    throw error;
  }

  const publishedBirdLinks = (birdLinks ?? [])
    .map((row) => {
      const bird = (row as { bird?: { id?: unknown; slug?: unknown; name_hu?: unknown; status?: unknown } | null }).bird;
      if (!bird || bird.status !== "published") {
        return null;
      }
      return {
        ...row,
        bird: { id: bird.id, slug: bird.slug, name_hu: bird.name_hu },
      };
    })
    .filter(Boolean);

  const currentSeason = getCurrentSeasonKey();
  const isVisibleInSeason = (row: (typeof publishedBirdLinks)[number]) => {
    const r = row as { visible_in_spring?: unknown; visible_in_summer?: unknown; visible_in_autumn?: unknown; visible_in_winter?: unknown };
    if (currentSeason === "spring") return Boolean(r.visible_in_spring);
    if (currentSeason === "summer") return Boolean(r.visible_in_summer);
    if (currentSeason === "autumn") return Boolean(r.visible_in_autumn);
    return Boolean(r.visible_in_winter);
  };

  const visibleBirdLinks = publishedBirdLinks.filter(isVisibleInSeason);
  const visibleBirdIds = visibleBirdLinks
    .map((row) => ((row as { bird?: { id?: unknown } | null }).bird?.id as string | undefined) ?? "")
    .filter(Boolean);

  const approvedContentByBirdId = await listLatestApprovedContentBlocksForBirds(visibleBirdIds);
  const publicBirdIds = visibleBirdIds.filter((birdId) => approvedContentByBirdId.has(birdId));
  const publicBirdIdSet = new Set(publicBirdIds);
  const publicBirdLinks = visibleBirdLinks.filter((row) => {
    const birdId = ((row as { bird?: { id?: unknown } | null }).bird?.id as string | undefined) ?? "";
    return birdId ? publicBirdIdSet.has(birdId) : false;
  });

  const iconicRows = await listApprovedCurrentIconicImagesForBirds(publicBirdIds);
  const storagePathByBirdId = new Map(iconicRows.map((row) => [row.entity_id, row.storage_path]));
  const signedIconicPairs = await Promise.all(
    publicBirdIds.map(async (birdId) => {
      const storagePath = storagePathByBirdId.get(birdId) ?? null;
      const signedUrl = storagePath ? await getSignedImageUrl(storagePath) : null;
      return [birdId, signedUrl] as const;
    })
  );
  const iconicUrlByBirdId = new Map(signedIconicPairs);

  const birds = publicBirdLinks
    .map((row) => {
      const r = row as { rank?: unknown; frequency_band?: unknown; bird?: { id?: unknown; slug?: unknown; name_hu?: unknown } | null };
      const bird = r.bird ?? null;
      if (!bird || typeof bird.id !== "string" || typeof bird.slug !== "string" || typeof bird.name_hu !== "string") return null;
      return {
        id: bird.id,
        slug: bird.slug,
        name_hu: bird.name_hu,
        iconicSrc: iconicUrlByBirdId.get(bird.id) ?? null,
        rank: typeof r.rank === "number" ? r.rank : 0,
        frequency_band: typeof r.frequency_band === "string" ? r.frequency_band : "regular",
      };
    })
    .filter(Boolean);

  const marker = place.location_precision === "hidden" ? null : await getPlaceMarkerById(place.id);
  const safeMarker = marker ? { lat: marker.lat, lng: marker.lng } : null;

  const { data: heroRows, error: heroError } = await supabaseServerClient
    .from("images")
    .select("storage_path")
    .eq("entity_type", "place")
    .eq("variant", "place_hero_spring_v1")
    .eq("is_current", true)
    .eq("review_status", "approved")
    .eq("entity_id", place.id)
    .limit(1);

  if (heroError) {
    throw heroError;
  }

  const heroStoragePath = typeof (heroRows?.[0] as { storage_path?: unknown } | undefined)?.storage_path === "string"
    ? String((heroRows?.[0] as { storage_path?: unknown }).storage_path)
    : "";
  const heroImageUrl = heroStoragePath ? await getSignedImageUrl(heroStoragePath) : null;

  return NextResponse.json({
    data: {
      place: {
        id: place.id,
        slug: place.slug,
        name: place.name,
        place_type: place.place_type,
        status: place.status,
        leaflet_region_id: place.leaflet_region_id,
        region_landscape: place.region_landscape,
        county: place.county,
        district: place.district,
        nearest_city: place.nearest_city,
        distance_from_nearest_city_km: place.distance_from_nearest_city_km,
        settlement: place.settlement,
        location_precision: place.location_precision,
        sensitivity_level: place.sensitivity_level,
        is_beginner_friendly: place.is_beginner_friendly,
        access_note: place.access_note,
        parking_note: place.parking_note,
        best_visit_note: place.best_visit_note,
        notable_units_json: place.notable_units_json,
        updated_at: place.updated_at,
      },
      marker: safeMarker,
      content: parsedContent.data,
      place_birds: publicBirdLinks,
      current_season: currentSeason,
      hero_image_src: heroImageUrl,
      birds,
    },
  });
}
