import PublicPlacesGrid from "@/components/explorer/PublicPlacesGrid";
import PublicShell from "@/ui/components/PublicShell";

export const metadata = {
  title: "Helyszínek — Szárnyfeszítő",
};

export const dynamic = "force-dynamic";

export default function PlacesListPage() {
  return (
    <PublicShell>
      <PublicPlacesGrid />
    </PublicShell>
  );
}
