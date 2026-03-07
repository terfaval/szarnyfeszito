export type DistributionStatus = "resident" | "breeding" | "wintering" | "passage";

export type GeoJSONPosition = [number, number]; // [lng, lat]

export type GeoJSONPolygon = {
  type: "Polygon";
  coordinates: GeoJSONPosition[][];
};

export type GeoJSONMultiPolygon = {
  type: "MultiPolygon";
  coordinates: GeoJSONPosition[][][];
};

export type DistributionGeometry = GeoJSONPolygon | GeoJSONMultiPolygon;

export type DistributionRange = {
  status: DistributionStatus;
  confidence: number; // 0..1
  note?: string | null;
  geometry: DistributionGeometry;
};

export type BirdDistributionMapPayloadV1 = {
  species_common_name: string;
  species_scientific_name: string;
  summary: string;
  references: string[];
  ranges: DistributionRange[];
};

export type BirdDistributionMapRecord = {
  id: string;
  bird_id: string;
  schema_version: string;
  summary: string;
  references_list: unknown;
  ranges: unknown;
  generation_meta?: unknown;
  created_at: string;
  updated_at: string;
};
