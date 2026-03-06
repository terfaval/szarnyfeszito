import type {
  BirdSizeCategory,
  BirdVisibilityCategory,
  BirdVisibilityCategoryLegacy,
} from "@/types/bird";

export type BirdClassificationConfidence = "low" | "medium" | "high";

export type BirdClassificationPayloadV1 = {
  schema_version: "v1";
  inputs: {
    size_cm: { min: number | null; max: number | null };
    distribution_regions?: string[];
    is_migratory: boolean | null;
    migration_timing: string | null;
  };
  suggested: {
    size_category: BirdSizeCategory | null;
    visibility_category: BirdVisibilityCategoryLegacy | null;
    confidence: BirdClassificationConfidence;
    rationale: string;
  };
  approved?: {
    size_category: BirdSizeCategory | null;
    visibility_category: BirdVisibilityCategoryLegacy | null;
    approved_source: "manual" | "ai_suggestion";
    approved_at: string;
  };
};

export type BirdClassificationPayloadV2 = {
  schema_version: "v2";
  inputs: {
    size_cm: { min: number | null; max: number | null };
    distribution_regions?: string[];
    is_migratory: boolean | null;
    migration_timing: string | null;
  };
  suggested: {
    size_category: BirdSizeCategory | null;
    visibility_category: BirdVisibilityCategory | null;
    confidence: BirdClassificationConfidence;
    rationale: string;
  };
  approved?: {
    size_category: BirdSizeCategory | null;
    visibility_category: BirdVisibilityCategory | null;
    approved_source: "manual" | "ai_suggestion";
    approved_at: string;
  };
};

export type BirdClassificationPayload = BirdClassificationPayloadV1 | BirdClassificationPayloadV2;
