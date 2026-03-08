"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/ui/components/Button";
import { Card } from "@/ui/components/Card";
import { Icon } from "@/ui/icons/Icon";
import { ImageRecord, ImageReviewStatus } from "@/types/image";
import ReviewRequestOverlay from "@/components/admin/ReviewRequestOverlay";
import styles from "./BirdImageReview.module.css";

type BirdImageWithPreview = ImageRecord & {
  previewUrl: string | null;
};

const VARIANT_LABELS: Partial<Record<ImageRecord["variant"], string>> = {
  main_habitat: "Scientific · Main Habitat",
  standing_clean: "Scientific · Standing",
  flight_clean: "Scientific · Flight",
  fixed_pose_icon_v1: "Iconic · Fixed Pose",
};

const STATUS_BADGES: Record<ImageReviewStatus, string> = {
  draft: "admin-badge admin-badge--muted",
  reviewed: "admin-badge admin-badge--warning",
  approved: "admin-badge admin-badge--success",
};

const STATUS_HINTS: Record<ImageReviewStatus, string> = {
  draft: "Awaiting review",
  reviewed: "Under review",
  approved: "Approved",
};

type BirdImageReviewProps = {
  birdId: string;
  images: BirdImageWithPreview[];
  birdStatus: string;
};

function isProbablyImageUrl(url: string) {
  const cleaned = url.split("?")[0]?.toLowerCase() ?? "";
  return (
    cleaned.endsWith(".png") ||
    cleaned.endsWith(".jpg") ||
    cleaned.endsWith(".jpeg") ||
    cleaned.endsWith(".webp") ||
    cleaned.endsWith(".gif")
  );
}

export default function BirdImageReview({
  birdId,
  images: initialImages,
  birdStatus,
}: BirdImageReviewProps) {
  const router = useRouter();
  const [images, setImages] = useState(initialImages);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestOverlay, setRequestOverlay] = useState<{
    imageId: string;
    label: string;
  } | null>(null);
  const [requestComment, setRequestComment] = useState("");
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestStatusMessage, setRequestStatusMessage] = useState<string | null>(
    null
  );

  const allApproved =
    images.length > 0 && images.every((image) => image.review_status === "approved");

  const canGenerate = birdStatus === "text_approved" || birdStatus === "images_generated";

  const generateLabel = images.length === 0 ? "Generate images" : "Regenerate images";

  const handleGenerate = async () => {
    if (!canGenerate || generating) {
      return;
    }

    setGenerating(true);
    setError(null);
    setRequestStatusMessage(null);

    try {
      const response = await fetch("/api/generate-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bird_id: birdId,
          force_regenerate: birdStatus === "images_generated" || images.length > 0,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to generate images.");
      }

      setRequestStatusMessage("Images generated. Refreshingâ€¦");
      setRequestStatusMessage("Images generated. Refreshing...");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate images.");
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async (imageId: string) => {
    if (loadingId) {
      return;
    }

    setError(null);
    setLoadingId(imageId);

    try {
      const response = await fetch(`/api/birds/${birdId}/images/${imageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review_status: "approved" }),
      });

      const payload = await response.json();

      if (!response.ok || !payload?.data) {
        throw new Error(payload?.error ?? "Unable to approve image.");
      }

      setImages((previous) =>
        previous.map((image) =>
          image.id === payload.data.id
            ? { ...payload.data, previewUrl: image.previewUrl }
            : image
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update image status.");
    } finally {
      setLoadingId(null);
    }
  };

  const openRequestOverlay = (imageId: string, label: string) => {
    setRequestOverlay({ imageId, label });
    setRequestComment("");
    setRequestError(null);
    setRequestStatusMessage(null);
  };

  const closeRequestOverlay = () => {
    setRequestOverlay(null);
    setRequestComment("");
    setRequestError(null);
  };

  const handleImageReviewRequest = async () => {
    if (!requestOverlay) {
      return;
    }

    const trimmedComment = requestComment.trim();

    if (!trimmedComment) {
      setRequestError("Please add a short review note.");
      return;
    }

    setRequestSubmitting(true);
    setRequestError(null);
    setError(null);

    try {
      const response = await fetch(
        `/api/birds/${birdId}/images/${requestOverlay.imageId}/request-fix`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ comment: trimmedComment }),
        }
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.data?.image) {
        throw new Error(
          payload?.error ?? "Unable to request changes for this image."
        );
      }

      setImages((previous) =>
        previous.map((image) =>
          image.id === payload.data.image.id
            ? { ...payload.data.image, previewUrl: image.previewUrl }
            : image
        )
      );

      setRequestStatusMessage(
        `Review request saved for ${requestOverlay.label}.`
      );
      closeRequestOverlay();
    } catch (err) {
      setRequestError(
        err instanceof Error
          ? err.message
          : "Unable to request changes for this image right now."
      );
    } finally {
      setRequestSubmitting(false);
    }
  };

  return (
    <section className={styles.section}>
      <Card className="space-y-4">
        <header className={styles.header}>
          <div className="admin-heading">
            <p className="admin-heading__label">Images</p>
            <h2 className="admin-heading__title">Image review</h2>
            <p className="admin-heading__description">
              Approve each variant so the image stage can advance to publication.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="accent"
              onClick={handleGenerate}
              disabled={!canGenerate || generating}
              className="whitespace-nowrap"
            >
              {generating ? "Generatingâ€¦" : generateLabel}
            </Button>

            {allApproved && (
              <span className={styles.headerBadge}>
                <Icon name="accept" size={14} />
                All approved
              </span>
            )}
          </div>
        </header>

        {!canGenerate && (
          <div className="admin-panel admin-panel--muted">
            <p className="admin-note-small">
              To generate images, the bird must be{" "}
              <span className="font-semibold">text_approved</span> (or already{" "}
              <span className="font-semibold">images_generated</span>).
            </p>
          </div>
        )}

        {images.length === 0 ? (
          <div className="admin-panel admin-panel--muted">
            <p className="admin-note-small">
              Images are generated after the text is approved. Run the generator to create the
              images before reviewing.
            </p>
          </div>
        ) : (
          <div className={styles.grid}>
            {images.map((image) => {
              const label = VARIANT_LABELS[image.variant] ?? image.variant;
              const isApproved = image.review_status === "approved";
              const isLoading = loadingId === image.id;
              const hasRenderablePreview =
                Boolean(image.previewUrl) && isProbablyImageUrl(image.previewUrl ?? "");

              return (
                <Card key={image.id} className="space-y-4">
                  <div className={styles.imagePreview}>
                    {hasRenderablePreview ? (
                      <img
                        src={image.previewUrl ?? ""}
                        alt={`${label} preview`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <span className="admin-heading__label">
                          {image.previewUrl ? "Preview unavailable" : "Not generated yet"}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className={styles.imageMeta}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="admin-link-card__title">{label}</p>
                      <div className="flex items-center gap-2">
                        {image.previewUrl && (
                          <a
                            className="btn btn--ghost"
                            href={image.previewUrl}
                            target="_blank"
                            rel="noreferrer"
                            download
                          >
                            Download
                          </a>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-9 w-9 rounded-full"
                          onClick={() => openRequestOverlay(image.id, label)}
                        >
                          <Icon name="edit" size={16} />
                          <span className="sr-only">Request changes</span>
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={STATUS_BADGES[image.review_status]}>
                        {STATUS_HINTS[image.review_status]}
                      </span>
                      <span className="text-xs admin-text-muted">
                        Generated{" "}
                        {new Date(image.updated_at).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                  </div>

                  <div className={styles.imageActions}>
                    <p className="admin-subheading">Review action</p>
                    {isApproved ? (
                      <Button
                        type="button"
                        disabled
                        variant="secondary"
                        className="w-full justify-center"
                      >
                        <Icon name="accept" size={16} />
                        Approved
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="accent"
                        className="w-full justify-center"
                        onClick={() => handleApprove(image.id)}
                        disabled={isLoading}
                      >
                        {isLoading ? "Approving…" : "Approve image"}
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Card>

      {error && (
        <p className="admin-message admin-message--error" aria-live="assertive">
          {error}
        </p>
      )}

      {requestStatusMessage && (
        <p className="admin-message admin-message--success" aria-live="polite">
          {requestStatusMessage}
        </p>
      )}

      <p className="admin-note-small">
        Once every variant is approved, the bird status will advance to{" "}
        <span className="font-semibold">images_approved</span> and the publish gate will unlock.
      </p>

      <ReviewRequestOverlay
        open={requestOverlay !== null}
        title={
          requestOverlay
            ? `Request changes for ${requestOverlay.label}`
            : ""
        }
        description="Describe the change you need for this image variant."
        comment={requestComment}
        onCommentChange={setRequestComment}
        onCancel={closeRequestOverlay}
        onSubmit={handleImageReviewRequest}
        submitting={requestSubmitting}
        error={requestError}
        submitLabel="Send review note"
      />
    </section>
  );
}
