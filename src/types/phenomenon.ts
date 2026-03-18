export const PHENOMENON_STATUS_VALUES = ["draft", "reviewed", "published"] as const;
export type PhenomenonStatus = (typeof PHENOMENON_STATUS_VALUES)[number];

export const PHENOMENON_SEASON_VALUES = ["spring", "summer", "autumn", "winter"] as const;
export type PhenomenonSeason = (typeof PHENOMENON_SEASON_VALUES)[number];

export type SpaRegionOption = {
  region_id: string | null;
  name: string;
  scope: "hungary" | "hungary_extended";
  country_code?: string | null;
  distance_to_hungary_km?: number | null;
};

export const PHENOMENON_TYPE_VALUES = [
  "migration_peak",
  "feeding_concentration",
  "roost_movement",
  "vocal_activity_peak",
  "water_level_window",
  "raptor_passage",
  "winter_gathering",
  "breeding_activity_window",
] as const;
export type PhenomenonType = (typeof PHENOMENON_TYPE_VALUES)[number];

export const PHENOMENON_BIRD_REVIEW_STATUS_VALUES = ["suggested", "approved"] as const;
export type PhenomenonBirdReviewStatus = (typeof PHENOMENON_BIRD_REVIEW_STATUS_VALUES)[number];

export const PHENOMENON_ORIGIN_VALUES = ["legacy_spa", "place_discovery_v1"] as const;
export type PhenomenonOrigin = (typeof PHENOMENON_ORIGIN_VALUES)[number];

export type Phenomenon = {
  id: string;
  slug: string;
  title: string;
  phenomenon_type: PhenomenonType;
  season: PhenomenonSeason;
  place_id: string | null;
  region_id: string;
  typical_start_mmdd: string | null;
  typical_end_mmdd: string | null;
  status: PhenomenonStatus;
  generation_input: string | null;
  discovery_draft_id: string | null;
  origin: PhenomenonOrigin | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PhenomenonBirdLink = {
  id: string;
  phenomenon_id: string;
  bird_id: string | null;
  pending_bird_name_hu: string | null;
  review_status: PhenomenonBirdReviewStatus;
  rank: number;
  created_at: string;
  updated_at: string;
};
