import type { ImageReviewStatus } from "@/types/image";

type ImageReviewStatusPillProps = {
  status: ImageReviewStatus;
};

const STATUS_TO_PILL_CLASS: Record<ImageReviewStatus, string> = {
  draft: "status-pill--draft",
  reviewed: "status-pill--reviewed",
  approved: "status-pill--text_approved",
};

export function ImageReviewStatusPill({ status }: ImageReviewStatusPillProps) {
  return (
    <span className={`status-pill ${STATUS_TO_PILL_CLASS[status]}`}>
      {status.replace(/_/g, " ").toUpperCase()}
    </span>
  );
}

export default ImageReviewStatusPill;

