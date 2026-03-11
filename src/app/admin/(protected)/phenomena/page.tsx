import PhenomenonListShell from "@/components/admin/PhenomenonListShell";
import { listPhenomena } from "@/lib/phenomenonService";
import { listDistributionRegionCatalogMeta } from "@/lib/distributionRegionCatalogService";

export const metadata = {
  title: "Phenomena — Szárnyfeszítő Admin",
};

export const dynamic = "force-dynamic";

export default async function PhenomenaPage() {
  const phenomena = await listPhenomena();
  const regionMeta = await listDistributionRegionCatalogMeta("hungaryRegions").catch(() => []);
  const spaRegions = regionMeta
    .filter((r) => r.scope === "hungary" && r.type === "spa")
    .sort((a, b) => a.name.localeCompare(b.name, "hu"))
    .map((r) => ({ region_id: r.region_id, name: r.name }));

  return (
    <section className="space-y-10">
      <PhenomenonListShell phenomena={phenomena} spaRegions={spaRegions} />
    </section>
  );
}
