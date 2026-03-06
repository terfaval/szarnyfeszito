import BirdTextReview from "@/components/admin/BirdTextReview";
import { getBirdById, getBirdBySlug, isUuid } from "@/lib/birdService";
import { getLatestContentBlockForBird } from "@/lib/contentService";
import { Card } from "@/ui/components/Card";
import styles from "../page.module.css";

export const metadata = {
  title: "Bird text review",
};

export const dynamic = "force-dynamic";

export default async function BirdTextPage({
  params,
}: {
  params: Promise<{ birdId: string }>;
}) {
  const { birdId } = await params;
  const bird = isUuid(birdId) ? await getBirdById(birdId) : await getBirdBySlug(birdId);

  if (!bird) {
    return (
      <section className={styles.notFoundSection}>
        <h1 className={styles.notFoundTitle}>Bird not found</h1>
        <p className={styles.notFoundText}>
          The requested bird does not exist or was deleted. Return to the list to
          pick another one.
        </p>
      </section>
    );
  }

  const contentBlock = await getLatestContentBlockForBird(bird.id);

  return (
    <Card className={styles.cardSection}>
      <BirdTextReview birdId={bird.id} contentBlock={contentBlock} />
    </Card>
  );
}

