import { supabaseServerClient } from "@/lib/supabaseServerClient";
import { hashPrompt } from "@/lib/promptHash";
import { getPlaceById } from "@/lib/placeService";
import { listApprovedPublishedBirdLinksForPlace } from "@/lib/placeBirdService";
import {
  buildHabitatProfile,
  buildBirdSupportProfile,
  generateCandidates,
  DISCOVERY_PROFILE_VERSION,
  DISCOVERY_SCORING_VERSION,
  DISCOVERY_TAXONOMY_VERSION,
  type DiscoveryCandidate,
} from "@/lib/phenomenonDiscovery";
import type { PhenomenonSeason } from "@/types/phenomenon";
import type { PlaceSeasonalProfile } from "@/types/phenomenonDiscovery";

type ProfileBuildResult = {
  profile: Omit<PlaceSeasonalProfile, "id" | "generated_at">;
  candidates: DiscoveryCandidate[];
};

function buildSourceHash(input: Record<string, unknown>) {
  return hashPrompt(JSON.stringify(input));
}

export async function buildPlaceSeasonalProfile(args: {
  place_id: string;
  season: PhenomenonSeason;
}): Promise<ProfileBuildResult> {
  const place = await getPlaceById(args.place_id);
  if (!place) {
    throw new Error("Place not found for seasonal profile.");
  }

  const placeBirdLinks = await listApprovedPublishedBirdLinksForPlace(place.id);
  const habitat = buildHabitatProfile(place);
  const birdSupport = buildBirdSupportProfile(placeBirdLinks, args.season);
  const candidates = generateCandidates({
    place,
    season: args.season,
    habitat,
    birdSupport,
  });

  const topTypes = candidates
    .slice()
    .sort((a, b) => b.opportunity_score - a.opportunity_score)
    .slice(0, 3)
    .map((candidate) => ({
      phenomenon_type: candidate.phenomenon_type,
      opportunity_score: candidate.opportunity_score,
    }));

  const sourceHash = buildSourceHash({
    place_id: place.id,
    season: args.season,
    place_updated_at: place.updated_at,
    bird_count: placeBirdLinks.length,
    profile_version: DISCOVERY_PROFILE_VERSION,
    scoring_version: DISCOVERY_SCORING_VERSION,
    taxonomy_version: DISCOVERY_TAXONOMY_VERSION,
  });

  return {
    profile: {
      place_id: place.id,
      region_id: place.leaflet_region_id ?? null,
      season: args.season,
      habitat_profile_json: habitat,
      bird_support_profile_json: birdSupport,
      candidate_phenomena_json: candidates,
      top_phenomenon_types_json: topTypes,
      profile_version: DISCOVERY_PROFILE_VERSION,
      taxonomy_version: DISCOVERY_TAXONOMY_VERSION,
      scoring_version: DISCOVERY_SCORING_VERSION,
      source_hash: sourceHash,
    },
    candidates,
  };
}

export async function getLatestPlaceSeasonalProfile(args: {
  place_id: string;
  season: PhenomenonSeason;
  profile_version: string;
  taxonomy_version: string;
  scoring_version: string;
}): Promise<PlaceSeasonalProfile | null> {
  const { data, error } = await supabaseServerClient
    .from("place_seasonal_profiles")
    .select(
      "id,place_id,region_id,season,habitat_profile_json,bird_support_profile_json,candidate_phenomena_json,top_phenomenon_types_json,profile_version,taxonomy_version,scoring_version,generated_at,source_hash"
    )
    .eq("place_id", args.place_id)
    .eq("season", args.season)
    .eq("profile_version", args.profile_version)
    .eq("taxonomy_version", args.taxonomy_version)
    .eq("scoring_version", args.scoring_version)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data ?? null) as PlaceSeasonalProfile | null;
}

export async function upsertPlaceSeasonalProfile(profile: Omit<PlaceSeasonalProfile, "id" | "generated_at">) {
  const { data, error } = await supabaseServerClient
    .from("place_seasonal_profiles")
    .upsert(
      {
        ...profile,
        generated_at: new Date().toISOString(),
      },
      {
        onConflict: "place_id,season,profile_version,taxonomy_version,scoring_version",
      }
    )
    .select(
      "id,place_id,region_id,season,habitat_profile_json,bird_support_profile_json,candidate_phenomena_json,top_phenomenon_types_json,profile_version,taxonomy_version,scoring_version,generated_at,source_hash"
    )
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to upsert place seasonal profile.");
  }

  return data as PlaceSeasonalProfile;
}

export async function getOrCreatePlaceSeasonalProfile(args: {
  place_id: string;
  season: PhenomenonSeason;
}) {
  const existing = await getLatestPlaceSeasonalProfile({
    place_id: args.place_id,
    season: args.season,
    profile_version: DISCOVERY_PROFILE_VERSION,
    taxonomy_version: DISCOVERY_TAXONOMY_VERSION,
    scoring_version: DISCOVERY_SCORING_VERSION,
  });

  if (existing) {
    return { profile: existing, candidates: (existing.candidate_phenomena_json ?? []) as DiscoveryCandidate[] };
  }

  const built = await buildPlaceSeasonalProfile(args);
  const saved = await upsertPlaceSeasonalProfile(built.profile);
  return { profile: saved, candidates: built.candidates };
}
