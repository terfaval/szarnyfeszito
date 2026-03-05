export type BirdStatus =
  | "draft"
  | "text_generated"
  | "text_approved"
  | "images_generated"
  | "images_approved"
  | "published";

export type BirdSubStatus = "none" | "generated" | "approved";

export type Bird = {
  id: string;
  slug: string;
  name_hu: string;
  name_latin?: string | null;
  status: BirdStatus;
  science_dossier_status: BirdSubStatus;
  visual_brief_status: BirdSubStatus;
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
  science_dossier_status?: BirdSubStatus;
  visual_brief_status?: BirdSubStatus;
};

export const BIRD_STATUS_VALUES: BirdStatus[] = [
  "draft",
  "text_generated",
  "text_approved",
  "images_generated",
  "images_approved",
  "published",
];
