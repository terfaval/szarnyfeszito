import BirdSexComparisonRefillTool from "@/components/admin/BirdSexComparisonRefillTool";
import { listPublishedBirdsForRefill } from "@/lib/birdService";
import { Card } from "@/ui/components/Card";

export const metadata = {
  title: "Bird refill - Sex comparison",
};

export const dynamic = "force-dynamic";

export default async function BirdSexComparisonRefillPage() {
  const birds = await listPublishedBirdsForRefill({ limit: 400 });

  return (
    <Card className="stack">
      <header className="admin-heading">
        <p className="admin-heading__label">Birds</p>
        <h1 className="admin-heading__title">Refill: male vs female</h1>
        <p className="admin-heading__description">
          Backfill the sex-comparison block and duo image for already published birds.
        </p>
      </header>
      <BirdSexComparisonRefillTool birds={birds} />
    </Card>
  );
}

