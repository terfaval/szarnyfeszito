import { z } from "zod";
import type { BirdDossierLeaflets, BirdDossierLeafletsV1, BirdDossierLeafletsV2 } from "@/types/dossier";

const trimmed = () => z.string().trim().min(1);

const intensitySchema = z
  .number()
  .min(0, "Intensity must be between 0 and 1.")
  .max(1, "Intensity must be between 0 and 1.");

const worldRegionCodeSchema = z.enum([
  "europe",
  "africa",
  "asia",
  "north_america",
  "south_america",
  "oceania",
] as const);

const hungaryRegionCodeSchema = z.enum([
  "HU10",
  "HU21",
  "HU22",
  "HU23",
  "HU31",
  "HU32",
  "HU33",
] as const);

const regionSchema = <T extends z.ZodTypeAny>(codeSchema: T) =>
  z.object({
    code: codeSchema,
    intensity: intensitySchema,
    rationale: trimmed().max(220, "Keep rationales concise (≤220 chars)."),
  });

export const leafletsSchemaV1 = z
  .object({
    schema_version: z.literal("leaflets_v1"),
    model: z.string().trim().min(1).optional(),
    generated_at: z.string().trim().min(1).optional(),
    source: z.enum(["with_text", "backfill"]).optional(),
    world: z.object({
      regions: z
        .array(regionSchema(worldRegionCodeSchema))
        .min(1, "Provide at least one world region.")
        .max(8),
      note: trimmed().max(600, "Keep notes concise (≤600 chars)."),
    }),
    hungary: z.object({
      regions: z.array(regionSchema(hungaryRegionCodeSchema)).max(8),
      note: trimmed().max(600, "Keep notes concise (≤600 chars)."),
    }),
  })
  .strict();

export type LeafletsSchemaV1 = z.infer<typeof leafletsSchemaV1>;

export function parseLeafletsV1(payload: unknown): BirdDossierLeafletsV1 {
  return leafletsSchemaV1.parse(payload) as BirdDossierLeafletsV1;
}

const worldRegionCodeSchemaV2 = z.enum([
  "northern_europe",
  "western_europe",
  "eastern_europe",
  "southern_europe",
  "northern_africa",
  "sub_saharan_africa",
  "western_asia",
  "central_asia",
  "southern_asia",
  "eastern_asia",
  "south_eastern_asia",
  "north_america",
  "central_america",
  "caribbean",
  "south_america",
  "australia_nz",
  "melanesia",
  "micronesia",
  "polynesia",
] as const);

export const leafletsSchemaV2 = z
  .object({
    schema_version: z.literal("leaflets_v2"),
    model: z.string().trim().min(1).optional(),
    generated_at: z.string().trim().min(1).optional(),
    source: z.enum(["with_text", "backfill"]).optional(),
    world: z.object({
      present: z.array(worldRegionCodeSchemaV2).min(1),
      hover_hu: z.string().trim().min(1).max(600).optional(),
    }),
    hungary: z.object({
      present: z.array(hungaryRegionCodeSchema).max(8),
      hover_hu: z.string().trim().min(1).max(600).optional(),
    }),
  })
  .strict();

export type LeafletsSchemaV2 = z.infer<typeof leafletsSchemaV2>;

export const leafletsSchema = z.union([leafletsSchemaV2, leafletsSchemaV1]);

export function parseLeaflets(payload: unknown): BirdDossierLeaflets {
  return leafletsSchema.parse(payload) as BirdDossierLeaflets;
}

export function parseLeafletsV2(payload: unknown): BirdDossierLeafletsV2 {
  return leafletsSchemaV2.parse(payload) as BirdDossierLeafletsV2;
}
