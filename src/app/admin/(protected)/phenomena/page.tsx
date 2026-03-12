import PhenomenonListShell from "@/components/admin/PhenomenonListShell";
import { listPhenomena } from "@/lib/phenomenonService";
import { listDistributionRegionCatalogMeta } from "@/lib/distributionRegionCatalogService";

export const metadata = {
  title: "Phenomena — Szárnyfeszítő Admin",
};

export const dynamic = "force-dynamic";

export default async function PhenomenaPage() {
  const phenomena = await listPhenomena();
  const [hungaryMeta, extendedMeta] = await Promise.all([
    listDistributionRegionCatalogMeta("hungaryRegions").catch(() => []),
    listDistributionRegionCatalogMeta("hungaryExtendedRegions").catch(() => []),
  ]);
  const spaRegions = [
    ...hungaryMeta
      .filter((r) => r.scope === "hungary" && r.type === "spa")
      .map((r) => ({
        region_id: r.region_id,
        name: r.name,
        scope: "hungary" as const,
      })),
    ...extendedMeta
      .filter((r) => r.scope === "hungary_extended" && r.type === "spa")
      .map((r) => ({
        region_id: r.region_id,
        name: r.name,
        scope: "hungary_extended" as const,
        country_code: r.country_code ?? null,
        distance_to_hungary_km:
          typeof r.distance_to_hungary_km === "number" ? r.distance_to_hungary_km : null,
      })),
  ].sort((a, b) => a.name.localeCompare(b.name, "hu"));

  return (
    <section className="space-y-10">
      <PhenomenonListShell phenomena={phenomena} spaRegions={spaRegions} />
    </section>
  );
}
