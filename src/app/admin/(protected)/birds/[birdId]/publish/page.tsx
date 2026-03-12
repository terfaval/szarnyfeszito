import BirdPublishAction from "@/components/admin/BirdPublishAction";
import BirdTextReview from "@/components/admin/BirdTextReview";
import BirdCard from "@/components/public/BirdCard";
import { getBirdById, getBirdBySlug, isUuid } from "@/lib/birdService";
import { getLatestApprovedContentBlockForBird, getLatestContentBlockForBird } from "@/lib/contentService";
import { getSignedImageUrl, listImagesForBird } from "@/lib/imageService";
import { GateChecklist } from "@/ui/components/GateChecklist";
import { Card } from "@/ui/components/Card";
import { BIRD_STATUS_VALUES } from "@/types/bird";
import styles from "../page.module.css";

export const metadata = {
  title: "Bird publish gate",
};

export const dynamic = "force-dynamic";

export default async function BirdPublishPage({
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
  const approvedImages = images.filter((image) => image.review_status === "approved");
  const imagesWithPreview = await Promise.all(
    approvedImages.map(async (image) => ({
      variant: image.variant,
      previewUrl: await getSignedImageUrl(image.storage_path),
    }))
  );

  const contentBlock = await getLatestContentBlockForBird(bird.id);
  const approvedContent = await getLatestApprovedContentBlockForBird(bird.id);
  const iconicPreviewUrl =
    imagesWithPreview.find((img) => img.variant === "fixed_pose_icon_v1")?.previewUrl ?? null;

  const statusIndex = BIRD_STATUS_VALUES.indexOf(bird.status);
  const textApprovedIndex = BIRD_STATUS_VALUES.indexOf("text_approved");
  const hasTextApprovedStatus =
    textApprovedIndex !== -1 && statusIndex >= textApprovedIndex;

  const hasMainHabitatApproved = images.some(
    (image) =>
      image.variant === "main_habitat" && image.review_status === "approved"
  );

  const hasIconicApproved = images.some(
    (image) =>
      image.variant === "fixed_pose_icon_v1" && image.review_status === "approved"
  );

  const gateItems = [
    { label: "Text approved", ok: hasTextApprovedStatus },
    { label: "Main habitat image approved", ok: hasMainHabitatApproved },
    { label: "Iconic asset approved", ok: hasIconicApproved },
  ];

  const gateReady = gateItems.every((item) => item.ok);

  return (
    <Card className={styles.cardSectionCompact}>
      <GateChecklist
        heading="Publish gate"
        description="All gates must be green before the publish CTA becomes available."
        items={gateItems}
      />
      <BirdPublishAction
        birdId={bird.id}
        status={bird.status}
        gateReady={gateReady}
        publishedAt={bird.published_at}
        publishedRevision={bird.published_revision}
      />
      <p className={styles.gateHelpText}>
        {bird.status === "published"
          ? "This bird is already published. Confirm the story on the dashboard."
          : gateReady
          ? "Publish gate unlocked - the CTA above is now available."
          : "Publish gate locked until every checklist item turns green."}
      </p>

      {approvedContent ? (
        <div className="stack">
          <p className="admin-subheading">Public bird card preview</p>
          <BirdCard
            bird={{
              name_hu: bird.name_hu,
              name_latin: bird.name_latin ?? null,
              size_category: bird.size_category ?? null,
              visibility_category: bird.visibility_category ?? null,
              color_tags: bird.color_tags ?? null,
            }}
            content={{
              short: approvedContent.short ?? "",
              long: approvedContent.long ?? "",
              feature_block: approvedContent.feature_block ?? [],
              did_you_know: approvedContent.did_you_know ?? "",
              ethics_tip: approvedContent.ethics_tip ?? "",
            }}
            iconicSrc={iconicPreviewUrl}
            habitatSrc={null}
          />
        </div>
      ) : (
        <p className="admin-note-small">No approved public bird card content yet.</p>
      )}

      <BirdTextReview
        birdId={bird.id}
        contentBlock={contentBlock}
        mode="publish"
        images={imagesWithPreview}
      />
    </Card>
  );
}
