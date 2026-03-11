import { Card } from "@/ui/components/Card";
import { isUuid } from "@/lib/birdService";
import { getPhenomenonById, getPhenomenonBySlug } from "@/lib/phenomenonService";
import PhenomenonBirdsEditor from "@/components/admin/PhenomenonBirdsEditor";

export const metadata = {
  title: "Phenomenon birds — Szárnyfeszítő Admin",
};

export const dynamic = "force-dynamic";

export default async function PhenomenonBirdsPage({
  params,
}: {
  params: Promise<{ phenomenonId: string }>;
}) {
  const { phenomenonId } = await params;
  const phenomenon = isUuid(phenomenonId) ? await getPhenomenonById(phenomenonId) : await getPhenomenonBySlug(phenomenonId);

  if (!phenomenon) {
    return <Card className="admin-stat-card admin-stat-card--note">Phenomenon not found.</Card>;
  }

  return (
    <Card className="place-panel place-birds stack">
      <PhenomenonBirdsEditor phenomenonId={phenomenon.id} />
    </Card>
  );
}

