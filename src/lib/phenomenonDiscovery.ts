import type { Place } from "@/types/place";
import type { PhenomenonSeason, PhenomenonType } from "@/types/phenomenon";
import type { ApprovedPublishedPlaceBirdLink } from "@/lib/placeBirdService";

export const DISCOVERY_PROFILE_VERSION = "profile_v1";
export const DISCOVERY_SCORING_VERSION = "scoring_v1";
export const DISCOVERY_TAXONOMY_VERSION = "phenomenon_tax_v1";

export type HabitatProfile = {
  reedbed_present: boolean;
  open_water_present: boolean;
  shallow_water_likely: boolean;
  marsh_mosaic_present: boolean;
  woodland_edge_present: boolean;
  grassland_open_present: boolean;
  urban_waterfront_present: boolean;
};

export type BirdSupportProfile = {
  visible_count: number;
  weighted_score: number;
  score_normalized: number;
};

export type DiscoveryCandidate = {
  phenomenon_type: PhenomenonType;
  season: PhenomenonSeason;
  typical_start_mmdd: string;
  typical_end_mmdd: string;
  plausibility_score: number;
  confidence_score: number;
  why_here: string;
  why_now: string;
  opportunity_score: number;
};

const FREQUENCY_WEIGHT: Record<string, number> = {
  very_common: 1,
  common: 0.8,
  regular: 0.6,
  occasional: 0.4,
  special: 0.2,
};

const WINDOW_BY_TYPE_SEASON: Record<string, Record<PhenomenonSeason, { start: string; end: string } | null>> = {
  migration_peak: {
    spring: { start: "03-25", end: "04-10" },
    summer: null,
    autumn: { start: "09-20", end: "10-05" },
    winter: null,
  },
  feeding_concentration: {
    spring: { start: "04-10", end: "04-24" },
    summer: null,
    autumn: { start: "08-25", end: "09-10" },
    winter: null,
  },
  roost_movement: {
    spring: null,
    summer: null,
    autumn: { start: "09-25", end: "10-10" },
    winter: { start: "12-10", end: "12-24" },
  },
  vocal_activity_peak: {
    spring: { start: "04-15", end: "04-29" },
    summer: { start: "05-20", end: "06-05" },
    autumn: null,
    winter: null,
  },
  winter_gathering: {
    spring: null,
    summer: null,
    autumn: null,
    winter: { start: "01-05", end: "01-20" },
  },
};

function normalizePlaceTypes(place: Place): string[] {
  const base = Array.isArray(place.place_types) ? place.place_types : [];
  const set = new Set<string>([place.place_type, ...base].filter(Boolean) as string[]);
  return Array.from(set.values());
}

export function buildHabitatProfile(place: Place): HabitatProfile {
  const types = normalizePlaceTypes(place);
  const has = (value: string) => types.includes(value);
  const isWet = has("lake") || has("river") || has("fishpond") || has("reservoir") || has("salt_lake");
  const isReed = has("reedbed") || has("marsh");
  const isShallow = has("marsh") || has("reedbed") || has("salt_lake") || has("fishpond");
  const isMosaic = has("marsh") || has("reedbed") || has("salt_lake");
  const isWoodEdge = has("forest_edge") || has("mountain_area");
  const isGrass = has("grassland") || has("farmland");
  const isUrbanWater = has("urban_waterfront");

  return {
    reedbed_present: isReed,
    open_water_present: isWet,
    shallow_water_likely: isShallow,
    marsh_mosaic_present: isMosaic,
    woodland_edge_present: isWoodEdge,
    grassland_open_present: isGrass,
    urban_waterfront_present: isUrbanWater,
  };
}

function isVisibleInSeason(season: PhenomenonSeason, row: ApprovedPublishedPlaceBirdLink): boolean {
  switch (season) {
    case "spring":
      return row.visible_in_spring === true;
    case "summer":
      return row.visible_in_summer === true;
    case "autumn":
      return row.visible_in_autumn === true;
    case "winter":
      return row.visible_in_winter === true;
    default:
      return false;
  }
}

export function buildBirdSupportProfile(
  links: ApprovedPublishedPlaceBirdLink[],
  season: PhenomenonSeason
): BirdSupportProfile {
  const visible = links.filter((row) => isVisibleInSeason(season, row));
  const visibleCount = visible.length;
  const weighted = visible.reduce((acc, row) => {
    const weight = FREQUENCY_WEIGHT[row.frequency_band ?? "regular"] ?? 0.5;
    return acc + weight;
  }, 0);
  const normalized = Math.min(1, weighted / 8);
  return {
    visible_count: visibleCount,
    weighted_score: weighted,
    score_normalized: normalized,
  };
}

function windowFor(type: PhenomenonType, season: PhenomenonSeason) {
  const bySeason = WINDOW_BY_TYPE_SEASON[type];
  if (!bySeason) return null;
  return bySeason[season] ?? null;
}

function candidateWindow(type: PhenomenonType, season: PhenomenonSeason) {
  const w = windowFor(type, season);
  if (!w) return null;
  return { start: w.start, end: w.end };
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function buildWhyHere(place: Place, habitat: HabitatProfile): string {
  if (habitat.reedbed_present) return "Reedbed/marsh habitat supports concentrated seasonal activity.";
  if (habitat.open_water_present) return "Open water presence supports seasonal congregations.";
  if (habitat.woodland_edge_present) return "Woodland edge conditions support seasonal activity peaks.";
  if (habitat.grassland_open_present) return "Open grassland mosaic supports visible seasonal movement.";
  if (habitat.urban_waterfront_present) return "Urban waterfront access supports concentrated observation windows.";
  return `Place context supports seasonal opportunity at ${place.name ?? "this site"}.`;
}

function buildWhyNow(season: PhenomenonSeason): string {
  switch (season) {
    case "spring":
      return "Spring brings arrival, territorial activity, and migration pulses.";
    case "summer":
      return "Summer activity peaks around breeding and local feeding windows.";
    case "autumn":
      return "Autumn movement concentrates passage and pre-winter gatherings.";
    case "winter":
      return "Winter concentrates birds at open water and refuges.";
    default:
      return "Seasonal window drives a short, focused opportunity.";
  }
}

function baseOpportunityScore(type: PhenomenonType, habitat: HabitatProfile) {
  if (type === "migration_peak") return habitat.grassland_open_present || habitat.open_water_present ? 0.85 : 0.6;
  if (type === "feeding_concentration") return habitat.shallow_water_likely ? 0.9 : 0.6;
  if (type === "roost_movement") return habitat.reedbed_present || habitat.open_water_present ? 0.8 : 0.5;
  if (type === "vocal_activity_peak") return habitat.reedbed_present || habitat.woodland_edge_present ? 0.75 : 0.5;
  if (type === "winter_gathering") return habitat.open_water_present ? 0.85 : 0.5;
  return 0.5;
}

export function generateCandidates(args: {
  place: Place;
  season: PhenomenonSeason;
  habitat: HabitatProfile;
  birdSupport: BirdSupportProfile;
}): DiscoveryCandidate[] {
  const { place, season, habitat, birdSupport } = args;
  const candidates: Array<PhenomenonType> = [];

  if (season === "spring" || season === "autumn") {
    candidates.push("migration_peak");
    if (habitat.shallow_water_likely || habitat.open_water_present) {
      candidates.push("feeding_concentration");
    }
  }

  if (season === "autumn" || season === "winter") {
    if (habitat.reedbed_present || habitat.open_water_present) {
      candidates.push("roost_movement");
    }
  }

  if (season === "spring" || season === "summer") {
    if (habitat.reedbed_present || habitat.woodland_edge_present) {
      candidates.push("vocal_activity_peak");
    }
  }

  if (season === "winter" && habitat.open_water_present) {
    candidates.push("winter_gathering");
  }

  const unique = Array.from(new Set(candidates));
  return unique
    .map((type) => {
      const window = candidateWindow(type, season);
      if (!window) return null;
      const habitatFit = 1;
      const plausibility = clamp01(0.5 * habitatFit + 0.5 * birdSupport.score_normalized);
      const confidence = clamp01(birdSupport.visible_count / 8);
      const opportunity = clamp01(baseOpportunityScore(type, habitat) * (0.6 + 0.4 * birdSupport.score_normalized));
      return {
        phenomenon_type: type,
        season,
        typical_start_mmdd: window.start,
        typical_end_mmdd: window.end,
        plausibility_score: plausibility,
        confidence_score: confidence,
        why_here: buildWhyHere(place, habitat),
        why_now: buildWhyNow(season),
        opportunity_score: opportunity,
      };
    })
    .filter(Boolean) as DiscoveryCandidate[];
}

export function selectTopCandidate(
  candidates: DiscoveryCandidate[],
  gate: { plausibility: number; confidence: number }
): DiscoveryCandidate | null {
  const gated = candidates.filter(
    (c) => c.plausibility_score >= gate.plausibility && c.confidence_score >= gate.confidence
  );
  if (gated.length === 0) return null;
  return gated.sort((a, b) => b.opportunity_score - a.opportunity_score)[0];
}

export function selectBestCandidate(candidates: DiscoveryCandidate[]): DiscoveryCandidate | null {
  if (candidates.length === 0) return null;
  return candidates.slice().sort((a, b) => b.opportunity_score - a.opportunity_score)[0];
}
