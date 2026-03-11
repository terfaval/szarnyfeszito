import Link from "next/link";
import DistributionMapBatchTool from "@/components/admin/DistributionMapBatchTool";
import { listBirds } from "@/lib/birdService";
import { Card } from "@/ui/components/Card";

export const metadata = {
  title: "Elterjedési térképek — batch frissítés",
};

export const dynamic = "force-dynamic";

export default async function DistributionMapsBatchPage() {
  const birds = await listBirds();
  const batchBirds = birds
    .map((bird) => ({ id: bird.id, name_hu: bird.name_hu }))
    .sort((a, b) => a.name_hu.localeCompare(b.name_hu, "hu"));

  return (
    <section className="space-y-6">
      <header className="admin-heading">
        <p className="admin-heading__label">Birds</p>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="admin-heading__title admin-heading__title--large">
            Elterjedési térképek frissítése
          </h1>
          <Link className="admin-nav-link" href="/admin/birds">
            Vissza a madarakhoz
          </Link>
        </div>
      </header>

      <Card className="stack">
        <p className="admin-stat-note">
          Ez a művelet sorban újragenerálja minden madár elterjedési térképét a szerver-oldali AI
          pipeline-on keresztül. (A böngésző fül bezárásával megszakadhat.)
        </p>
        <DistributionMapBatchTool birds={batchBirds} />
      </Card>
    </section>
  );
}

