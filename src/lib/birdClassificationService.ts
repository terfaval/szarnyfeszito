import { supabaseServerClient } from "@/lib/supabaseServerClient";
import type { Bird, BirdSizeCategory } from "@/types/bird";
import { updateBird } from "@/lib/birdService";
import { getLatestContentBlockForBird } from "@/lib/contentService";
import { generateBirdClassificationSuggestion } from "@/lib/birdClassificationGeneration";
import type {
  BirdClassificationPayload,
  BirdClassificationPayloadV2,
} from "@/types/birdClassification";
import type { BirdVisibilityCategory, BirdVisibilityCategoryLegacy } from "@/types/bird";

export type BirdClassificationReviewStatus = "draft" | "approved" | "rejected";

export type BirdClassificationRecord = {
  id: string;
  bird_id: string;
  schema_version: string;
  payload: BirdClassificationPayload;
  review_status: BirdClassificationReviewStatus;
  created_by: string;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
};

function normalizeLegacyVisibilityCategory(
  value: BirdVisibilityCategoryLegacy | BirdVisibilityCategory | null | undefined
): BirdVisibilityCategory | null {
  if (!value) return null;
  switch (value) {
    case "frequent":
      return "common_hu";
    case "seasonal":
      return "seasonal_hu";
    case "rare":
      return "rare_hu";
    default:
      return value;
  }
}

function upgradeClassificationPayloadToV2(payload: BirdClassificationPayload): BirdClassificationPayloadV2 {
  if (payload.schema_version === "v2") {
    return payload;
  }

  return {
    schema_version: "v2",
    inputs: payload.inputs,
    suggested: {
      ...payload.suggested,
      visibility_category: normalizeLegacyVisibilityCategory(payload.suggested.visibility_category),
    },
    approved: payload.approved
      ? {
          ...payload.approved,
          visibility_category: normalizeLegacyVisibilityCategory(payload.approved.visibility_category),
        }
      : undefined,
  };
}

export async function getBirdClassificationForBird(
  birdId: string
): Promise<BirdClassificationRecord | null> {
  const { data, error } = await supabaseServerClient
    .from("bird_classifications")
    .select("*")
    .eq("bird_id", birdId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ?? null;
}

export async function listBirdClassificationsForBirdIds(
  birdIds: string[]
): Promise<BirdClassificationRecord[]> {
  if (birdIds.length === 0) {
    return [];
  }

  const { data, error } = await supabaseServerClient
    .from("bird_classifications")
    .select("*")
    .in("bird_id", birdIds);

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function upsertBirdClassification(args: {
  birdId: string;
  payload: BirdClassificationPayload;
  reviewStatus: BirdClassificationReviewStatus;
  createdBy: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
}): Promise<BirdClassificationRecord> {
  const now = new Date().toISOString();
  const {
    birdId,
    payload,
    reviewStatus,
    createdBy,
    approvedBy = null,
    approvedAt = null,
  } = args;

  const { data, error } = await supabaseServerClient
    .from("bird_classifications")
    .upsert(
      {
        bird_id: birdId,
        schema_version: payload.schema_version,
        payload,
        review_status: reviewStatus,
        created_by: createdBy,
        approved_by: approvedBy,
        approved_at: approvedAt,
        updated_at: now,
      },
      { onConflict: "bird_id" }
    )
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to persist bird classification.");
  }

  return data;
}

export async function generateAndPersistBirdClassificationSuggestion(args: {
  bird: Bird;
  createdBy: string;
}): Promise<{ classification: BirdClassificationRecord }> {
  const { bird, createdBy } = args;
  const block = await getLatestContentBlockForBird(bird.id);
  const dossier = block?.blocks_json;

  if (!dossier) {
    throw new Error("Missing Field-Guide dossier for this bird.");
  }

  const suggestion = await generateBirdClassificationSuggestion({ bird, dossier });
  const saved = await upsertBirdClassification({
    birdId: bird.id,
    payload: suggestion.payload as BirdClassificationPayload,
    reviewStatus: "draft",
    createdBy,
  });

  await updateBird({ id: bird.id, classification_status: "generated" });

  return { classification: saved };
}

export async function approveBirdClassification(args: {
  bird: Bird;
  sizeCategory: BirdSizeCategory | null;
  visibilityCategory: BirdVisibilityCategory | null;
  approvedBy: string;
  approvedByLabel: string;
  approvedSource: "manual" | "ai_suggestion";
}): Promise<{ bird: Bird; classification: BirdClassificationRecord }> {
  const {
    bird,
    sizeCategory,
    visibilityCategory,
    approvedBy,
    approvedByLabel,
    approvedSource,
  } = args;

  const now = new Date().toISOString();
  const existing = await getBirdClassificationForBird(bird.id);
  const basePayload: BirdClassificationPayloadV2 = existing?.payload
    ? upgradeClassificationPayloadToV2(existing.payload)
    : {
        schema_version: "v2",
        inputs: {
          size_cm: { min: null, max: null },
          distribution_regions: [],
          is_migratory: null,
          migration_timing: null,
        },
        suggested: {
          size_category: null,
          visibility_category: null,
          confidence: "low",
          rationale: "Manual classification (no prior AI suggestion).",
        },
      };

  const approvedPayload: BirdClassificationPayloadV2 = {
    ...basePayload,
    approved: {
      size_category: sizeCategory,
      visibility_category: visibilityCategory,
      approved_source: approvedSource,
      approved_at: now,
    },
  };

  const saved = await upsertBirdClassification({
    birdId: bird.id,
    payload: approvedPayload,
    reviewStatus: "approved",
    createdBy: existing?.created_by ?? approvedByLabel,
    approvedBy,
    approvedAt: now,
  });

  const updatedBird = await updateBird({
    id: bird.id,
    size_category: sizeCategory,
    visibility_category: visibilityCategory,
    classification_status: "approved",
  });

  return { bird: updatedBird, classification: saved };
}
