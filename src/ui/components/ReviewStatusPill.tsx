import type { ReviewStatus } from "@/types/content";

type ReviewStatusPillProps = {
  status: ReviewStatus;
};

const STATUS_TO_PILL_CLASS: Record<ReviewStatus, string> = {
  draft: "status-pill--draft",
  reviewed: "status-pill--text_generated",
  approved: "status-pill--text_approved",
};

export function ReviewStatusPill({ status }: ReviewStatusPillProps) {
  return (
    <span className={`status-pill ${STATUS_TO_PILL_CLASS[status]}`}>
      {status.replace(/_/g, " ").toUpperCase()}
    </span>
  );
}

export default ReviewStatusPill;

