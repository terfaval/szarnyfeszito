import { NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { listPhenomena } from "@/lib/phenomenonService";
import { createPhenomenon, generateUniquePhenomenonSlug } from "@/lib/phenomenonService";
import { supabaseServerClient } from "@/lib/supabaseServerClient";
import { PHENOMENON_SEASON_VALUES, type PhenomenonSeason } from "@/types/phenomenon";

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
  const seasonRaw = asString(body?.season);
  const season = PHENOMENON_SEASON_VALUES.includes(seasonRaw as PhenomenonSeason)
    ? (seasonRaw as PhenomenonSeason)
    : null;

  if (!regionId) {
    return NextResponse.json({ error: "region_id is required." }, { status: 400 });
  }

  if (!season) {
    return NextResponse.json({ error: `season must be one of: ${PHENOMENON_SEASON_VALUES.join(", ")}` }, { status: 400 });
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
  const ok = catalog === "hungaryRegions" && scope === "hungary" && type === "spa";

  if (!ok) {
    return NextResponse.json({ error: "region_id must reference a HU Natura 2000 SPA catalog item." }, { status: 400 });
  }

  const seasonLabel = season === "spring" ? "Tavaszi" : "Őszi";
  const title = `${seasonLabel} vonulási csúcs – ${name || regionId}`;
  const slug = await generateUniquePhenomenonSlug(`${name || regionId} ${season} vonulasi csucs`);

  const phenomenon = await createPhenomenon({
    slug,
    title,
    season,
    region_id: regionId,
    phenomenon_type: "migration_peak",
    generation_input: typeof body?.generation_input === "string" ? body.generation_input : null,
  });

  return NextResponse.json({ data: { phenomenon } }, { status: 201 });
}
