import { z } from "zod";
import type { BirdDossier } from "@/types/dossier";
import { leafletsSchema } from "@/lib/leafletsSchema";

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

  const habitatClassSchema = z.enum(["erdő", "vízpart", "puszta", "hegy", "város"]);
  const colorBgSchema = z.enum(["white", "black", "grey", "brown", "yellow", "orange", "red", "green", "blue"]);

  const pillMetaSchema = z.object({
    habitat_class: habitatClassSchema,
    color_bg: colorBgSchema.default("grey"),
    region_teaser: trimmedString(),
    size_cm: measurementSchema,
    wingspan_cm: measurementSchema,
    diet_short: trimmedString(),
    lifespan_years: measurementSchema,
  });

const IDENTIFICATION_AXIS_VALUES = ["csor", "tollazat", "hang", "mozgas"] as const;

function repairHungarianMojibake(input: string): string {
  // Handles common UTF-8-as-Windows-1250/ISO-8859-* mojibake sequences seen in axis labels.
  // Example: "CsĹ‘r" (csőr), "MozgĂˇs" (mozgás).
  return input
    .replace(/Ăˇ/g, "á")
    .replace(/Ă©/g, "é")
    .replace(/Ă­/g, "í")
    .replace(/Ăł/g, "ó")
    .replace(/Ă¶/g, "ö")
    .replace(/ĂĽ/g, "ü")
    .replace(/Ĺ±/g, "ű")
    .replace(/Ĺ‘/g, "ő")
    .replace(/Å‘/g, "ő");
}

function normalizeIdentificationAxisToken(value: unknown): unknown {
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  if (!trimmed) return value;

  const normalized = repairHungarianMojibake(trimmed)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const tokens = normalized.split(" ").filter(Boolean).slice(0, 6);
  for (const t of tokens) {
    if ((IDENTIFICATION_AXIS_VALUES as readonly string[]).includes(t)) return t;
  }

  for (const t of tokens) {
    if (t.startsWith("csor")) return "csor";
    if (t.startsWith("tollazat")) return "tollazat";
    if (t.startsWith("hang")) return "hang";
    if (t.startsWith("mozgas")) return "mozgas";
  }

  return value;
}

const identificationAxisSchema = z.preprocess(
  normalizeIdentificationAxisToken,
  z.enum(IDENTIFICATION_AXIS_VALUES)
);

// v2.2: fixed recognition axes (legacy, still accepted for existing rows)
const keyFeatureSchemaV22 = z
  .object({
    title: z.enum(["Csőr", "Tollazat", "Hang", "Mozgás"]),
    description: trimmedString(),
  })
  .strict();

const identificationSchemaV22 = z
  .object({
    key_features: z.tuple([
      keyFeatureSchemaV22,
      keyFeatureSchemaV22,
      keyFeatureSchemaV22,
      keyFeatureSchemaV22,
    ]),
    identification_paragraph: trimmedString(),
  })
  .strict();

// v2.3: dynamic titles + stable axis field
const keyFeatureSchemaV23 = z
  .object({
    axis: identificationAxisSchema,
    title: trimmedString().max(80, "Keep identification titles concise (≤80 chars)."),
    description: trimmedString(),
  })
  .strict();

const IDENTIFICATION_AXIS_ORDER = ["csor", "tollazat", "hang", "mozgas"] as const;

const identificationSchemaV23 = z
  .object({
    key_features: z
      .array(keyFeatureSchemaV23)
      .length(4, "Exactly four identification key features are required."),
    identification_paragraph: trimmedString(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const axes = value.key_features.map((feature) => feature.axis);

    if (new Set(axes).size !== axes.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["key_features"],
        message: "identification.key_features axis values must be unique.",
      });
    }

    IDENTIFICATION_AXIS_ORDER.forEach((axis, index) => {
      const found = axes[index];
      if (found !== axis) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["key_features", index, "axis"],
          message: `Expected axis order: ${IDENTIFICATION_AXIS_ORDER.join(", ")}.`,
        });
      }
    });
  });

const taxonomySchema = z.object({
  order: nullableTrimmedString(),
  family: nullableTrimmedString(),
  genus: nullableTrimmedString(),
  species: nullableTrimmedString(),
});

export const birdIdentificationBlockSchemaV23 = z
  .object({
    identification: identificationSchemaV23,
  })
  .strict();

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

const birdDossierSchemaV22 = z
  .object({
    schema_version: z.literal("v2.2"),
    signature_trait: z.string().min(12).max(200),
    header: headerSchema,
    pill_meta: pillMetaSchema,
    short_options: shortOptionsSchema,
    long_paragraphs: longParagraphsSchema,
    identification: identificationSchemaV22,
    distribution: distributionSchema,
    nesting: nestingSchema,
    migration: migrationSchema,
    fun_fact: trimmedString(),
    did_you_know: trimmedString(),
    ethics_tip: trimmedString(),
    typical_places: z.array(trimmedString()).min(1, "Include at least one typical place."),
    leaflets: leafletsSchema,
  })
  .strict();

const birdDossierSchemaV23 = z
  .object({
    schema_version: z.literal("v2.3"),
    signature_trait: z.string().min(12).max(200),
    header: headerSchema,
    pill_meta: pillMetaSchema,
    short_options: shortOptionsSchema,
    long_paragraphs: longParagraphsSchema,
    identification: identificationSchemaV23,
    distribution: distributionSchema,
    nesting: nestingSchema,
    migration: migrationSchema,
    fun_fact: trimmedString(),
    did_you_know: trimmedString(),
    ethics_tip: trimmedString(),
    typical_places: z.array(trimmedString()).min(1, "Include at least one typical place."),
    leaflets: leafletsSchema,
  })
  .strict();

export const birdDossierSchema = z.discriminatedUnion("schema_version", [
  birdDossierSchemaV22,
  birdDossierSchemaV23,
]);

export type BirdDossierSchema = z.infer<typeof birdDossierSchema>;

export function parseBirdDossier(payload: unknown): BirdDossier {
  return birdDossierSchema.parse(payload);
}

export function parseBirdIdentificationBlockV23(payload: unknown) {
  return birdIdentificationBlockSchemaV23.parse(payload).identification;
}

export function formatDossierValidationErrors(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join(".") || "(root)",
    message: issue.message,
  }));
}
