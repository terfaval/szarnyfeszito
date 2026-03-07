import { z } from "zod";
import type {
  BirdDistributionMapPayloadV1,
  DistributionGeometry,
  GeoJSONMultiPolygon,
  GeoJSONPolygon,
} from "@/types/distributionMap";

const trimmed = () => z.string().trim().min(1);

const statusSchema = z.enum(["resident", "breeding", "wintering", "passage"] as const);

const confidenceSchema = z
  .number()
  .min(0, "confidence must be 0..1")
  .max(1, "confidence must be 0..1");

const positionSchema = z
  .tuple([z.number(), z.number()])
  .refine(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat), "Invalid position")
  .refine(([lng]) => lng >= -180 && lng <= 180, "Longitude must be -180..180")
  .refine(([, lat]) => lat >= -90 && lat <= 90, "Latitude must be -90..90");

const ringSchema = z
  .array(positionSchema)
  .min(4, "Polygon rings must have at least 4 points (closed).")
  .refine((ring) => {
    const first = ring[0];
    const last = ring[ring.length - 1];
    return first[0] === last[0] && first[1] === last[1];
  }, "Polygon rings must be closed (first == last).");

const polygonSchema: z.ZodType<GeoJSONPolygon> = z.object({
  type: z.literal("Polygon"),
  coordinates: z.array(ringSchema).min(1, "Polygon must have at least one ring."),
});

const multiPolygonSchema: z.ZodType<GeoJSONMultiPolygon> = z.object({
  type: z.literal("MultiPolygon"),
  coordinates: z.array(z.array(ringSchema).min(1)).min(1),
});

export const geometrySchema: z.ZodType<DistributionGeometry> = z.union([
  polygonSchema,
  multiPolygonSchema,
]);

export const distributionRangeSchema = z
  .object({
    status: statusSchema,
    confidence: confidenceSchema,
    note: z.string().trim().max(600).optional().nullable(),
    geometry: geometrySchema,
  })
  .strict();

export const distributionMapPayloadSchemaV1 = z
  .object({
    species_common_name: trimmed(),
    species_scientific_name: trimmed(),
    summary: trimmed().max(1200),
    references: z.array(trimmed().max(400)).max(24),
    ranges: z.array(distributionRangeSchema).max(48),
  })
  .strict();

export type DistributionMapPayloadSchemaV1 = z.infer<typeof distributionMapPayloadSchemaV1>;

export function parseDistributionMapPayloadV1(payload: unknown): BirdDistributionMapPayloadV1 {
  return distributionMapPayloadSchemaV1.parse(payload) as BirdDistributionMapPayloadV1;
}

