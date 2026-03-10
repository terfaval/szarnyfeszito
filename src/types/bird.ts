export type BirdStatus =
  | "draft"
  | "text_generated"
  | "text_approved"
  | "images_generated"
  | "images_approved"
  | "published";

export type BirdSubStatus = "none" | "generated" | "approved";

export type BirdSizeCategory = "very_small" | "small" | "medium" | "large";

export type BirdVisibilityCategory =
  | "common_hu"
  | "localized_hu"
  | "seasonal_hu"
  | "rare_hu"
  | "not_in_hu";

export type BirdVisibilityCategoryLegacy = "frequent" | "seasonal" | "rare";

export type BirdColorTag =
  | "white"
  | "black"
  | "grey"
  | "brown"
  | "yellow"
  | "orange"
  | "red"
  | "green"
  | "blue";

export type Bird = {
  id: string;
  slug: string;
  name_hu: string;
  name_latin?: string | null;
  status: BirdStatus;
  published_at?: string | null;
  published_revision?: number;
  science_dossier_status: BirdSubStatus;
  visual_brief_status: BirdSubStatus;
  size_category: BirdSizeCategory | null;
  visibility_category: BirdVisibilityCategory | null;
  classification_status: BirdSubStatus;
  color_tags: BirdColorTag[];
  created_at: string;
  updated_at: string;
};

export type BirdCreateInput = {
  slug: string;
  name_hu: string;
  name_latin?: string;
};

export type BirdUpdateInput = {
  id: string;
  slug?: string;
  name_hu?: string;
  name_latin?: string;
  status?: BirdStatus;
  published_at?: string | null;
  published_revision?: number;
  science_dossier_status?: BirdSubStatus;
  visual_brief_status?: BirdSubStatus;
  size_category?: BirdSizeCategory | null;
  visibility_category?: BirdVisibilityCategory | null;
  classification_status?: BirdSubStatus;
  color_tags?: BirdColorTag[];
};

export const BIRD_STATUS_VALUES: BirdStatus[] = [
  "draft",
  "text_generated",
  "text_approved",
  "images_generated",
  "images_approved",
  "published",
];
