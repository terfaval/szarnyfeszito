import Link from "next/link";
import { Card } from "@/ui/components/Card";
import { isUuid } from "@/lib/birdService";
import { getPlaceById, getPlaceBySlug, getPlaceMarkerById } from "@/lib/placeService";
import PlaceEditorForm from "@/components/admin/PlaceEditorForm";

export const metadata = {
  title: "Admin place editor",
};

export const dynamic = "force-dynamic";

export default async function PlaceEditorPage({
  params,
}: {
  params: Promise<{ placeId: string }>;
}) {
  const { placeId } = await params;
  const place = isUuid(placeId) ? await getPlaceById(placeId) : await getPlaceBySlug(placeId);

  if (!place) {
    return (
      <section className="space-y-4">
        <h1 className="text-xl font-semibold">Place not found</h1>
        <p className="text-sm text-zinc-500">
          The requested place does not exist or was deleted. Return to the list to pick another one.
        </p>
        <Link className="admin-nav-link" href="/admin/places">
          Back to places
        </Link>
      </section>
    );
  }

  const marker = await getPlaceMarkerById(place.id);

  return (
    <Card className="place-panel place-panel-general">
      <PlaceEditorForm place={place} marker={marker} />
    </Card>
  );
}

