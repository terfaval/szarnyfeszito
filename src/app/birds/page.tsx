import PublicBirdsGrid from "@/components/explorer/PublicBirdsGrid";
import PublicShell from "@/ui/components/PublicShell";

export const metadata = {
  title: "Madarak — Szárnyfeszítő",
};

export const revalidate = 3600;

export default function BirdsPage() {
  return (
    <PublicShell>
      <PublicBirdsGrid />
    </PublicShell>
  );
}
