import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getAdminUserFromCookies } from "@/lib/auth";
import { createPlace, deletePlaceById, updatePlace } from "@/lib/placeService";
import { generateUniquePlaceSlug } from "@/lib/slug";
import { generatePlaceUiVariantsV1 } from "@/lib/placeGeneration";
import { createPlaceUiVariantsBlock } from "@/lib/placeContentService";
import { AIJsonParseError, AISchemaMismatchError } from "@/lib/aiUtils";
import { AI_MODEL_TEXT } from "@/lib/aiConfig";
import { PLACE_TYPE_VALUES, type PlaceType } from "@/types/place";

export async function POST(request: Request) {
  const user = await getAdminUserFromCookies();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const placeType = typeof body?.place_type === "string" ? body.place_type.trim() : "";
  const regionLandscape =
    typeof body?.region_landscape === "string" ? body.region_landscape.trim() : "";
  const county = typeof body?.county === "string" ? body.county.trim() : "";
  const nearestCity =
    typeof body?.nearest_city === "string" ? body.nearest_city.trim() : "";
  const adminDescription =
    typeof body?.generation_input === "string" ? body.generation_input.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }

  if (!placeType) {
    return NextResponse.json({ error: "place_type is required." }, { status: 400 });
  }

  if (!PLACE_TYPE_VALUES.includes(placeType as PlaceType)) {
    return NextResponse.json(
      { error: `place_type must be one of: ${PLACE_TYPE_VALUES.join(", ")}` },
      { status: 400 }
    );
  }

  let slug: string;
  try {
    slug = await generateUniquePlaceSlug(name);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate slug for that name.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const place = await createPlace({
    slug,
    name,
    place_type: placeType as PlaceType,
    region_landscape: regionLandscape || null,
    county: county || null,
    nearest_city: nearestCity || null,
    generation_input: adminDescription || null,
  });

  const cleanupPlace = async () => {
    try {
      await deletePlaceById(place.id);
    } catch (cleanupError) {
      console.error("Failed to delete place after generation failure", cleanupError);
    }
  };

  try {
    const generationResult = await generatePlaceUiVariantsV1({
      place_name: place.name,
      place_type: place.place_type,
      region_landscape: place.region_landscape,
      county: place.county,
      nearest_city: place.nearest_city,
      admin_description: place.generation_input,
      location_precision: place.location_precision,
      sensitivity_level: place.sensitivity_level,
      existing_payload: null,
      review_note: null,
    });

    const generationMeta = {
      model: generationResult.model,
      prompt_hash: generationResult.prompt_hash,
      generated_at: new Date().toISOString(),
    };

    const contentBlock = await createPlaceUiVariantsBlock({
      place_id: place.id,
      payload: generationResult.payload,
      generation_meta: generationMeta,
      review_status: "draft",
    });

    const updatedPlace = await updatePlace({
      id: place.id,
      region_landscape: regionLandscape || null,
      county: county || null,
      nearest_city: nearestCity || null,
      generation_input: adminDescription || null,
    });

    return NextResponse.json(
      { data: { place: updatedPlace, content_block: contentBlock, generation_meta: generationMeta } },
      { status: 201 }
    );
  } catch (error) {
    await cleanupPlace();

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Place payload validation failed", model: AI_MODEL_TEXT, issues: error.issues },
        { status: 422 }
      );
    }

    if (error instanceof AIJsonParseError) {
      const debugAI = process.env.DEBUG_AI === "true";
      const payload: Record<string, unknown> = {
        error: error.message,
        error_code: "AI_JSON_PARSE_FAILED",
        model: error.model,
        request_id: error.requestId,
        reason: error.reason,
        finish_reason: error.finishReason ?? "unknown",
      };
      if (debugAI) {
        payload.raw_head = error.rawHead;
        payload.raw_tail = error.rawTail;
      }
      return NextResponse.json(payload, { status: 502 });
    }

    if (error instanceof AISchemaMismatchError) {
      const debugAI = process.env.DEBUG_AI === "true";
      const payload: Record<string, unknown> = {
        error: error.message,
        error_code: error.errorCode,
        issues: error.issues,
        model: AI_MODEL_TEXT,
      };
      if (debugAI) {
        payload.raw_json = error.rawJson;
      }
      return NextResponse.json(payload, { status: 502 });
    }

    return NextResponse.json(
      { error: (error as Error)?.message ?? "Unable to generate place content." },
      { status: 502 }
    );
  }
}
