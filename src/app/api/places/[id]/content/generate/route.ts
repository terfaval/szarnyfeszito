import { NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { getPlaceById } from "@/lib/placeService";
import {
  getLatestContentBlockForPlace,
  createPlaceUiVariantsBlock,
} from "@/lib/placeContentService";
import { generatePlaceUiVariantsV1 } from "@/lib/placeGeneration";
import { AIJsonParseError, AISchemaMismatchError } from "@/lib/aiUtils";
import { AI_MODEL_TEXT } from "@/lib/aiConfig";

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

  const existingBlock = await getLatestContentBlockForPlace(place.id);
  const existingPayload = existingBlock?.blocks_json ?? null;
  const reviewNote = existingBlock?.generation_meta?.review_comment ?? null;

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
      existing_payload: existingPayload as any,
      review_note: reviewNote,
    });

    const generationMeta = {
      model: generationResult.model,
      prompt_hash: generationResult.prompt_hash,
      generated_at: new Date().toISOString(),
      review_comment: existingBlock?.generation_meta?.review_comment,
      review_requested_at: existingBlock?.generation_meta?.review_requested_at,
    };

    const updatedBlock = await createPlaceUiVariantsBlock({
      place_id: place.id,
      payload: generationResult.payload,
      generation_meta: generationMeta,
      review_status: "draft",
    });

    return NextResponse.json({
      data: { place, content_block: updatedBlock, generation_meta: generationMeta },
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
      { error: (error as Error)?.message ?? "Unable to generate place content." },
      { status: 502 }
    );
  }
}
