import { NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { getPlaceBirdLinkSummaries } from "@/lib/placeBirdService";

export async function POST(request: Request) {
  const user = await getAdminUserFromCookies();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const placeIdsRaw = Array.isArray(body?.place_ids) ? body.place_ids : [];
  const placeIds = placeIdsRaw
    .filter((id: unknown) => typeof id === "string")
    .map((id: string) => id.trim())
    .filter(Boolean);

  if (placeIds.length === 0) {
    return NextResponse.json({ error: "place_ids is required." }, { status: 400 });
  }

  const data = await getPlaceBirdLinkSummaries(placeIds);
  return NextResponse.json({ data });
}

