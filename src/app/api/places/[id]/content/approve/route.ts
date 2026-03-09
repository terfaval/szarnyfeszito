import { NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { getPlaceById, updatePlace } from "@/lib/placeService";
import { getLatestContentBlockForPlace, updatePlaceContentBlockMeta } from "@/lib/placeContentService";

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getAdminUserFromCookies();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const place = await getPlaceById(id);
  if (!place) {
    return NextResponse.json({ error: "Place not found." }, { status: 404 });
  }

  const block = await getLatestContentBlockForPlace(place.id);
  if (!block) {
    return NextResponse.json({ error: "No generated content block found for this place." }, { status: 404 });
  }

  const updatedBlock = await updatePlaceContentBlockMeta({
    block_id: block.id,
    review_status: "approved",
  });

  const updatedPlace = await updatePlace({
    id: place.id,
    status: place.status === "published" ? "published" : "reviewed",
  });

  return NextResponse.json({ data: { place: updatedPlace, content_block: updatedBlock } });
}

