export const PLACE_STATUS_VALUES = ["draft", "reviewed", "published"] as const;
export type PlaceStatus = (typeof PLACE_STATUS_VALUES)[number];

export const PLACE_TYPE_VALUES = [
  "lake",
  "river",
  "fishpond",
  "reservoir",
  "marsh",
  "reedbed",
  "salt_lake",
  "forest_edge",
  "grassland",
  "farmland",
  "mountain_area",
  "urban_park",
  "urban_waterfront",
  "protected_area",
] as const;
export type PlaceType = (typeof PLACE_TYPE_VALUES)[number];

export type PlaceLocationPrecision = "exact" | "approximate" | "hidden";
export type PlaceSensitivityLevel = "normal" | "sensitive";

export type Place = {
  id: string;
  slug: string;
  name: string;
  place_type: PlaceType;
  place_types: PlaceType[];
  status: PlaceStatus;

  region_landscape: string | null;
  county: string | null;
  district: string | null;
  nearest_city: string | null;
  distance_from_nearest_city_km: number | null;
  settlement: string | null;

  location_precision: PlaceLocationPrecision;
  sensitivity_level: PlaceSensitivityLevel;
  is_beginner_friendly: boolean;

  access_note: string | null;
  parking_note: string | null;
  best_visit_note: string | null;

  notable_units_json: unknown | null;
  generation_input: string | null;

  published_at: string | null;
  published_revision: number;
  created_at: string;
  updated_at: string;
};

export type PlaceMarker = {
  id: string;
  slug: string;
  name: string;
  place_type: PlaceType;
  status: PlaceStatus;
  location_precision: PlaceLocationPrecision;
  sensitivity_level: PlaceSensitivityLevel;
  is_beginner_friendly: boolean;
  lat: number | null;
  lng: number | null;
  updated_at: string;
};

export const PLACE_FREQUENCY_BANDS = [
  "very_common",
  "common",
  "regular",
  "occasional",
  "special",
] as const;
export type PlaceFrequencyBand = (typeof PLACE_FREQUENCY_BANDS)[number];

export type PlaceBirdLink = {
  id: string;
  place_id: string;
  bird_id: string | null;
  pending_bird_name_hu: string | null;
  rank: number;
  frequency_band: PlaceFrequencyBand;
  is_iconic: boolean;
  visible_in_spring: boolean;
  visible_in_summer: boolean;
  visible_in_autumn: boolean;
  visible_in_winter: boolean;
  seasonality_note: string | null;
  created_at: string;
  updated_at: string;
};
