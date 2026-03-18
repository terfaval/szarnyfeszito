import { NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { listPhenomena } from "@/lib/phenomenonService";
import { createPhenomenon, generateUniquePhenomenonSlug } from "@/lib/phenomenonService";
import { supabaseServerClient } from "@/lib/supabaseServerClient";
import { PHENOMENON_SEASON_VALUES, type PhenomenonSeason } from "@/types/phenomenon";
import { getPlaceById } from "@/lib/placeService";
import { getOrCreatePlaceSeasonalProfile } from "@/lib/placeSeasonalProfileService";
import { createPhenomenonDiscoveryDraft } from "@/lib/phenomenonDiscoveryDraftService";
import {
  DISCOVERY_PROFILE_VERSION,
  DISCOVERY_SCORING_VERSION,
  DISCOVERY_TAXONOMY_VERSION,
  selectTopCandidate,
} from "@/lib/phenomenonDiscovery";

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(request: Request) {
  const user = await getAdminUserFromCookies();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const search = url.searchParams.get("search") ?? undefined;

  const phenomena = await listPhenomena({ search });
  const data = phenomena.slice(0, 60).map((phenomenon) => ({
    id: phenomenon.id,
    slug: phenomenon.slug,
    title: phenomenon.title,
    phenomenon_type: phenomenon.phenomenon_type,
    season: phenomenon.season,
    place_id: phenomenon.place_id,
    region_id: phenomenon.region_id,
    status: phenomenon.status,
    typical_start_mmdd: phenomenon.typical_start_mmdd,
    typical_end_mmdd: phenomenon.typical_end_mmdd,
  }));

  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const user = await getAdminUserFromCookies();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const regionId = asString(body?.region_id);
  const placeId = asString(body?.place_id);
  const seasonRaw = asString(body?.season);
  const season = PHENOMENON_SEASON_VALUES.includes(seasonRaw as PhenomenonSeason)
    ? (seasonRaw as PhenomenonSeason)
    : null;

  if (!season) {
    return NextResponse.json({ error: `season must be one of: ${PHENOMENON_SEASON_VALUES.join(", ")}` }, { status: 400 });
  }

  if (placeId) {
    const place = await getPlaceById(placeId);
    if (!place) {
      return NextResponse.json({ error: "place_id not found." }, { status: 404 });
    }

    const { profile, candidates } = await getOrCreatePlaceSeasonalProfile({
      place_id: place.id,
      season,
    });

    const top = selectTopCandidate(candidates, { plausibility: 0.55, confidence: 0.4 });
    if (!top) {
      return NextResponse.json({ error: "No plausible phenomenon candidates for this place + season." }, { status: 409 });
    }

    const discoveryDraft = await createPhenomenonDiscoveryDraft({
      place_id: place.id,
      season,
      phenomenon_type: top.phenomenon_type,
      typical_start_mmdd: top.typical_start_mmdd,
      typical_end_mmdd: top.typical_end_mmdd,
      plausibility_score: top.plausibility_score,
      confidence_score: top.confidence_score,
      why_here: top.why_here,
      why_now: top.why_now,
      profile_version: DISCOVERY_PROFILE_VERSION,
      scoring_version: DISCOVERY_SCORING_VERSION,
      taxonomy_version: DISCOVERY_TAXONOMY_VERSION,
      source_hash: profile.source_hash,
    });

    const slug = await generateUniquePhenomenonSlug(`${place.name} ${season} jelenseg`);
    const title = `${place.name} jelenseg (draft)`;

    const phenomenon = await createPhenomenon({
      slug,
      title,
      season,
      place_id: place.id,
      region_id: place.leaflet_region_id ?? null,
      phenomenon_type: top.phenomenon_type,
      typical_start_mmdd: top.typical_start_mmdd,
      typical_end_mmdd: top.typical_end_mmdd,
      discovery_draft_id: discoveryDraft.id,
      origin: "place_discovery_v1",
      generation_input: typeof body?.generation_input === "string" ? body.generation_input : null,
    });

    return NextResponse.json({ data: { phenomenon } }, { status: 201 });
  }

  if (!regionId) {
    return NextResponse.json({ error: "region_id is required for legacy SPA create." }, { status: 400 });
  }

  if (season !== "spring" && season !== "autumn") {
    return NextResponse.json({ error: "legacy SPA requires spring or autumn season." }, { status: 400 });
  }

  const { data: region, error: regionError } = await supabaseServerClient
    .from("distribution_region_catalog_items")
    .select("catalog,scope,type,name")
    .eq("region_id", regionId)
    .maybeSingle();

  if (regionError) {
    return NextResponse.json({ error: "Unable to validate region_id." }, { status: 500 });
  }

  const row = (region ?? {}) as Record<string, unknown>;
  const catalog = String(row.catalog ?? "");
  const scope = String(row.scope ?? "");
  const type = String(row.type ?? "");
  const name = String(row.name ?? "");
  const isHungarySpa = catalog === "hungaryRegions" && scope === "hungary" && type === "spa";
  const isExtendedSpa =
    catalog === "hungaryExtendedRegions" && scope === "hungary_extended" && type === "spa";

  if (!isHungarySpa && !isExtendedSpa) {
    return NextResponse.json(
      { error: "region_id must reference a HU Natura 2000 SPA or a Hungary-extended SPA catalog item." },
      { status: 400 }
    );
  }

  const seasonLabel = season === "spring" ? "Tavaszi" : "Oszi";
  const title = `${seasonLabel} vonulasi csucs - ${name || regionId}`;
  const slug = await generateUniquePhenomenonSlug(`${name || regionId} ${season} vonulasi csucs`);

  const phenomenon = await createPhenomenon({
    slug,
    title,
    season,
    region_id: regionId,
    phenomenon_type: "migration_peak",
    origin: "legacy_spa",
    generation_input: typeof body?.generation_input === "string" ? body.generation_input : null,
  });

  return NextResponse.json({ data: { phenomenon } }, { status: 201 });
}
