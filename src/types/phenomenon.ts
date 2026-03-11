export const PHENOMENON_STATUS_VALUES = ["draft", "reviewed", "published"] as const;
export type PhenomenonStatus = (typeof PHENOMENON_STATUS_VALUES)[number];

export const PHENOMENON_SEASON_VALUES = ["spring", "autumn"] as const;
export type PhenomenonSeason = (typeof PHENOMENON_SEASON_VALUES)[number];

export const PHENOMENON_TYPE_VALUES = ["migration_peak"] as const;
export type PhenomenonType = (typeof PHENOMENON_TYPE_VALUES)[number];

export const PHENOMENON_BIRD_REVIEW_STATUS_VALUES = ["suggested", "approved"] as const;
export type PhenomenonBirdReviewStatus = (typeof PHENOMENON_BIRD_REVIEW_STATUS_VALUES)[number];

export type Phenomenon = {
  id: string;
  slug: string;
  title: string;
  phenomenon_type: PhenomenonType;
  season: PhenomenonSeason;
  region_id: string;
  typical_start_mmdd: string | null;
  typical_end_mmdd: string | null;
  status: PhenomenonStatus;
  generation_input: string | null;
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

