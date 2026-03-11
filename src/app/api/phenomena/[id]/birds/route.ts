import { NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { getPhenomenonById } from "@/lib/phenomenonService";
import { supabaseServerClient } from "@/lib/supabaseServerClient";
import {
  createPhenomenonBirdLink,
  deletePhenomenonBirdLink,
  updatePhenomenonBirdLink,
} from "@/lib/phenomenonBirdService";
import {
  PHENOMENON_BIRD_REVIEW_STATUS_VALUES,
  type PhenomenonBirdReviewStatus,
} from "@/types/phenomenon";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getAdminUserFromCookies();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const phenomenon = await getPhenomenonById(id);
  if (!phenomenon) return NextResponse.json({ error: "Phenomenon not found." }, { status: 404 });

  const { data: links, error } = await supabaseServerClient
    .from("phenomenon_birds")
    .select("id,phenomenon_id,bird_id,pending_bird_name_hu,review_status,rank,created_at,updated_at,bird:birds(id,slug,name_hu)")
    .eq("phenomenon_id", phenomenon.id)
    .order("rank", { ascending: true })
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return NextResponse.json({ data: { phenomenon, links } });
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getAdminUserFromCookies();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const phenomenon = await getPhenomenonById(id);
  if (!phenomenon) return NextResponse.json({ error: "Phenomenon not found." }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const reviewStatusRaw = typeof body?.review_status === "string" ? body.review_status : "";
  const reviewStatus = PHENOMENON_BIRD_REVIEW_STATUS_VALUES.includes(reviewStatusRaw as PhenomenonBirdReviewStatus)
    ? (reviewStatusRaw as PhenomenonBirdReviewStatus)
    : undefined;

  const link = await createPhenomenonBirdLink({
    phenomenon_id: phenomenon.id,
    bird_id: typeof body?.bird_id === "string" ? body.bird_id : null,
    pending_bird_name_hu: typeof body?.pending_bird_name_hu === "string" ? body.pending_bird_name_hu : null,
    review_status: reviewStatus,
    rank: typeof body?.rank === "number" ? body.rank : 0,
  });

  return NextResponse.json({ data: { phenomenon, link } }, { status: 201 });
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getAdminUserFromCookies();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const phenomenon = await getPhenomenonById(id);
  if (!phenomenon) return NextResponse.json({ error: "Phenomenon not found." }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const linkId = typeof body?.id === "string" ? body.id : "";
  if (!linkId) return NextResponse.json({ error: "id is required." }, { status: 400 });

  const reviewStatusRaw = typeof body?.review_status === "string" ? body.review_status : "";
  const reviewStatus = PHENOMENON_BIRD_REVIEW_STATUS_VALUES.includes(reviewStatusRaw as PhenomenonBirdReviewStatus)
    ? (reviewStatusRaw as PhenomenonBirdReviewStatus)
    : undefined;

  const link = await updatePhenomenonBirdLink({
    id: linkId,
    review_status: reviewStatus,
    rank: typeof body?.rank === "number" ? body.rank : undefined,
    bird_id: typeof body?.bird_id === "string" ? body.bird_id : body?.bird_id === null ? null : undefined,
    pending_bird_name_hu:
      typeof body?.pending_bird_name_hu === "string"
        ? body.pending_bird_name_hu
        : body?.pending_bird_name_hu === null
          ? null
          : undefined,
  });

  return NextResponse.json({ data: { phenomenon, link } });
}

export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getAdminUserFromCookies();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const phenomenon = await getPhenomenonById(id);
  if (!phenomenon) return NextResponse.json({ error: "Phenomenon not found." }, { status: 404 });

  const url = new URL(request.url);
  const linkId = url.searchParams.get("id")?.trim() ?? "";
  if (!linkId) return NextResponse.json({ error: "id query param is required." }, { status: 400 });

  await deletePhenomenonBirdLink(linkId);
  return NextResponse.json({ data: { phenomenon_id: phenomenon.id, deleted: true } });
}

