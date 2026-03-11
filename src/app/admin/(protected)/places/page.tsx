import PlaceListShell from "@/components/admin/PlaceListShell";
import { listAllPlaceLeafletRegionIds, listPlaces } from "@/lib/placeService";
import { listDistributionRegionCatalogMeta } from "@/lib/distributionRegionCatalogService";

export const metadata = {
  title: "Places — Szárnyfeszítő Admin",
};

export const dynamic = "force-dynamic";

export default async function PlacesPage() {
  const places = await listPlaces();

  const [leafletRegionIds, regionMeta] = await Promise.all([
    listAllPlaceLeafletRegionIds().catch(() => []),
    listDistributionRegionCatalogMeta("hungaryRegions").catch(() => []),
  ]);

  const existingByLeafletId = new Set(leafletRegionIds);
  const missingSpaRegions = regionMeta
    .filter((r) => r.scope === "hungary" && r.type === "spa" && r.region_id && r.name)
    .filter((r) => !existingByLeafletId.has(r.region_id))
    .sort((a, b) => a.name.localeCompare(b.name, "hu"))
    .map((r) => ({ region_id: r.region_id, name: r.name }));
  return (
    <section className="space-y-10">
      <PlaceListShell places={places} missingSpaRegions={missingSpaRegions} />
    </section>
  );
}
