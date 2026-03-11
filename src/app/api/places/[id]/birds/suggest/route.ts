import { NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { getPlaceById } from "@/lib/placeService";
import { suggestPlaceBirdLinksV1 } from "@/lib/placeBirdSuggestion";
import { AIJsonParseError, AISchemaMismatchError } from "@/lib/aiUtils";
import { AI_MODEL_TEXT } from "@/lib/aiConfig";
import { PLACE_BIRD_REVIEW_STATUS_VALUES, type PlaceBirdReviewStatus } from "@/types/place";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getAdminUserFromCookies();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const place = await getPlaceById(id);
  if (!place) return NextResponse.json({ error: "Place not found." }, { status: 404 });

  const url = new URL(request.url);
  const existingPublishedOnly = url.searchParams.get("existing_published_only") === "true";

  const reviewStatusRaw = url.searchParams.get("review_status") ?? "";
  const reviewStatus = PLACE_BIRD_REVIEW_STATUS_VALUES.includes(reviewStatusRaw as PlaceBirdReviewStatus)
    ? (reviewStatusRaw as PlaceBirdReviewStatus)
    : ("suggested" as const);

  if (reviewStatus === "approved" && !existingPublishedOnly) {
    return NextResponse.json(
      { error: "review_status=approved requires existing_published_only=true." },
      { status: 400 }
    );
  }

  try {
    const result = await suggestPlaceBirdLinksV1({
      place,
      review_status: reviewStatus,
      existing_published_only: existingPublishedOnly,
    });
    return NextResponse.json({
      data: {
        place_id: place.id,
        inserted_count: result.inserted.length,
        inserted: result.inserted,
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
      { error: (error as Error)?.message ?? "Unable to suggest birds for this place." },
      { status: 502 }
    );
  }
}
