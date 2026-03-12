import { NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { supabaseServerClient } from "@/lib/supabaseServerClient";
import { createPhenomenon, generateUniquePhenomenonSlug } from "@/lib/phenomenonService";

type SpaRegionRow = { region_id: string; name: string };

export async function POST(request: Request) {
  const user = await getAdminUserFromCookies();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const limit = typeof body?.limit === "number" && Number.isFinite(body.limit) ? Math.max(1, Math.min(500, body.limit)) : 200;
  const dryRun = body?.dry_run === true;

  const { data: spaRows, error: spaError } = await supabaseServerClient
    .from("distribution_region_catalog_items")
    .select("region_id,name")
    .in("catalog", ["hungaryRegions", "hungaryExtendedRegions"])
    .in("scope", ["hungary", "hungary_extended"])
    .eq("type", "spa")
    .order("name", { ascending: true })
    .limit(limit);

  if (spaError) {
    return NextResponse.json({ error: "Unable to list SPA catalog entries." }, { status: 500 });
  }

  const spas = (spaRows ?? []) as Array<Partial<SpaRegionRow>>;
  const spaMetas = spas
    .map((row) => ({ region_id: String(row.region_id ?? "").trim(), name: String(row.name ?? "").trim() }))
    .filter((row) => row.region_id && row.name);

  const regionIds = spaMetas.map((row) => row.region_id);
  if (regionIds.length === 0) {
    return NextResponse.json({ data: { checked_count: 0, existing_count: 0, created_count: 0, created: [] } });
  }

  const { data: existingRows, error: existingError } = await supabaseServerClient
    .from("phenomena")
    .select("region_id")
    .eq("phenomenon_type", "migration_peak")
    .eq("season", "autumn")
    .in("region_id", regionIds);

  if (existingError) {
    return NextResponse.json({ error: "Unable to check existing phenomena." }, { status: 500 });
  }

  const existingRegionIds = new Set(
    (existingRows ?? [])
      .map((row) => String((row as Record<string, unknown>).region_id ?? "").trim())
      .filter(Boolean)
  );
  const missing = spaMetas.filter((row) => !existingRegionIds.has(row.region_id));

  if (dryRun) {
    return NextResponse.json({
      data: {
        checked_count: spaMetas.length,
        existing_count: existingRegionIds.size,
        created_count: missing.length,
        created: missing.map((row) => ({
          season: "autumn",
          phenomenon_type: "migration_peak",
          region_id: row.region_id,
          title: `Őszi vonulási csúcs – ${row.name}`,
        })),
        dry_run: true,
      },
    });
  }

  const created: Array<{ id: string; region_id: string; slug: string; title: string }> = [];

  for (const row of missing) {
    const title = `Őszi vonulási csúcs – ${row.name}`;
    const slug = await generateUniquePhenomenonSlug(`${row.name} oszi vonulasi csucs`);
    const phenomenon = await createPhenomenon({
      slug,
      title,
      season: "autumn",
      region_id: row.region_id,
      phenomenon_type: "migration_peak",
    });
    created.push({ id: phenomenon.id, region_id: phenomenon.region_id, slug: phenomenon.slug, title: phenomenon.title });
  }

  return NextResponse.json({
    data: {
      checked_count: spaMetas.length,
      existing_count: existingRegionIds.size,
      created_count: created.length,
      created,
      dry_run: false,
    },
  });
}
