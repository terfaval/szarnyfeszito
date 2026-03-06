import { z } from "zod";
import type { BirdClassificationPayloadV1 } from "@/types/birdClassification";

const trimmedString = () => z.string().trim().min(1);

export const birdSizeCategorySchema = z.enum([
  "very_small",
  "small",
  "medium",
  "large",
]);

export const birdVisibilityCategorySchema = z.enum([
  "frequent",
  "seasonal",
  "rare",
]);

export const birdClassificationConfidenceSchema = z.enum([
  "low",
  "medium",
  "high",
]);

const sizeRangeSchema = z.object({
  min: z.number().nullable(),
  max: z.number().nullable(),
});

export const birdClassificationPayloadSchemaV1 = z
  .object({
    schema_version: z.literal("v1"),
    inputs: z.object({
      size_cm: sizeRangeSchema,
      distribution_regions: z.array(trimmedString()).optional(),
      is_migratory: z.boolean().nullable(),
      migration_timing: z.string().trim().nullable(),
    }),
    suggested: z.object({
      size_category: birdSizeCategorySchema.nullable(),
      visibility_category: birdVisibilityCategorySchema.nullable(),
      confidence: birdClassificationConfidenceSchema,
      rationale: trimmedString().max(600),
    }),
    approved: z
      .object({
        size_category: birdSizeCategorySchema.nullable(),
        visibility_category: birdVisibilityCategorySchema.nullable(),
        approved_source: z.enum(["manual", "ai_suggestion"]),
        approved_at: z.string().trim().min(10),
      })
      .optional(),
  })
  .strict();

export type BirdClassificationPayloadSchemaV1 = z.infer<
  typeof birdClassificationPayloadSchemaV1
>;

export function parseBirdClassificationPayloadV1(
  payload: unknown
): BirdClassificationPayloadV1 {
  return birdClassificationPayloadSchemaV1.parse(payload) as BirdClassificationPayloadV1;
}

