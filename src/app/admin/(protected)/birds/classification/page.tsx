import Link from "next/link";
import { Card } from "@/ui/components/Card";
import { listBirdsMissingClassification } from "@/lib/birdService";
import { listBirdClassificationsForBirdIds } from "@/lib/birdClassificationService";
import BirdClassificationQueue from "@/components/admin/BirdClassificationQueue";

export const metadata = {
  title: "Bird sorting queue — Szarnyfeszito Admin",
};

export const dynamic = "force-dynamic";

export default async function BirdClassificationQueuePage() {
  const birds = await listBirdsMissingClassification();
  const classifications = await listBirdClassificationsForBirdIds(birds.map((b) => b.id));

  return (
    <section className="space-y-6">
      <header className="admin-heading">
        <p className="admin-heading__label">Birds registry</p>
        <h1 className="admin-heading__title">Sorting / csoportosítás</h1>
        <p className="admin-heading__description">
          Birds missing size and/or visibility categories. Generate an AI suggestion,
          then approve final buckets for stable filtering and sorting.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link className="admin-nav-link" href="/admin/birds">
            Back to birds list
          </Link>
        </div>
      </header>

      <Card className="admin-stat-card admin-stat-card--note">
        {birds.length === 0
          ? "All birds have classification categories."
          : `${birds.length} birds need classification.`}
      </Card>

      {birds.length > 0 && (
        <BirdClassificationQueue birds={birds} classifications={classifications} />
      )}
    </section>
  );
}
