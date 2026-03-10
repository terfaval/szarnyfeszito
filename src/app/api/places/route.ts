import { NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { listPlaces } from "@/lib/placeService";

export async function GET(request: Request) {
  const user = await getAdminUserFromCookies();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const search = url.searchParams.get("search") ?? undefined;

  const places = await listPlaces({ search });

  const data = places.slice(0, 40).map((place) => ({
    id: place.id,
    slug: place.slug,
    name: place.name,
    place_type: place.place_type,
    status: place.status,
    county: place.county,
    nearest_city: place.nearest_city,
  }));

  return NextResponse.json({ data });
}

