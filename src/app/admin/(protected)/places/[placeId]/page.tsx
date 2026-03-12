import Link from "next/link";
import { Card } from "@/ui/components/Card";
import { isUuid } from "@/lib/birdService";
import { getPlaceById, getPlaceBySlug, getPlaceMarkerById } from "@/lib/placeService";
import PlaceEditorForm from "@/components/admin/PlaceEditorForm";
import { listDistributionRegionCatalogMeta } from "@/lib/distributionRegionCatalogService";

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
  const [hungaryMeta, extendedMeta] = await Promise.all([
    listDistributionRegionCatalogMeta("hungaryRegions").catch(() => []),
    listDistributionRegionCatalogMeta("hungaryExtendedRegions").catch(() => []),
  ]);

  const leafletRegions = [...hungaryMeta, ...extendedMeta]
    .filter((r) => {
      const isHungaryLeaflet = r.scope === "hungary" && (r.type === "spa" || r.type === "microregion");
      const isExtendedSpa = r.scope === "hungary_extended" && r.type === "spa";
      return isHungaryLeaflet || isExtendedSpa;
    })
    .sort((a, b) => `${a.scope}:${a.type}:${a.name}`.localeCompare(`${b.scope}:${b.type}:${b.name}`))
    .map((r) => ({ region_id: r.region_id, name: r.name, type: r.type, scope: r.scope, catalog: r.catalog }));

  return (
    <Card className="place-panel place-panel-general">
      <PlaceEditorForm place={place} marker={marker} leafletRegions={leafletRegions} />
    </Card>
  );
}
