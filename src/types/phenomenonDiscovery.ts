import type { PhenomenonSeason, PhenomenonType } from "@/types/phenomenon";

export type PhenomenonDiscoveryDraft = {
  id: string;
  place_id: string;
  season: PhenomenonSeason;
  phenomenon_type: PhenomenonType;
  typical_start_mmdd: string;
  typical_end_mmdd: string;
  plausibility_score: number;
  confidence_score: number;
  why_here: string;
  why_now: string;
  profile_version: string;
  scoring_version: string;
  taxonomy_version: string;
  source_hash: string;
  created_at: string;
  updated_at: string;
};

export type PlaceSeasonalProfile = {
  id: string;
  place_id: string;
  region_id: string | null;
  season: PhenomenonSeason;
  habitat_profile_json: Record<string, unknown>;
  bird_support_profile_json: Record<string, unknown>;
  candidate_phenomena_json: Array<Record<string, unknown>>;
  top_phenomenon_types_json: Array<Record<string, unknown>>;
  profile_version: string;
  taxonomy_version: string;
  scoring_version: string;
  generated_at: string;
  source_hash: string;
};
