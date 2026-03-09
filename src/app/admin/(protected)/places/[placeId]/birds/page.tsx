import { Card } from "@/ui/components/Card";
import { isUuid } from "@/lib/birdService";
import { getPlaceById, getPlaceBySlug } from "@/lib/placeService";
import PlaceBirdsEditor from "@/components/admin/PlaceBirdsEditor";

export const metadata = {
  title: "Place birds — Szárnyfeszítő Admin",
};

export const dynamic = "force-dynamic";

export default async function PlaceBirdsPage({
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

  return (
    <Card className="place-panel place-birds stack">
      <PlaceBirdsEditor placeId={place.id} />
    </Card>
  );
}

