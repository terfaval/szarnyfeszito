import { NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { getPhenomenonById, updatePhenomenon, deletePhenomenonById } from "@/lib/phenomenonService";
import { getLatestApprovedContentBlockForPhenomenon } from "@/lib/phenomenonContentService";
import {
  PHENOMENON_SEASON_VALUES,
  PHENOMENON_STATUS_VALUES,
  type PhenomenonSeason,
  type PhenomenonStatus,
} from "@/types/phenomenon";
import { listApprovedPublishedBirdLinksForPhenomenon } from "@/lib/phenomenonBirdService";
import { supabaseServerClient } from "@/lib/supabaseServerClient";

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isMmdd(value: string) {
  return /^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/.test(value);
}

async function validateSpaRegionId(regionId: string): Promise<{ ok: boolean; error?: string }> {
  const id = regionId.trim();
  if (!id) return { ok: false, error: "region_id is required." };

  const { data, error } = await supabaseServerClient
    .from("distribution_region_catalog_items")
    .select("catalog,scope,type")
    .eq("region_id", id)
    .maybeSingle();

  if (error) {
    return { ok: false, error: "Unable to validate region_id." };
  }

  const row = (data ?? {}) as Record<string, unknown>;
  const catalog = String(row.catalog ?? "");
  const scope = String(row.scope ?? "");
  const type = String(row.type ?? "");
  const ok = catalog === "hungaryRegions" && scope === "hungary" && type === "spa";

  return ok ? { ok: true } : { ok: false, error: "region_id must reference a HU Natura 2000 SPA catalog item." };
}

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getAdminUserFromCookies();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const phenomenon = await getPhenomenonById(id);
  if (!phenomenon) return NextResponse.json({ error: "Phenomenon not found." }, { status: 404 });

  return NextResponse.json({ data: { phenomenon } });
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getAdminUserFromCookies();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const existing = await getPhenomenonById(id);
  if (!existing) return NextResponse.json({ error: "Phenomenon not found." }, { status: 404 });

  const body = await request.json().catch(() => ({}));

  const requestedStatusRaw = asString(body?.status);
  const requestedStatus = requestedStatusRaw || undefined;

  const requestedSeasonRaw = asString(body?.season);
  const requestedSeason = requestedSeasonRaw || undefined;

  if (requestedStatus && !PHENOMENON_STATUS_VALUES.includes(requestedStatus as PhenomenonStatus)) {
    return NextResponse.json(
      { error: `status must be one of: ${PHENOMENON_STATUS_VALUES.join(", ")}` },
      { status: 400 }
    );
  }

  if (requestedSeason && !PHENOMENON_SEASON_VALUES.includes(requestedSeason as PhenomenonSeason)) {
    return NextResponse.json(
      { error: `season must be one of: ${PHENOMENON_SEASON_VALUES.join(", ")}` },
      { status: 400 }
    );
  }

  const requestedRegionId = typeof body?.region_id === "string" ? body.region_id.trim() : undefined;
  if (requestedRegionId) {
    const validation = await validateSpaRegionId(requestedRegionId);
    if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  if (existing.status === "published" && requestedStatus && requestedStatus !== "published") {
    return NextResponse.json(
      { error: "Published phenomena cannot be moved back to an earlier status." },
      { status: 400 }
    );
  }

  if (requestedStatus === "published") {
    const missing: string[] = [];

    const title = asString(body?.title || existing.title);
    const slug = asString(body?.slug || existing.slug);
    const regionId = asString(body?.region_id || existing.region_id);
    const season = asString(body?.season || existing.season);
    const start = asString(
      Object.prototype.hasOwnProperty.call(body ?? {}, "typical_start_mmdd")
        ? body?.typical_start_mmdd
        : existing.typical_start_mmdd
    );
    const end = asString(
      Object.prototype.hasOwnProperty.call(body ?? {}, "typical_end_mmdd")
        ? body?.typical_end_mmdd
        : existing.typical_end_mmdd
    );

    if (!title) missing.push("title");
    if (!slug) missing.push("slug");
    if (!regionId) missing.push("region_id");
    if (!season) missing.push("season");
    if (!start || !isMmdd(start)) missing.push("typical_start_mmdd");
    if (!end || !isMmdd(end)) missing.push("typical_end_mmdd");

    const regionValidation = await validateSpaRegionId(regionId);
    if (!regionValidation.ok) missing.push("region_id_valid_spa");

    const latestContent = await getLatestApprovedContentBlockForPhenomenon(existing.id);
    if (!latestContent || latestContent.review_status !== "approved") {
      missing.push("approved_content_blocks");
    } else {
      const variants = latestContent.blocks_json?.variants ?? null;
      if (!variants) {
        missing.push("content.short");
        missing.push("content.long");
        missing.push("content.ethics_tip");
      } else {
        if (!asString(variants.short)) missing.push("content.short");
        if (!asString(variants.long)) missing.push("content.long");
        if (!asString(variants.ethics_tip)) missing.push("content.ethics_tip");
      }
    }

    const approvedBirds = await listApprovedPublishedBirdLinksForPhenomenon(existing.id);
    if (approvedBirds.length < 1) {
      missing.push("approved_bird_links");
    }

    if (missing.length > 0) {
      return NextResponse.json({ error: "Phenomenon is not publish-ready.", missing }, { status: 409 });
    }
  }

  const updated = await updatePhenomenon({
    id: existing.id,
    slug: typeof body?.slug === "string" ? body.slug : undefined,
    title: typeof body?.title === "string" ? body.title : undefined,
    season: requestedSeason ? (requestedSeason as PhenomenonSeason) : undefined,
    region_id: requestedRegionId ? requestedRegionId : undefined,
    typical_start_mmdd:
      typeof body?.typical_start_mmdd === "string"
        ? body.typical_start_mmdd
        : body?.typical_start_mmdd === null
          ? null
          : undefined,
    typical_end_mmdd:
      typeof body?.typical_end_mmdd === "string"
        ? body.typical_end_mmdd
        : body?.typical_end_mmdd === null
          ? null
          : undefined,
    status: requestedStatus ? (requestedStatus as PhenomenonStatus) : undefined,
    generation_input:
      typeof body?.generation_input === "string"
        ? body.generation_input
        : body?.generation_input === null
          ? null
          : undefined,
    published_at: requestedStatus === "published" ? new Date().toISOString() : undefined,
  });

  return NextResponse.json({ data: { phenomenon: updated } });
}

export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getAdminUserFromCookies();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const phenomenon = await getPhenomenonById(id);
  if (!phenomenon) return NextResponse.json({ error: "Phenomenon not found." }, { status: 404 });

  if (phenomenon.status === "published") {
    return NextResponse.json({ error: "Published phenomena cannot be deleted." }, { status: 400 });
  }

  const url = new URL(request.url);
  const confirm = url.searchParams.get("confirm")?.trim() ?? "";
  if (confirm !== "true") {
    return NextResponse.json({ error: "confirm=true query param is required." }, { status: 400 });
  }

  await deletePhenomenonById(phenomenon.id);
  return NextResponse.json({ data: { phenomenon_id: phenomenon.id, deleted: true } });
}
