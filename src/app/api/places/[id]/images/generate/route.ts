import { NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { getPlaceById } from "@/lib/placeService";
import { generateHeroImageForPlace } from "@/lib/imageService";

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
  const forceRegenerate = body?.force_regenerate === true;

  try {
    const result = await generateHeroImageForPlace(place, {
      forceRegenerate,
    });

    return NextResponse.json({
      ok: true,
      place_id: place.id,
      required_success: result.required_success,
      results: result.results,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message ?? "Unable to generate place hero image." },
      { status: 400 }
    );
  }
}

