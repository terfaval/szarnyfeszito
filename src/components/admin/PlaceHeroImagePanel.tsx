"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/ui/components/Button";
import { Card } from "@/ui/components/Card";
import type { ImageRecord, ImageReviewStatus } from "@/types/image";

type PlaceHeroImageWithPreview = ImageRecord & {
  previewUrl: string | null;
};

const STATUS_BADGES: Record<ImageReviewStatus, string> = {
  draft: "admin-badge admin-badge--muted",
  reviewed: "admin-badge admin-badge--warning",
  approved: "admin-badge admin-badge--success",
};

export default function PlaceHeroImagePanel({
  placeId,
  placeStatus,
  image: initialImage,
}: {
  placeId: string;
  placeStatus: string;
  image: PlaceHeroImageWithPreview | null;
}) {
  const router = useRouter();
  const [image, setImage] = useState<PlaceHeroImageWithPreview | null>(initialImage);
  const [generating, setGenerating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setImage(initialImage);
  }, [initialImage]);

  const canGenerate = useMemo(() => placeStatus !== "published", [placeStatus]);
  const hasImage = Boolean(image);
  const isApproved = image?.review_status === "approved";
  const statusLabel = image?.review_status ?? "missing";

  const generateLabel = hasImage ? "Regenerate hero image" : "Generate hero image";

  const handleGenerate = async () => {
    if (!canGenerate || generating) return;
    setGenerating(true);
    setError(null);

    try {
      const response = await fetch(`/api/places/${placeId}/images/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          force_regenerate: hasImage,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to generate place hero image.");
      }
      router.refresh();
    } catch (err) {
      setError((err as Error)?.message ?? "Unable to generate place hero image.");
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async () => {
    if (!image || approving) return;
    setApproving(true);
    setError(null);

    try {
      const response = await fetch(`/api/places/${placeId}/images/${image.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review_status: "approved" satisfies ImageReviewStatus }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to approve image.");
      }
      router.refresh();
    } catch (err) {
      setError((err as Error)?.message ?? "Unable to approve image.");
    } finally {
      setApproving(false);
    }
  };

  return (
    <section className="space-y-6" aria-label="Place hero image">
      <header className="admin-heading">
        <p className="admin-heading__label">Hero image</p>
        <h2 className="admin-heading__title admin-heading__title--large">Spring hero (scientific)</h2>
        <p className="admin-heading__description">
          Required for publishing: approve the current `place_hero_spring_v1` image.
        </p>
      </header>

      <Card className="stack">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="admin-subheading">Status</span>
            {image ? (
              <span className={STATUS_BADGES[image.review_status]}>{statusLabel}</span>
            ) : (
              <span className="admin-badge admin-badge--muted">missing</span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" disabled={!canGenerate || generating} onClick={handleGenerate}>
              {generating ? "Generating..." : generateLabel}
            </Button>
            <Button type="button" variant="accent" disabled={!image || isApproved || approving} onClick={handleApprove}>
              {approving ? "Approving..." : isApproved ? "Approved" : "Approve"}
            </Button>
          </div>
        </div>

        {image?.previewUrl ? (
          <div className="admin-panel admin-panel--muted" aria-label="Hero image preview">
            <div
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: "16 / 9",
                borderRadius: 14,
                overflow: "hidden",
                boxShadow: "inset 0 0 0 14px var(--brand-paper)",
              }}
            >
              <img
                src={image.previewUrl}
                alt="Place hero preview"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </div>
          </div>
        ) : (
          <div className="admin-panel admin-panel--muted">
            <p className="admin-note-small">No hero image generated yet.</p>
          </div>
        )}

        {error ? (
          <p className="admin-message admin-message--error" aria-live="assertive">
            {error}
          </p>
        ) : null}
      </Card>
    </section>
  );
}
