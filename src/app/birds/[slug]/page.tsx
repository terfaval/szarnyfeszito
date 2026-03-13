import { notFound } from "next/navigation";
import BirdDossierCard from "@/components/shared/BirdDossierCard";
import { getPublicBirdDossierV1 } from "@/lib/publicRead";
import PublicShell from "@/ui/components/PublicShell";
import styles from "./page.module.css";

export const metadata = {
  title: "Madár — Szárnyfeszítő",
};

export const revalidate = 120;

export default async function BirdDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const detail = await getPublicBirdDossierV1(slug);
  if (!detail) {
    notFound();
  }

  return (
    <PublicShell>
      <main className={styles.page}>
        <BirdDossierCard
          dossier={detail.dossier}
          mainHabitatSrc={detail.images.main_habitat}
          flightSrc={detail.images.flight_clean}
          nestingSrc={detail.images.nesting_clean}
          sexPairSrc={detail.images.main_habitat_pair_sexes_v1}
          habitats={detail.habitats}
          reviewComment={detail.review.comment}
          reviewRequestedAt={detail.review.requested_at}
        />
      </main>
    </PublicShell>
  );
}
