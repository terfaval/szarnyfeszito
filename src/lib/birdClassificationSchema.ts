import { z } from "zod";
import type {
  BirdClassificationPayload,
  BirdClassificationPayloadV1,
  BirdClassificationPayloadV2,
} from "@/types/birdClassification";

const trimmedString = () => z.string().trim().min(1);

export const birdSizeCategorySchema = z.enum([
  "very_small",
  "small",
  "medium",
  "large",
]);

export const birdVisibilityCategorySchema = z.enum([
  "common_hu",
  "localized_hu",
  "seasonal_hu",
  "rare_hu",
  "not_in_hu",
]);

export const birdVisibilityCategorySchemaLegacy = z.enum(["frequent", "seasonal", "rare"]);

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
      visibility_category: birdVisibilityCategorySchemaLegacy.nullable(),
      confidence: birdClassificationConfidenceSchema,
      rationale: trimmedString().max(600),
    }),
    approved: z
      .object({
        size_category: birdSizeCategorySchema.nullable(),
        visibility_category: birdVisibilityCategorySchemaLegacy.nullable(),
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

export const birdClassificationPayloadSchemaV2 = z
  .object({
    schema_version: z.literal("v2"),
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

export type BirdClassificationPayloadSchemaV2 = z.infer<
  typeof birdClassificationPayloadSchemaV2
>;

export function parseBirdClassificationPayloadV2(
  payload: unknown
): BirdClassificationPayloadV2 {
  return birdClassificationPayloadSchemaV2.parse(payload) as BirdClassificationPayloadV2;
}

export const birdClassificationPayloadSchema = z.union([
  birdClassificationPayloadSchemaV1,
  birdClassificationPayloadSchemaV2,
]);

export type BirdClassificationPayloadSchema = z.infer<typeof birdClassificationPayloadSchema>;

export function parseBirdClassificationPayload(payload: unknown): BirdClassificationPayload {
  return birdClassificationPayloadSchema.parse(payload) as BirdClassificationPayload;
}
