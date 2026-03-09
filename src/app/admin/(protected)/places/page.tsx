import PlaceListShell from "@/components/admin/PlaceListShell";
import { listPlaces } from "@/lib/placeService";

export const metadata = {
  title: "Places — Szárnyfeszítő Admin",
};

export const dynamic = "force-dynamic";

export default async function PlacesPage() {
  const places = await listPlaces();
  return (
    <section className="space-y-10">
      <PlaceListShell places={places} />
    </section>
  );
}

