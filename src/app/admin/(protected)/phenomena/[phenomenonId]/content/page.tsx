import { Card } from "@/ui/components/Card";
import { isUuid } from "@/lib/birdService";
import { getPhenomenonById, getPhenomenonBySlug } from "@/lib/phenomenonService";
import {
  getLatestApprovedContentBlockForPhenomenon,
  getLatestContentBlockForPhenomenon,
} from "@/lib/phenomenonContentService";
import PhenomenonContentReview from "@/components/admin/PhenomenonContentReview";

export const metadata = {
  title: "Phenomenon content — Szárnyfeszítő Admin",
};

export const dynamic = "force-dynamic";

export default async function PhenomenonContentPage({
  params,
}: {
  params: Promise<{ phenomenonId: string }>;
}) {
  const { phenomenonId } = await params;
  const phenomenon = isUuid(phenomenonId) ? await getPhenomenonById(phenomenonId) : await getPhenomenonBySlug(phenomenonId);

  if (!phenomenon) {
    return <Card className="admin-stat-card admin-stat-card--note">Phenomenon not found.</Card>;
  }

  const latest = await getLatestContentBlockForPhenomenon(phenomenon.id);
  const latestApproved = await getLatestApprovedContentBlockForPhenomenon(phenomenon.id);

  return (
    <Card className="place-panel place-panel-general">
      <PhenomenonContentReview phenomenon={phenomenon} latest={latest} latestApproved={latestApproved} />
    </Card>
  );
}

