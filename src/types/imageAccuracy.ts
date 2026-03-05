export type BirdSubStatus = "none" | "generated" | "approved";

export type ArtifactReviewStatus = "draft" | "approved" | "rejected";

export type ScienceDossierRecord = {
  id: string;
  bird_id: string;
  schema_version: string;
  payload: unknown;
  review_status: ArtifactReviewStatus;
  created_by: "ai" | "human" | string;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type VisualBriefRecord = {
  id: string;
  bird_id: string;
  schema_version: string;
  payload: unknown;
  review_status: ArtifactReviewStatus;
  created_by: "ai" | "human" | string;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at: string;
  updated_at: string;
};
