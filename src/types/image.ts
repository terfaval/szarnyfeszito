export type ImageStyleFamily = "scientific" | "iconic";

export type ImageVariant =
  | "main_habitat"
  | "standing_clean"
  | "flight_clean"
  | "fixed_pose_icon_v1";

export type ImageReviewStatus = "draft" | "reviewed" | "approved";

export type ImageRecord = {
  id: string;
  entity_type: "bird" | "place" | "phenomenon";
  entity_id: string;
  style_family: ImageStyleFamily;
  variant: ImageVariant;
  storage_path: string;
  review_status: ImageReviewStatus;
  version: string;
  created_at: string;
  updated_at: string;
  review_comment?: string;
};

export type ImageSpec = {
  style_family: ImageStyleFamily;
  variant: ImageVariant;
};
