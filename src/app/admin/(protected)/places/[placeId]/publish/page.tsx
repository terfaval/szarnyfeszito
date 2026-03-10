import { Card } from "@/ui/components/Card";
import { isUuid } from "@/lib/birdService";
import { getPlaceById, getPlaceBySlug, getPlaceMarkerById } from "@/lib/placeService";
import { getLatestApprovedContentBlockForPlace } from "@/lib/placeContentService";
import { listApprovedPublishedBirdLinksForPlace } from "@/lib/placeBirdService";
import { getCurrentPlaceHeroImage, listApprovedCurrentIconicImagesForBirds, getSignedImageUrl } from "@/lib/imageService";
import { getCurrentSeasonKey } from "@/lib/season";
import { getDistributionRegionBboxesById, getDistributionRegionGeometriesById } from "@/lib/distributionRegionCatalogService";
import PlacePublishAction from "@/components/admin/PlacePublishAction";
import PlaceHeroImagePanel from "@/components/admin/PlaceHeroImagePanel";
import PlacePublishPreview from "@/components/admin/PlacePublishPreview";
import type { GeoJsonObject } from "geojson";

export const metadata = {
  title: "Place publish — Szárnyfeszítő Admin",
};

export const dynamic = "force-dynamic";

function nonEmpty(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

export default async function PlacePublishPage({
  params,
}: {
  params: Promise<{ placeId: string }>;
}) {
  const { placeId } = await params;
  const place = isUuid(placeId) ? await getPlaceById(placeId) : await getPlaceBySlug(placeId);

  if (!place) {
    return (
      <Card className="admin-stat-card admin-stat-card--note">
        Place not found.
      </Card>
    );
  }

  const approved = await getLatestApprovedContentBlockForPlace(place.id);
  const currentSeason = getCurrentSeasonKey();
  const marker = await getPlaceMarkerById(place.id);

  const heroImage = await getCurrentPlaceHeroImage(place.id);
  const heroPreviewUrl = heroImage?.storage_path ? await getSignedImageUrl(heroImage.storage_path) : null;
  const heroImageWithPreview = heroImage ? { ...heroImage, previewUrl: heroPreviewUrl } : null;
  const heroApprovedUrl = heroImage?.review_status === "approved" ? heroPreviewUrl : null;

  const leafletRegionId = place.leaflet_region_id?.trim() ?? "";
  let leafletRegion: { geojson: GeoJsonObject | null; bbox: { south: number; west: number; north: number; east: number } | null } =
    { geojson: null, bbox: null };
  if (leafletRegionId) {
    try {
      const [geoById, bboxById] = await Promise.all([
        getDistributionRegionGeometriesById([leafletRegionId]),
        getDistributionRegionBboxesById([leafletRegionId]),
      ]);
      leafletRegion = {
        geojson: (geoById[leafletRegionId] as GeoJsonObject | undefined) ?? null,
        bbox: bboxById[leafletRegionId] ?? null,
      };
    } catch {
      leafletRegion = { geojson: null, bbox: null };
    }
  }

  const placeBirds = await listApprovedPublishedBirdLinksForPlace(place.id);

  const isBirdVisibleInSeason = (row: (typeof placeBirds)[number]) => {
    if (currentSeason === "spring") return row.visible_in_spring;
    if (currentSeason === "summer") return row.visible_in_summer;
    if (currentSeason === "autumn") return row.visible_in_autumn;
    return row.visible_in_winter;
  };

  const seasonalBirdRows = placeBirds.filter(isBirdVisibleInSeason);
  const birdIds = seasonalBirdRows.map((row) => row.bird?.id).filter((id): id is string => Boolean(id));
  const iconicRows = await listApprovedCurrentIconicImagesForBirds(birdIds);
  const storagePathByBirdId = new Map(iconicRows.map((row) => [row.entity_id, row.storage_path]));
  const signedPairs = await Promise.all(
    birdIds.map(async (birdId) => {
      const storagePath = storagePathByBirdId.get(birdId) ?? null;
      const signedUrl = storagePath ? await getSignedImageUrl(storagePath) : null;
      return [birdId, signedUrl] as const;
    })
  );
  const iconicUrlByBirdId = new Map(signedPairs);

  const previewBirds = seasonalBirdRows
    .filter((row) => row.bird)
    .map((row) => ({
      id: row.bird!.id,
      slug: row.bird!.slug,
      name_hu: row.bird!.name_hu,
      rank: row.rank,
      iconicSrc: iconicUrlByBirdId.get(row.bird!.id) ?? null,
    }));

  const missing: string[] = [];
  if (!nonEmpty(place.name)) missing.push("name");
  if (!nonEmpty(place.slug)) missing.push("slug");
  if (!nonEmpty(place.place_type)) missing.push("place_type");
  if (!nonEmpty(place.region_landscape)) missing.push("region_landscape");
  if (!nonEmpty(place.county)) missing.push("county");
  if (!nonEmpty(place.nearest_city)) missing.push("nearest_city");

  if (!approved || !approved.blocks_json) {
    missing.push("approved_content");
  } else {
    const variants = approved.blocks_json.variants;
    const seasonal = variants.seasonal_snippet;
    if (!nonEmpty(variants.short)) missing.push("content.short");
    if (!nonEmpty(variants.ethics_tip)) missing.push("content.ethics_tip");
    if (
      !nonEmpty(seasonal.spring) ||
      !nonEmpty(seasonal.summer) ||
      !nonEmpty(seasonal.autumn) ||
      !nonEmpty(seasonal.winter)
    ) {
      missing.push("content.seasonal_snippet");
    }
  }

  if (!heroImage || heroImage.review_status !== "approved") {
    missing.push("image.place_hero_spring_v1");
  }

  return (
    <Card className="place-panel place-publish stack">
      <PlaceHeroImagePanel placeId={place.id} placeStatus={place.status} image={heroImageWithPreview} />
      <PlacePublishAction place={place} missing={missing} />
      <PlacePublishPreview
        place={place}
        marker={marker}
        leafletRegion={leafletRegion}
        content={approved?.blocks_json ?? null}
        heroImageUrl={heroApprovedUrl}
        currentSeason={currentSeason}
        birds={previewBirds}
        showSeasonal={place.status === "published" || missing.length === 0}
      />
    </Card>
  );
}
