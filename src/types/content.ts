import type { BirdDossier, GenerationMeta } from "@/types/dossier";

export type FeatureBlock = {
  heading: string;
  content: string;
};

export type GeneratedContent = {
  short: string;
  long: string;
  feature_block: FeatureBlock[];
  did_you_know: string;
  ethics_tip: string;
  version: string;
};

export type ReviewStatus = "draft" | "reviewed" | "approved";

export type ContentBlock = GeneratedContent & {
  id: string;
  entity_type: "bird" | "place" | "phenomenon";
  entity_id: string;
  review_status: ReviewStatus;
  created_at: string;
  updated_at: string;
  blocks_json?: BirdDossier;
  generation_meta?: GenerationMeta;
};
