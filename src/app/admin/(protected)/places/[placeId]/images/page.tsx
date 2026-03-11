import { Card } from "@/ui/components/Card";
import { isUuid } from "@/lib/birdService";
import { getPlaceById, getPlaceBySlug } from "@/lib/placeService";
import { getCurrentPlaceHeroImage, getSignedImageUrl } from "@/lib/imageService";
import PlaceHeroImageReview from "@/components/admin/PlaceHeroImageReview";

export const metadata = {
  title: "Place images — Szárnyfeszítő Admin",
};

export const dynamic = "force-dynamic";

export default async function PlaceImagesPage({
  params,
}: {
  params: Promise<{ placeId: string }>;
}) {
  const { placeId } = await params;
  const place = isUuid(placeId) ? await getPlaceById(placeId) : await getPlaceBySlug(placeId);

  if (!place) {
    return <Card className="admin-stat-card admin-stat-card--note">Place not found.</Card>;
  }

  const image = await getCurrentPlaceHeroImage(place.id);
  const previewUrl = image?.storage_path ? await getSignedImageUrl(image.storage_path) : null;
  const imageWithPreview = image ? { ...image, previewUrl } : null;

  return (
    <Card className="place-panel stack">
      <PlaceHeroImageReview placeId={place.id} placeStatus={place.status} image={imageWithPreview} />
    </Card>
  );
}
