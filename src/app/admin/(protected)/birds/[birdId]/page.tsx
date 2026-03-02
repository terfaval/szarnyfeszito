import Link from "next/link";
import BirdEditorForm from "@/components/admin/BirdEditorForm";
import BirdImageReview from "@/components/admin/BirdImageReview";
import BirdPublishAction from "@/components/admin/BirdPublishAction";
import BirdTextReview from "@/components/admin/BirdTextReview";
import { getBirdById, getBirdBySlug, isUuid } from "@/lib/birdService";
import {
  getSignedImageUrl,
  listImagesForBird,
} from "@/lib/imageService";
import { getLatestContentBlockForBird } from "@/lib/contentService";
import { Card } from "@/ui/components/Card";
import { GateChecklist } from "@/ui/components/GateChecklist";
import { StatusPill } from "@/ui/components/StatusPill";
import { BIRD_STATUS_VALUES } from "@/types/bird";
import styles from "./page.module.css";

const TABS = ["General", "Text", "Images", "Publish"] as const;

export const metadata = {
  title: "Admin bird editor",
};

export const dynamic = "force-dynamic";

export default async function BirdEditorPage({
  params,
}: {
  params: Promise<{ birdId: string }>;
}) {
  const { birdId } = await params;
  const bird = isUuid(birdId)
    ? await getBirdById(birdId)
    : await getBirdBySlug(birdId);
  const images = bird ? await listImagesForBird(bird.id) : [];
  const imagesWithPreview = await Promise.all(
    images.map(async (image) => ({
      ...image,
      previewUrl: await getSignedImageUrl(image.storage_path),
    }))
  );
  const contentBlock = bird ? await getLatestContentBlockForBird(bird.id) : null;

  if (!bird) {
    return (
      <section className={styles.notFoundSection}>
        <h1 className={styles.notFoundTitle}>Bird not found</h1>
        <p className={styles.notFoundText}>
          The requested bird does not exist or was deleted. Return to the list to
          pick another one.
        </p>
        <Link className={styles.backLinkButton} href="/admin/birds">
          Back to birds
        </Link>
      </section>
    );
  }

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
    <section className={styles.page}>
      <Card className={styles.cardSection}>
        <header className={styles.editorHeader}>
          <div>
            <p className={styles.preTitle}>Bird editor</p>
            <h1 className={styles.birdName}>{bird.name_hu}</h1>
            <p className={styles.slugText}>Slug: {bird.slug}</p>
          </div>
          <div className={styles.headerActions}>
            <StatusPill status={bird.status} />
            <Link className={styles.secondaryButton} href="/admin/birds">
              Back to list
            </Link>
          </div>
        </header>

        <div className={styles.tabList}>
          {TABS.map((tab, index) => (
            <span
              key={tab}
              className={`${styles.tab} ${
                index === 0 ? styles.tabActive : styles.tabInactive
              }`}
            >
              {tab}
            </span>
          ))}
        </div>
      </Card>

      <Card className={styles.cardSection}>
        <BirdEditorForm bird={bird} />
        <BirdTextReview birdId={bird.id} contentBlock={contentBlock} />
        <BirdImageReview birdId={bird.id} images={imagesWithPreview} />
      </Card>

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
        />
        <p className={styles.gateHelpText}>
          {bird.status === "published"
            ? "This bird is already published. Confirm the story on the dashboard."
            : gateReady
            ? "Publish gate unlocked - the CTA above is now available."
            : "Publish gate locked until every checklist item turns green."}
        </p>
      </Card>
    </section>
  );
}
