import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getAdminUserFromCookies } from "@/lib/auth";
import { createPlace, deletePlaceById, updatePlace } from "@/lib/placeService";
import { generateUniquePlaceSlug } from "@/lib/slug";
import { generatePlaceDraftFromNameV1 } from "@/lib/placeGeneration";
import { createPlaceUiVariantsBlock } from "@/lib/placeContentService";
import { AIJsonParseError, AISchemaMismatchError } from "@/lib/aiUtils";
import { AI_MODEL_TEXT } from "@/lib/aiConfig";

export async function POST(request: Request) {
  const user = await getAdminUserFromCookies();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));

  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }

  let slug: string;
  try {
    slug = await generateUniquePlaceSlug(name);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate slug for that name.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  let place: Awaited<ReturnType<typeof createPlace>> | null = null;

  const cleanupPlace = async () => {
    try {
      if (place) {
        await deletePlaceById(place.id);
      }
    } catch (cleanupError) {
      console.error("Failed to delete place after generation failure", cleanupError);
    }
  };

  try {
    const draftResult = await generatePlaceDraftFromNameV1({ place_name: name });
    const placeMeta = draftResult.payload.place;
    const placeTypes = Array.from(
      new Set([placeMeta.place_type_primary, ...(placeMeta.place_types ?? [])])
    );

    place = await createPlace({
      slug,
      name,
      place_type: placeMeta.place_type_primary,
      place_types: placeTypes,
      region_landscape: placeMeta.region_landscape,
      county: placeMeta.county,
      district: placeMeta.district,
      nearest_city: placeMeta.nearest_city,
      distance_from_nearest_city_km: placeMeta.distance_from_nearest_city_km,
      settlement: placeMeta.settlement,
      generation_input: placeMeta.generation_input,
    });

    // Apply ethics + practical notes (kept separate from core create payload).
    place = await updatePlace({
      id: place.id,
      location_precision: placeMeta.location_precision,
      sensitivity_level: placeMeta.sensitivity_level,
      is_beginner_friendly: placeMeta.is_beginner_friendly,
      access_note: placeMeta.access_note,
      parking_note: placeMeta.parking_note,
      best_visit_note: placeMeta.best_visit_note,
    });

    const generationMeta = {
      model: draftResult.model,
      prompt_hash: draftResult.prompt_hash,
      generated_at: new Date().toISOString(),
    };

    const contentBlock = await createPlaceUiVariantsBlock({
      place_id: place!.id,
      payload: draftResult.payload.content,
      generation_meta: generationMeta,
      review_status: "draft",
    });

    return NextResponse.json(
      { data: { place, content_block: contentBlock, generation_meta: generationMeta } },
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
