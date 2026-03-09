import { Card } from "@/ui/components/Card";
import { isUuid } from "@/lib/birdService";
import { getPlaceById, getPlaceBySlug } from "@/lib/placeService";
import { getLatestApprovedContentBlockForPlace } from "@/lib/placeContentService";
import PlacePublishAction from "@/components/admin/PlacePublishAction";

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

  return (
    <Card className="place-panel place-publish stack">
      <PlacePublishAction place={place} missing={missing} />
    </Card>
  );
}
