import BirdHabitatAssetsRefillTool from "@/components/admin/BirdHabitatAssetsRefillTool";
import { listPublishedBirdsForHabitatAssetsRefill } from "@/lib/birdService";

export const metadata = {
  title: "Bird refill - Habitat assets",
};

export default async function BirdHabitatAssetsRefillPage() {
  const birds = await listPublishedBirdsForHabitatAssetsRefill({ limit: 600 });

  return (
    <section className="space-y-10">
      <header className="admin-heading">
        <h1 className="admin-heading__title admin-heading__title--large">Refill: habitat assets</h1>
        <p className="admin-heading__description">
          Backfill ordered habitat asset keys for already published birds. Used for deterministic habitat-tile
          backgrounds (D55).
        </p>
      </header>
      <BirdHabitatAssetsRefillTool birds={birds} />
    </section>
  );
}

