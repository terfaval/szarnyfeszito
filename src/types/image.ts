export type ImageStyleFamily = "scientific" | "iconic";

export type ImageVariant =
  | "main_habitat"
  | "standing_clean"
  | "flight_clean"
  | "nesting_clean"
  | "main_habitat_pair_sexes_v1"
  | "place_hero_spring_v1"
  | "fixed_pose_icon_v1";

export type ImageReviewStatus = "draft" | "reviewed" | "approved";

export type ImageRecord = {
  id: string;
  entity_type: "bird" | "place" | "phenomenon";
  entity_id: string;
  style_family: ImageStyleFamily;
  variant: ImageVariant;
  storage_path: string;
  is_current?: boolean;
  review_status: ImageReviewStatus;
  version: string;
  style_config_id?: string | null;
  seed?: number | null;
  width_px?: number | null;
  height_px?: number | null;
  provider_model?: string | null;
  spec_hash?: string | null;
  prompt_hash?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  review_comment?: string;
};

export type ImageSpec = {
  style_family: ImageStyleFamily;
  variant: ImageVariant;
};
