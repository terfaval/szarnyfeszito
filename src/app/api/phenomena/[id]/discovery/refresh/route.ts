import { NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { getPhenomenonById, updatePhenomenon } from "@/lib/phenomenonService";
import { getPlaceById } from "@/lib/placeService";
import { getOrCreatePlaceSeasonalProfile } from "@/lib/placeSeasonalProfileService";
import { createPhenomenonDiscoveryDraft } from "@/lib/phenomenonDiscoveryDraftService";
import {
  DISCOVERY_PROFILE_VERSION,
  DISCOVERY_SCORING_VERSION,
  DISCOVERY_TAXONOMY_VERSION,
  selectBestCandidate,
  selectTopCandidate,
} from "@/lib/phenomenonDiscovery";
import {
  PHENOMENA_DISCOVERY_GATE_CONFIDENCE,
  PHENOMENA_DISCOVERY_GATE_PLAUSIBILITY,
  PHENOMENA_DISCOVERY_LOW_CONFIDENCE,
  PHENOMENA_DISCOVERY_LOW_PLAUSIBILITY,
} from "@/lib/config";

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getAdminUserFromCookies();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const phenomenon = await getPhenomenonById(id);
  if (!phenomenon) return NextResponse.json({ error: "Phenomenon not found." }, { status: 404 });

  if (!phenomenon.place_id) {
    return NextResponse.json({ error: "Place-first discovery requires place_id." }, { status: 409 });
  }

  const place = await getPlaceById(phenomenon.place_id);
  if (!place) return NextResponse.json({ error: "Place not found." }, { status: 404 });

  const { profile, candidates } = await getOrCreatePlaceSeasonalProfile({
    place_id: place.id,
    season: phenomenon.season,
  });

  const top = selectTopCandidate(candidates, {
    plausibility: PHENOMENA_DISCOVERY_GATE_PLAUSIBILITY,
    confidence: PHENOMENA_DISCOVERY_GATE_CONFIDENCE,
  });
  const fallback = top ? null : selectBestCandidate(candidates);
  const chosen = top ?? fallback;
  if (!chosen) {
    return NextResponse.json({ error: "No phenomenon candidates for this place + season." }, { status: 409 });
  }
  if (!top) {
    const lowOk =
      chosen.plausibility_score >= PHENOMENA_DISCOVERY_LOW_PLAUSIBILITY &&
      chosen.confidence_score >= PHENOMENA_DISCOVERY_LOW_CONFIDENCE;
    if (!lowOk) {
      return NextResponse.json({ error: "No plausible phenomenon candidates." }, { status: 409 });
    }
  }

  const discoveryDraft = await createPhenomenonDiscoveryDraft({
    place_id: place.id,
    season: phenomenon.season,
    phenomenon_type: chosen.phenomenon_type,
    typical_start_mmdd: chosen.typical_start_mmdd,
    typical_end_mmdd: chosen.typical_end_mmdd,
    plausibility_score: chosen.plausibility_score,
    confidence_score: chosen.confidence_score,
    why_here: chosen.why_here,
    why_now: chosen.why_now,
    profile_version: DISCOVERY_PROFILE_VERSION,
    scoring_version: DISCOVERY_SCORING_VERSION,
    taxonomy_version: DISCOVERY_TAXONOMY_VERSION,
    source_hash: profile.source_hash,
  });

  const updated = await updatePhenomenon({
    id: phenomenon.id,
    discovery_draft_id: discoveryDraft.id,
    phenomenon_type: chosen.phenomenon_type,
    typical_start_mmdd: chosen.typical_start_mmdd,
    typical_end_mmdd: chosen.typical_end_mmdd,
    region_id: place.leaflet_region_id ?? phenomenon.region_id ?? null,
  });

  return NextResponse.json({ data: { phenomenon: updated, discovery_draft: discoveryDraft } });
}
