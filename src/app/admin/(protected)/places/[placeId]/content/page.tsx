import { Card } from "@/ui/components/Card";
import { isUuid } from "@/lib/birdService";
import { getPlaceById, getPlaceBySlug } from "@/lib/placeService";
import { getLatestApprovedContentBlockForPlace, getLatestContentBlockForPlace } from "@/lib/placeContentService";
import PlaceContentReview from "@/components/admin/PlaceContentReview";

export const metadata = {
  title: "Place content — Szárnyfeszítő Admin",
};

export const dynamic = "force-dynamic";

export default async function PlaceContentPage({
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

  const latest = await getLatestContentBlockForPlace(place.id);
  const latestApproved = await getLatestApprovedContentBlockForPlace(place.id);

  return (
    <Card className="place-panel place-content stack">
      <PlaceContentReview place={place} latest={latest} latestApproved={latestApproved} />
    </Card>
  );
}

