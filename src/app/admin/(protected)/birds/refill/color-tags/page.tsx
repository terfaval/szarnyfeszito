import Link from "next/link";
import BirdColorTagsRefillTool from "@/components/admin/BirdColorTagsRefillTool";
import { listPublishedBirdsForColorTagsRefill } from "@/lib/birdService";
import { Card } from "@/ui/components/Card";

export const metadata = {
  title: "Bird refill - Color tags",
};

export const dynamic = "force-dynamic";

export default async function BirdColorTagsRefillPage() {
  const birds = await listPublishedBirdsForColorTagsRefill({ limit: 600 });

  return (
    <section className="space-y-6">
      <header className="admin-heading">
        <p className="admin-heading__label">Birds</p>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="admin-heading__title admin-heading__title--large">Refill: color tags</h1>
          <Link className="admin-nav-link" href="/admin/birds">
            Vissza a madarakhoz
          </Link>
        </div>
        <p className="admin-heading__description">
          Backfill missing <code>birds.color_tags</code> for already published birds (deterministic from the latest
          dossier <code>pill_meta.color_bg</code>).
        </p>
      </header>

      <Card className="stack">
        <BirdColorTagsRefillTool birds={birds} />
      </Card>
    </section>
  );
}

