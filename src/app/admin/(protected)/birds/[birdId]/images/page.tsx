import BirdImageReview from "@/components/admin/BirdImageReview";
import { getBirdById, getBirdBySlug, isUuid } from "@/lib/birdService";
import { getSignedImageUrl, listImagesForBird } from "@/lib/imageService";
import { Card } from "@/ui/components/Card";
import styles from "../page.module.css";

export const metadata = {
  title: "Bird image review",
};

export const dynamic = "force-dynamic";

export default async function BirdImagesPage({
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

  const images = await listImagesForBird(bird.id);
  const imagesWithPreview = await Promise.all(
    images.map(async (image) => ({
      ...image,
      previewUrl: await getSignedImageUrl(image.storage_path),
    }))
  );

  return (
    <Card className={styles.cardSection}>
      <BirdImageReview
        birdId={bird.id}
        images={imagesWithPreview}
        birdStatus={bird.status}
      />
    </Card>
  );
}
