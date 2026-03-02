import BirdListShell from "@/components/admin/BirdListShell";
import { listBirds } from "@/lib/birdService";

export const metadata = {
  title: "Birds — Szarnyfeszito Admin",
};

export default async function BirdsPage() {
  const birds = await listBirds();

  return (
    <section className="space-y-10">
      <BirdListShell birds={birds} />
    </section>
  );
}
