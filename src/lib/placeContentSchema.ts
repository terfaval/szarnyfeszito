import { z } from "zod";

const nonEmptyText = z.string().trim().min(1);

export const seasonalSnippetSchema = z.object({
  spring: nonEmptyText,
  summer: nonEmptyText,
  autumn: nonEmptyText,
  winter: nonEmptyText,
});

export const placeUiVariantsSchemaV1 = z.object({
  schema_version: z.literal("place_ui_variants_v1"),
  language: z.literal("hu"),
  variants: z.object({
    teaser: nonEmptyText,
    short: nonEmptyText,
    long: nonEmptyText,
    seasonal_snippet: seasonalSnippetSchema,
    ethics_tip: nonEmptyText,
    did_you_know: nonEmptyText,
    practical_tip: nonEmptyText,
    when_to_go: nonEmptyText,
    who_is_it_for: nonEmptyText,
    nearby_protection_context: nonEmptyText,
  }),
});

export type PlaceUiVariantsV1 = z.infer<typeof placeUiVariantsSchemaV1>;

