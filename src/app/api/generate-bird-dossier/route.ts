import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getAdminUserFromCookies } from "@/lib/auth";
import { formatDossierValidationErrors } from "@/lib/dossierSchema";
import { getBirdById } from "@/lib/birdService";
import { generateAndPersistDossierForBird } from "@/lib/dossierService";
import { AI_MODEL_TEXT } from "@/lib/config";
import { AISchemaMismatchError, AIJsonParseError } from "@/lib/aiUtils";

export async function POST(request: NextRequest) {
  const user = await getAdminUserFromCookies();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const birdId = typeof body?.bird_id === "string" ? body.bird_id : null;

  if (!birdId) {
    return NextResponse.json(
      { error: "bird_id is required (string)" },
      { status: 400 }
    );
  }

  const bird = await getBirdById(birdId);

  if (!bird) {
    return NextResponse.json({ error: "Bird not found" }, { status: 404 });
  }

  try {
    const result = await generateAndPersistDossierForBird(bird);

    return NextResponse.json({
      data: result,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Dossier validation failed",
          model: AI_MODEL_TEXT,
          issues: formatDossierValidationErrors(error),
        },
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
      { error: (error as Error)?.message ?? "Unable to generate dossier." },
      { status: 502 }
    );
  }
}
