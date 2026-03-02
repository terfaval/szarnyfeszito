"use client";

import { useState } from "react";
import { Button } from "@/ui/components/Button";
import { Card } from "@/ui/components/Card";
import { Icon } from "@/ui/icons/Icon";
import { ImageRecord, ImageReviewStatus } from "@/types/image";
import ReviewRequestOverlay from "@/components/admin/ReviewRequestOverlay";

type BirdImageWithPreview = ImageRecord & {
  previewUrl: string | null;
};

const VARIANT_LABELS: Record<ImageRecord["variant"], string> = {
  main_habitat: "Scientific · Main Habitat",
  standing_clean: "Scientific · Standing",
  flight_clean: "Scientific · Flight",
  fixed_pose_icon_v1: "Iconic · Fixed Pose",
};

const STATUS_BADGES: Record<ImageReviewStatus, string> = {
  draft: "text-xs uppercase tracking-[0.3em] text-orange-200",
  reviewed: "text-xs uppercase tracking-[0.3em] text-amber-200",
  approved: "text-xs uppercase tracking-[0.3em] text-emerald-200",
};

const STATUS_HINTS: Record<ImageReviewStatus, string> = {
  draft: "Awaiting review",
  reviewed: "Under review",
  approved: "Approved",
};

type BirdImageReviewProps = {
  birdId: string;
  images: BirdImageWithPreview[];
};

export default function BirdImageReview({
  birdId,
  images: initialImages,
}: BirdImageReviewProps) {
  const [images, setImages] = useState(initialImages);
  const [loadingId, setLoadingId] = useState<string | null>(null);
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
    <section className="space-y-4">
      <Card className="space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-zinc-400">Images</p>
            <h2 className="text-2xl font-semibold text-white">Image review</h2>
            <p className="text-sm text-zinc-400">
              Approve each variant so the image stage can advance to publication.
            </p>
          </div>

          {allApproved && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-950/50 px-3 py-1 text-xs uppercase tracking-[0.3em] text-emerald-300">
              <Icon name="accept" size={14} className="text-emerald-300" />
              All approved
            </span>
          )}
        </header>

        {images.length === 0 ? (
          <Card className="rounded-[14px] border border-dashed border-white/5 bg-white/5 p-4 text-sm text-zinc-400">
            Images are generated after the text is approved. Run the generator to
            create the placeholders before reviewing.
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {images.map((image) => {
              const isApproved = image.review_status === "approved";
              const isLoading = loadingId === image.id;

              return (
                <Card key={image.id} className="space-y-4">
                  <div className="aspect-[4/3] w-full overflow-hidden rounded-[14px] bg-zinc-900">
                    {image.previewUrl ? (
                      <img
                        src={image.previewUrl}
                        alt={`${VARIANT_LABELS[image.variant]} preview`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-[0.3em] text-zinc-500">
                        Preview unavailable
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-white">
                        {VARIANT_LABELS[image.variant]}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-9 w-9 rounded-full border border-white/10 text-white hover:border-white/40"
                        onClick={() =>
                          openRequestOverlay(image.id, VARIANT_LABELS[image.variant])
                        }
                      >
                        <Icon name="edit" size={16} />
                        <span className="sr-only">Request changes</span>
                      </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={STATUS_BADGES[image.review_status]}>
                        {STATUS_HINTS[image.review_status]}
                      </span>
                      <span className="text-xs text-zinc-500">
                        Generated{" "}
                        {new Date(image.created_at).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <p className="text-xs uppercase tracking-[0.3em] text-[#05768D]">
                      Review action
                    </p>
                    {isApproved ? (
                      <Button
                        type="button"
                        disabled
                        variant="ghost"
                        className="inline-flex items-center justify-center gap-2 border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-emerald-200"
                      >
                        <Icon name="accept" size={16} />
                        Approved
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        className="inline-flex items-center justify-center gap-2 border-[#BE2D12]/70 bg-[#BE2D12]/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-[#BE2D12] transition hover:border-[#BE2D12] disabled:cursor-not-allowed disabled:opacity-50"
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
        <p className="text-xs text-rose-400" aria-live="assertive">
          {error}
        </p>
      )}

      {requestStatusMessage && (
        <p className="text-xs text-emerald-300" aria-live="polite">
          {requestStatusMessage}
        </p>
      )}

      <p className="text-xs text-zinc-500">
        Once every variant is approved, the bird status will advance to{" "}
        <span className="font-semibold text-white">images_approved</span> and the
        publish gate will unlock.
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
