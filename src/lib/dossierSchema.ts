import { z } from "zod";
import type { BirdDossier } from "@/types/dossier";

const trimmedString = () => z.string().trim().min(1);

const nullableTrimmedString = () =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().trim().min(1).nullable()
  );

const nullableScalarToString = () =>
  z.preprocess(
    (v) => {
      if (v === null || v === undefined) return null;
      if (typeof v === "number") return String(v);
      if (typeof v === "string") {
        const trimmed = v.trim();
        return trimmed === "" ? null : trimmed;
      }
      return v;
    },
    z.string().trim().min(1).nullable()
  );

const shortNoteString = () =>
  trimmedString().max(600, "Keep notes concise (≤600 chars).");

// Accept null, number, or numeric string.
const nullableNumber = () =>
  z.preprocess((v) => {
    if (v === null || v === undefined) return null;
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const s = v.trim();
      if (!s) return null;
      const n = Number(s.replace(",", "."));
      return Number.isFinite(n) ? n : v; // allow Zod to fail if not numeric
    }
    return v;
  }, z.number().nullable());

const measurementSchema = z.object({
  min: nullableNumber(),
  max: nullableNumber(),
});

// Short options: prevent label-like outputs, but don't over-constrain Hungarian.
const shortLine = () =>
  z
    .string()
    .trim()
    .min(70, "Short option must be 1–2 sentences (≥70 chars).")
    .max(180, "Short option should be concise (≤180 chars).");

const IUCN_STATUS_VALUES = ["LC", "NT", "VU", "EN", "CR", "EW", "EX", "DD", "NE"] as const;

const IUCN_NORMALIZATION_MAP: Record<string, (typeof IUCN_STATUS_VALUES)[number]> = {
  "least concern": "LC",
  "near threatened": "NT",
  vulnerable: "VU",
  endangered: "EN",
  "critically endangered": "CR",
  "extinct in the wild": "EW",
  extinct: "EX",
  "data deficient": "DD",
  "not evaluated": "NE",
};

const normalizeIucnValue = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const upper = trimmed.toUpperCase();
  if ((IUCN_STATUS_VALUES as readonly string[]).includes(upper)) return upper;

  const normalizedKey = trimmed
    .toLowerCase()
    .replace(/[\(\)\/]/g, " ")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const strippedSuffix = normalizedKey.replace(/\b(lc|nt|vu|en|cr|ew|ex|dd|ne)\b$/i, "").trim();

  return IUCN_NORMALIZATION_MAP[normalizedKey] ?? IUCN_NORMALIZATION_MAP[strippedSuffix] ?? trimmed;
};

const iucnSchema = z.preprocess(
  (value) => {
    if (value === null || value === undefined) return null;
    if (typeof value !== "string") return value;
    const normalized = normalizeIucnValue(value);
    return normalized ? normalized.toUpperCase() : null;
  },
  z.enum(IUCN_STATUS_VALUES).nullable()
);

const headerSchema = z.object({
  name_hu: trimmedString(),
  name_latin: trimmedString(),
  subtitle: trimmedString(),
  short_summary: trimmedString(),
});

const pillMetaSchema = z.object({
  region_teaser: trimmedString(),
  size_cm: measurementSchema,
  wingspan_cm: measurementSchema,
  diet_short: trimmedString(),
  lifespan_years: measurementSchema,
});

// Force the four recognition axes for illustration support.
const keyFeatureSchema = z.object({
  title: z.enum(["Csőr", "Tollazat", "Hang", "Mozgás"]),
  description: trimmedString(),
});

const taxonomySchema = z.object({
  order: nullableTrimmedString(),
  family: nullableTrimmedString(),
  genus: nullableTrimmedString(),
  species: nullableTrimmedString(),
});

const identificationSchema = z.object({
  key_features: z.tuple([keyFeatureSchema, keyFeatureSchema, keyFeatureSchema, keyFeatureSchema]),
  identification_paragraph: trimmedString(),
});

const distributionSchema = z.object({
  taxonomy: taxonomySchema,
  iucn_status: iucnSchema,
  distribution_regions: z.array(trimmedString()).min(1, "Provide at least one distribution region."),
  distribution_note: shortNoteString(),
});

const nestingSchema = z.object({
  nesting_type: nullableTrimmedString(),
  nest_site: nullableTrimmedString(),
  breeding_season: nullableTrimmedString(),
  clutch_or_chicks_count: nullableScalarToString(),
  nesting_note: shortNoteString(),
});

const migrationSchema = z.object({
  is_migratory: z.boolean().nullable(),
  timing: nullableTrimmedString(),
  route: nullableTrimmedString(),
  migration_note: shortNoteString(),
});

const shortOptionsSchema = z.tuple([shortLine(), shortLine(), shortLine()]);

const longParagraphsSchema = z
  .array(trimmedString())
  .length(2, "Exactly two long paragraphs are required for stability.");

export const birdDossierSchema = z
  .object({
    schema_version: z.literal("v2.1"),
    header: headerSchema,
    pill_meta: pillMetaSchema,
    short_options: shortOptionsSchema,
    long_paragraphs: longParagraphsSchema,
    identification: identificationSchema,
    distribution: distributionSchema,
    nesting: nestingSchema,
    migration: migrationSchema,
    fun_fact: trimmedString(),
    ethics_tip: trimmedString(),
    typical_places: z.array(trimmedString()).min(1, "Include at least one typical place."),
  })
  .strict();

export type BirdDossierSchema = z.infer<typeof birdDossierSchema>;

export function parseBirdDossier(payload: unknown): BirdDossier {
  return birdDossierSchema.parse(payload);
}

export function formatDossierValidationErrors(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join(".") || "(root)",
    message: issue.message,
  }));
}