import { NextResponse } from "next/server";
import { supabaseServerClient } from "@/lib/supabaseServerClient";
import { getPlaceBySlug } from "@/lib/placeService";
import { getLatestApprovedContentBlockForPlace } from "@/lib/placeContentService";
import { placeUiVariantsSchemaV1 } from "@/lib/placeContentSchema";

export async function GET(_request: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const place = await getPlaceBySlug(slug);

  if (!place || place.status !== "published") {
    return NextResponse.json({ error: "Place not found." }, { status: 404 });
  }

  const contentBlock = await getLatestApprovedContentBlockForPlace(place.id);
  if (!contentBlock || contentBlock.review_status !== "approved" || !contentBlock.blocks_json) {
    return NextResponse.json({ error: "Place content is not available." }, { status: 404 });
  }

  const parsedContent = placeUiVariantsSchemaV1.safeParse(contentBlock.blocks_json);
  if (!parsedContent.success) {
    console.error("Invalid published place content payload", {
      place_id: place.id,
      block_id: contentBlock.id,
      issues: parsedContent.error.issues,
    });
    return NextResponse.json({ error: "Place content is not available." }, { status: 404 });
  }

  const { data: birdLinks, error } = await supabaseServerClient
    .from("place_birds")
    .select(
      "id,place_id,bird_id,pending_bird_name_hu,review_status,rank,frequency_band,is_iconic,visible_in_spring,visible_in_summer,visible_in_autumn,visible_in_winter,seasonality_note,bird:birds(id,slug,name_hu)"
    )
    .eq("place_id", place.id)
    .eq("review_status", "approved")
    .order("rank", { ascending: true });

  if (error) {
    throw error;
  }

  return NextResponse.json({
    data: {
      place: {
        id: place.id,
        slug: place.slug,
        name: place.name,
        place_type: place.place_type,
        region_landscape: place.region_landscape,
        county: place.county,
        district: place.district,
        nearest_city: place.nearest_city,
        distance_from_nearest_city_km: place.distance_from_nearest_city_km,
        settlement: place.settlement,
        location_precision: place.location_precision,
        sensitivity_level: place.sensitivity_level,
        is_beginner_friendly: place.is_beginner_friendly,
        access_note: place.access_note,
        parking_note: place.parking_note,
        best_visit_note: place.best_visit_note,
        notable_units_json: place.notable_units_json,
      },
      content: parsedContent.data,
      place_birds: birdLinks ?? [],
    },
  });
}
