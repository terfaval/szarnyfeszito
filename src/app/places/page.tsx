import PlacesExplorer from "@/components/explorer/PlacesExplorer";
import PublicShell from "@/ui/components/PublicShell";

export const metadata = {
  title: "Helyszínek — Szárnyfeszítő",
};

export const revalidate = 3600;

export default function PlacesPage() {
  return (
    <PublicShell>
      <PlacesExplorer />
    </PublicShell>
  );
}
