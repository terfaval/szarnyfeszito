import { NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { getPlaceById, updatePlace } from "@/lib/placeService";
import { generatePlaceNotableUnitsV1 } from "@/lib/placeNotableUnitsGeneration";
import { AIJsonParseError, AISchemaMismatchError } from "@/lib/aiUtils";
import { AI_MODEL_TEXT } from "@/lib/aiConfig";

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
  const reviewNote = typeof body?.review_note === "string" ? body.review_note.trim() : null;

  try {
    const result = await generatePlaceNotableUnitsV1({
      place_name: place.name,
      place_type: place.place_type,
      region_landscape: place.region_landscape,
      county: place.county,
      nearest_city: place.nearest_city,
      admin_description: place.generation_input,
      location_precision: place.location_precision,
      sensitivity_level: place.sensitivity_level,
      existing_units: place.notable_units_json,
      review_note: reviewNote,
    });

    const updated = await updatePlace({
      id: place.id,
      notable_units_json: result.notable_units,
    });

    return NextResponse.json({
      data: {
        place: updated,
        generation_meta: {
          model: result.model,
          request_id: result.request_id,
          finish_reason: result.finish_reason,
          prompt_hash: result.prompt_hash,
          generated_at: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
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
      { error: (error as Error)?.message ?? "Unable to generate notable units." },
      { status: 502 }
    );
  }
}

