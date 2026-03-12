import PlaceListShell from "@/components/admin/PlaceListShell";
import { listAllPlaceLeafletRegionIds, listPlaces } from "@/lib/placeService";
import { listDistributionRegionCatalogMeta } from "@/lib/distributionRegionCatalogService";

export const metadata = {
  title: "Places — Szárnyfeszítő Admin",
};

export const dynamic = "force-dynamic";

export default async function PlacesPage() {
  const places = await listPlaces();

  const [leafletRegionIds, hungaryMeta, extendedMeta] = await Promise.all([
    listAllPlaceLeafletRegionIds().catch(() => []),
    listDistributionRegionCatalogMeta("hungaryRegions").catch(() => []),
    listDistributionRegionCatalogMeta("hungaryExtendedRegions").catch(() => []),
  ]);

  const existingByLeafletId = new Set(leafletRegionIds);
  const missingSpaRegions = hungaryMeta
    .filter((r) => r.scope === "hungary" && r.type === "spa" && r.region_id && r.name)
    .filter((r) => !existingByLeafletId.has(r.region_id))
    .sort((a, b) => a.name.localeCompare(b.name, "hu"))
    .map((r) => ({ region_id: r.region_id, name: r.name }));

  const missingExtendedSpaRegions = extendedMeta
    .filter(
      (r) => r.scope === "hungary_extended" && r.type === "spa" && r.region_id && r.name
    )
    .filter((r) => !existingByLeafletId.has(r.region_id))
    .sort((a, b) => {
      const countryCompare = (String(a.country_code ?? "").localeCompare(String(b.country_code ?? "")));
      if (countryCompare !== 0) return countryCompare;
      return a.name.localeCompare(b.name, "hu");
    })
    .map((r) => ({
      region_id: r.region_id,
      name: r.name,
      country_code: r.country_code ?? null,
      distance_to_hungary_km: typeof r.distance_to_hungary_km === "number" ? r.distance_to_hungary_km : null,
      is_within_hungary: r.is_within_hungary ?? null,
      is_within_hungary_buffer: r.is_within_hungary_buffer ?? null,
    }));
  return (
    <section className="space-y-10">
      <PlaceListShell
        places={places}
        missingSpaRegions={missingSpaRegions}
        missingExtendedSpaRegions={missingExtendedSpaRegions}
      />
    </section>
  );
}
