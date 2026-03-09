import { NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { getPlaceById } from "@/lib/placeService";
import { getLatestContentBlockForPlace, updatePlaceContentBlockMeta } from "@/lib/placeContentService";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getAdminUserFromCookies();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const place = await getPlaceById(id);
  if (!place) {
    return NextResponse.json({ error: "Place not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const note = typeof body?.review_comment === "string" ? body.review_comment.trim() : "";
  if (!note) {
    return NextResponse.json({ error: "review_comment is required." }, { status: 400 });
  }

  const block = await getLatestContentBlockForPlace(place.id);
  if (!block) {
    return NextResponse.json({ error: "No generated content block found for this place." }, { status: 404 });
  }

  const existingMeta = block.generation_meta;
  if (!existingMeta) {
    return NextResponse.json({ error: "Missing generation metadata for this place." }, { status: 409 });
  }

  const updatedMeta = {
    ...existingMeta,
    review_comment: note,
    review_requested_at: new Date().toISOString(),
  };

  const updatedBlock = await updatePlaceContentBlockMeta({
    block_id: block.id,
    review_status: "reviewed",
    generation_meta: updatedMeta,
  });

  return NextResponse.json({ data: { place, content_block: updatedBlock } });
}

