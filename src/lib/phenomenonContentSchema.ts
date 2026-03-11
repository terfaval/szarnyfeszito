import { z } from "zod";

const trimmedText = z.string().trim();
const optionalText = trimmedText.nullable().optional();

const asTrimmedString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const phenomenonVariantsInputSchema = z
  .object({
    teaser: optionalText,
    short: optionalText,
    long: optionalText,
    spectacular_moment: optionalText,
    timing: optionalText,
    how_to_watch: optionalText,
    what_to_look_for: optionalText,
    ethics_tip: optionalText,
    did_you_know: optionalText,
  })
  .passthrough()
  .partial()
  .transform((input) => ({
    teaser: asTrimmedString(input.teaser),
    short: asTrimmedString(input.short),
    long: asTrimmedString(input.long),
    spectacular_moment: asTrimmedString(input.spectacular_moment),
    timing: asTrimmedString(input.timing),
    how_to_watch: asTrimmedString(input.how_to_watch),
    what_to_look_for: asTrimmedString(input.what_to_look_for),
    ethics_tip: asTrimmedString(input.ethics_tip),
    did_you_know: asTrimmedString(input.did_you_know),
  }));

export const phenomenonUiVariantsSchemaV1 = z
  .object({
    schema_version: z.literal("phenomenon_ui_variants_v1"),
    language: z.literal("hu"),
    variants: phenomenonVariantsInputSchema.nullable().optional(),
  })
  .passthrough()
  .transform((input) => ({
    schema_version: "phenomenon_ui_variants_v1" as const,
    language: "hu" as const,
    variants: phenomenonVariantsInputSchema.parse(input.variants ?? {}),
  }));

export type PhenomenonUiVariantsV1 = z.infer<typeof phenomenonUiVariantsSchemaV1>;

