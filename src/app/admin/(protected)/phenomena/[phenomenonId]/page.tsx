import { Card } from "@/ui/components/Card";
import Link from "next/link";
import { isUuid } from "@/lib/birdService";
import { getPhenomenonById, getPhenomenonBySlug } from "@/lib/phenomenonService";
import PhenomenonEditorForm from "@/components/admin/PhenomenonEditorForm";
import { listDistributionRegionCatalogMeta } from "@/lib/distributionRegionCatalogService";

export const metadata = {
  title: "Phenomenon editor — Szárnyfeszítő Admin",
};

export const dynamic = "force-dynamic";

export default async function PhenomenonEditorPage({
  params,
}: {
  params: Promise<{ phenomenonId: string }>;
}) {
  const { phenomenonId } = await params;
  const phenomenon = isUuid(phenomenonId) ? await getPhenomenonById(phenomenonId) : await getPhenomenonBySlug(phenomenonId);

  if (!phenomenon) {
    return (
      <section className="space-y-4">
        <h1 className="text-xl font-semibold">Phenomenon not found</h1>
        <p className="text-sm text-zinc-500">
          The requested phenomenon does not exist or was deleted. Return to the list to pick another one.
        </p>
        <Link className="admin-nav-link" href="/admin/phenomena">
          Back to phenomena
        </Link>
      </section>
    );
  }

  const regionMeta = await listDistributionRegionCatalogMeta("hungaryRegions").catch(() => []);
  const spaRegions = regionMeta
    .filter((r) => r.scope === "hungary" && r.type === "spa")
    .sort((a, b) => a.name.localeCompare(b.name, "hu"))
    .map((r) => ({ region_id: r.region_id, name: r.name }));

  return (
    <Card className="place-panel place-panel-general">
      <PhenomenonEditorForm phenomenon={phenomenon} spaRegions={spaRegions} />
    </Card>
  );
}

