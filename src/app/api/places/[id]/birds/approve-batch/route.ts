import { NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { getPlaceById } from "@/lib/placeService";
import { approveSuggestedLinkedBirdsForPlace } from "@/lib/placeBirdService";

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getAdminUserFromCookies();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const place = await getPlaceById(id);
  if (!place) return NextResponse.json({ error: "Place not found." }, { status: 404 });

  const result = await approveSuggestedLinkedBirdsForPlace(place.id);
  return NextResponse.json({ data: { place_id: place.id, ...result } });
}

