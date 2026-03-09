import { NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { getPlaceById } from "@/lib/placeService";
import { suggestPlaceBirdLinksV1 } from "@/lib/placeBirdSuggestion";
import { AIJsonParseError, AISchemaMismatchError } from "@/lib/aiUtils";
import { AI_MODEL_TEXT } from "@/lib/aiConfig";

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getAdminUserFromCookies();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const place = await getPlaceById(id);
  if (!place) return NextResponse.json({ error: "Place not found." }, { status: 404 });

  try {
    const result = await suggestPlaceBirdLinksV1({ place, review_status: "suggested" });
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

