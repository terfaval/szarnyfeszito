import { z } from "zod";

const proportionsBodySchemaV1 = z.preprocess((value) => {
  if (value === "medium") return "average";
  return value;
}, z.enum(["slim", "average", "stocky"]));

const nestingConfidenceSchemaV1 = z.preprocess((value) => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "medium") return "med";
  }
  return value;
}, z.enum(["high", "med", "low"]));

const confidenceSchema = z
  .object({
    per_section: z.enum(["high", "medium", "low"]),
    notes: z.string().optional().default(""),
  })
  .strict();

const visualBriefScientificMainHabitatSchemaV1 = z
  .object({
    pose: z.string().min(1),
    composition_rules: z.array(z.string().min(1)).default([]),
    habitat_hint_elements: z.array(z.string().min(1)).min(2).max(4),
    background_rules: z.array(z.string().min(1)).default([]),
    must_not: z.array(z.string().min(1)).default([]),
  })
  .strict();

const visualBriefScientificFlightCleanSchemaV1 = z
  .object({
    flight_pose: z.string().min(1),
    wing_structure_notes: z.string().min(1),
  })
  .strict();

const visualBriefScientificNestingCleanSchemaV1 = z
  .object({
    nest_type: z.string().min(1),
    nest_material: z.string().min(1),
    chicks_visible: z.boolean(),
    confidence: nestingConfidenceSchemaV1,
  })
  .strict();

const visualBriefScientificSchemaV1 = z.preprocess((value) => {
  if (!value || typeof value !== "object") return value;

  const raw = value as Record<string, unknown>;
  const next: Record<string, unknown> = { ...raw };

  if (next.flight_clean === null) delete next.flight_clean;
  if (next.nesting_clean === null) delete next.nesting_clean;

  if (next.flight_clean !== undefined) {
    const parsed = visualBriefScientificFlightCleanSchemaV1.safeParse(next.flight_clean);
    if (parsed.success) next.flight_clean = parsed.data;
    else delete next.flight_clean;
  }

  if (next.nesting_clean !== undefined) {
    const parsed = visualBriefScientificNestingCleanSchemaV1.safeParse(next.nesting_clean);
    if (parsed.success) next.nesting_clean = parsed.data;
    else delete next.nesting_clean;
  }

  return next;
}, z.object({
  main_habitat: visualBriefScientificMainHabitatSchemaV1,
  flight_clean: visualBriefScientificFlightCleanSchemaV1.optional(),
  nesting_clean: visualBriefScientificNestingCleanSchemaV1.optional(),
}).strict());

const visualBriefIconicSchemaV1 = z
  .object({
    silhouette_focus: z.array(z.string().min(1)).min(2).max(3),
    simplify_features: z.array(z.string().min(1)).default([]),
    color_guidance: z.string().optional(),
    must_not: z.array(z.string().min(1)).default([]),
    background: z.literal("none"),
  })
  .strict();

export const scienceDossierSchemaV1 = z
  .object({
    species_identity: z
      .object({
        name_hu: z.string().min(1),
        name_latin: z.string().min(1),
      })
      .strict(),
    confusion_set: z
      .array(
        z
          .object({
            species_name: z.string().min(1),
            quick_diff: z.string().min(1),
          })
          .strict()
      )
      .default([]),
    key_field_marks: z
      .array(
        z
          .object({
            mark: z.string().min(1),
          })
          .strict()
      )
      .max(8)
      .default([]),
    proportions: z
      .object({
        neck: z.enum(["short", "medium", "long"]),
        legs: z.enum(["short", "medium", "long"]),
        body: proportionsBodySchemaV1,
        beak: z
          .object({
            length: z.enum(["short", "medium", "long"]),
            shape: z.enum(["straight", "curved"]),
          })
          .strict(),
      })
      .strict(),
    plumage_variants: z
      .object({
        adult: z.string().min(1),
        juvenile: z.union([z.string().min(1), z.literal("not_applicable")]),
        breeding: z.union([z.string().min(1), z.literal("not_applicable")]),
        non_breeding: z.union([z.string().min(1), z.literal("not_applicable")]),
      })
      .strict(),
    must_not_include: z.array(z.string().min(1)).min(3).max(8),
    confidence: confidenceSchema,
  })
  .strict();

export const visualBriefSchemaV1 = z
  .object({
    scientific: visualBriefScientificSchemaV1,
    iconic: visualBriefIconicSchemaV1,
  })
  .strict();

export type ScienceDossierV1 = z.infer<typeof scienceDossierSchemaV1>;
export type VisualBriefV1 = z.infer<typeof visualBriefSchemaV1>;
