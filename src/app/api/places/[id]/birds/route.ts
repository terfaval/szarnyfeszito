import { NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { getPlaceById } from "@/lib/placeService";
import { supabaseServerClient } from "@/lib/supabaseServerClient";
import {
  createPlaceBirdLink,
  deletePlaceBirdLink,
  updatePlaceBirdLink,
} from "@/lib/placeBirdService";
import { PLACE_BIRD_REVIEW_STATUS_VALUES, type PlaceBirdReviewStatus } from "@/types/place";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getAdminUserFromCookies();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const place = await getPlaceById(id);
  if (!place) return NextResponse.json({ error: "Place not found." }, { status: 404 });

  const { data: links, error } = await supabaseServerClient
    .from("place_birds")
    .select(
      "id,place_id,bird_id,pending_bird_name_hu,review_status,rank,frequency_band,is_iconic,visible_in_spring,visible_in_summer,visible_in_autumn,visible_in_winter,seasonality_note,created_at,updated_at,bird:birds(id,slug,name_hu)"
    )
    .eq("place_id", place.id)
    .order("rank", { ascending: true })
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return NextResponse.json({ data: { place, links } });
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getAdminUserFromCookies();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const place = await getPlaceById(id);
  if (!place) return NextResponse.json({ error: "Place not found." }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const reviewStatusRaw = typeof body?.review_status === "string" ? body.review_status : "";
  const reviewStatus = PLACE_BIRD_REVIEW_STATUS_VALUES.includes(reviewStatusRaw as PlaceBirdReviewStatus)
    ? (reviewStatusRaw as PlaceBirdReviewStatus)
    : undefined;
  const link = await createPlaceBirdLink({
    place_id: place.id,
    bird_id: typeof body?.bird_id === "string" ? body.bird_id : null,
    pending_bird_name_hu: typeof body?.pending_bird_name_hu === "string" ? body.pending_bird_name_hu : null,
    review_status: reviewStatus,
    rank: typeof body?.rank === "number" ? body.rank : 0,
    frequency_band: typeof body?.frequency_band === "string" ? body.frequency_band : undefined,
    is_iconic: typeof body?.is_iconic === "boolean" ? body.is_iconic : undefined,
    visible_in_spring: typeof body?.visible_in_spring === "boolean" ? body.visible_in_spring : undefined,
    visible_in_summer: typeof body?.visible_in_summer === "boolean" ? body.visible_in_summer : undefined,
    visible_in_autumn: typeof body?.visible_in_autumn === "boolean" ? body.visible_in_autumn : undefined,
    visible_in_winter: typeof body?.visible_in_winter === "boolean" ? body.visible_in_winter : undefined,
    seasonality_note: typeof body?.seasonality_note === "string" ? body.seasonality_note : null,
  });

  return NextResponse.json({ data: { place, link } }, { status: 201 });
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getAdminUserFromCookies();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const place = await getPlaceById(id);
  if (!place) return NextResponse.json({ error: "Place not found." }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const linkId = typeof body?.id === "string" ? body.id : "";
  if (!linkId) return NextResponse.json({ error: "id is required." }, { status: 400 });

  const reviewStatusRaw = typeof body?.review_status === "string" ? body.review_status : "";
  const reviewStatus = PLACE_BIRD_REVIEW_STATUS_VALUES.includes(reviewStatusRaw as PlaceBirdReviewStatus)
    ? (reviewStatusRaw as PlaceBirdReviewStatus)
    : undefined;

  const link = await updatePlaceBirdLink({
    id: linkId,
    review_status: reviewStatus,
    rank: typeof body?.rank === "number" ? body.rank : undefined,
    frequency_band: typeof body?.frequency_band === "string" ? body.frequency_band : undefined,
    is_iconic: typeof body?.is_iconic === "boolean" ? body.is_iconic : undefined,
    visible_in_spring: typeof body?.visible_in_spring === "boolean" ? body.visible_in_spring : undefined,
    visible_in_summer: typeof body?.visible_in_summer === "boolean" ? body.visible_in_summer : undefined,
    visible_in_autumn: typeof body?.visible_in_autumn === "boolean" ? body.visible_in_autumn : undefined,
    visible_in_winter: typeof body?.visible_in_winter === "boolean" ? body.visible_in_winter : undefined,
    seasonality_note:
      typeof body?.seasonality_note === "string" ? body.seasonality_note : body?.seasonality_note === null ? null : undefined,
    bird_id: typeof body?.bird_id === "string" ? body.bird_id : body?.bird_id === null ? null : undefined,
    pending_bird_name_hu:
      typeof body?.pending_bird_name_hu === "string" ? body.pending_bird_name_hu : body?.pending_bird_name_hu === null ? null : undefined,
  });

  return NextResponse.json({ data: { place, link } });
}

export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getAdminUserFromCookies();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const place = await getPlaceById(id);
  if (!place) return NextResponse.json({ error: "Place not found." }, { status: 404 });

  const url = new URL(request.url);
  const linkId = url.searchParams.get("id")?.trim() ?? "";
  if (!linkId) return NextResponse.json({ error: "id query param is required." }, { status: 400 });

  await deletePlaceBirdLink(linkId);
  return NextResponse.json({ data: { place_id: place.id, deleted: true } });
}
