import { z } from "zod";

const trimmedText = z.string().trim();
const optionalText = trimmedText.nullable().optional();

const asTrimmedString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const seasonalSnippetInputSchema = z
  .object({
    spring: optionalText,
    summer: optionalText,
    autumn: optionalText,
    winter: optionalText,
  })
  .passthrough()
  .partial();

export const seasonalSnippetSchema = seasonalSnippetInputSchema
  .nullable()
  .optional()
  .transform((input) => ({
    spring: asTrimmedString(input?.spring),
    summer: asTrimmedString(input?.summer),
    autumn: asTrimmedString(input?.autumn),
    winter: asTrimmedString(input?.winter),
  }));

const notableUnitSchema = z
  .object({
    name: trimmedText.min(1),
    type: trimmedText.min(1).optional(),
    note: trimmedText.min(1),
  })
  .passthrough();

const placeVariantsInputSchema = z
  .object({
    teaser: optionalText,
    short: optionalText,
    long: optionalText,
    seasonal_snippet: seasonalSnippetInputSchema.nullable().optional(),
    ethics_tip: optionalText,
    did_you_know: optionalText,
    practical_tip: optionalText,
    when_to_go: optionalText,
    who_is_it_for: optionalText,
    nearby_protection_context: optionalText,
    notable_units: z.array(notableUnitSchema).nullable().optional(),
  })
  .passthrough()
  .partial()
  .transform((input) => ({
    ...input,
    teaser: asTrimmedString(input.teaser),
    short: asTrimmedString(input.short),
    long: asTrimmedString(input.long),
    ethics_tip: asTrimmedString(input.ethics_tip),
    did_you_know: asTrimmedString(input.did_you_know),
    practical_tip: asTrimmedString(input.practical_tip),
    when_to_go: asTrimmedString(input.when_to_go),
    who_is_it_for: asTrimmedString(input.who_is_it_for),
    nearby_protection_context: asTrimmedString(input.nearby_protection_context),
    seasonal_snippet: seasonalSnippetSchema.parse(input.seasonal_snippet),
    notable_units: input.notable_units ?? [],
  }));

export const placeUiVariantsSchemaV1 = z
  .object({
    schema_version: z.literal("place_ui_variants_v1"),
    language: z.literal("hu"),
    variants: placeVariantsInputSchema.nullable().optional(),
  })
  .passthrough()
  .transform((input) => ({
    ...input,
    variants: placeVariantsInputSchema.parse(input.variants ?? {}),
  }));

export type PlaceUiVariantsV1 = z.infer<typeof placeUiVariantsSchemaV1>;
