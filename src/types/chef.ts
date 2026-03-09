import type { ReviewStatus } from "@/types/content";
import type { GenerationMeta } from "@/types/dossier";

export type ChefRecipeSchemaVersion = "v1";

export type ChefIngredientV1 = {
  name: string;
  amount: number | null;
  unit: string | null;
  note: string | null;
};

export type ChefRecipePayloadV1 = {
  schema_version: ChefRecipeSchemaVersion;
  language: "hu";
  title: string;
  short_description: string;
  servings: number;
  cook_time_minutes: number;
  ingredients: ChefIngredientV1[];
  steps: string[];
};

export type ChefRecipeGenerationMeta = GenerationMeta & {
  request_id: string;
  finish_reason?: string;
};

export type ChefRecipeRecord = {
  id: string;
  title: string;
  short_description: string;
  servings: number;
  cook_time_minutes: number;
  recipe_json: ChefRecipePayloadV1;
  review_status: ReviewStatus;
  last_review_note: string | null;
  generation_meta: ChefRecipeGenerationMeta | null;
  created_at: string;
  updated_at: string;
};

