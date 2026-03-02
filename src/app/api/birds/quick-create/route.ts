import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getAdminUserFromCookies } from "@/lib/auth";
import {
  createBird,
  deleteBirdById,
} from "@/lib/birdService";
import { generateAndPersistDossierForBird } from "@/lib/dossierService";
import { formatDossierValidationErrors } from "@/lib/dossierSchema";
import { generateUniqueBirdSlug } from "@/lib/slug";
import { AI_MODEL_TEXT } from "@/lib/config";
import { AISchemaMismatchError, AIJsonParseError } from "@/lib/aiUtils";

export async function POST(request: Request) {
  const user = await getAdminUserFromCookies();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const rawLatin = typeof body?.name_latin === "string" ? body.name_latin.trim() : "";
  const rawHungarian =
    typeof body?.name_hu === "string" ? body.name_hu.trim() : "";

  if (!rawLatin) {
    return NextResponse.json(
      { error: "name_latin is required." },
      { status: 400 }
    );
  }

  let slug: string;

  try {
    slug = await generateUniqueBirdSlug(rawLatin);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to generate slug for that Latin name.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const bird = await createBird({
    slug,
    name_hu: rawHungarian || rawLatin,
    name_latin: rawLatin,
  });

  const cleanupBird = async () => {
    try {
      await deleteBirdById(bird.id);
    } catch (cleanupError) {
      console.error("Failed to delete bird after dossier failure", cleanupError);
    }
  };

  try {
    const dossierResult = await generateAndPersistDossierForBird(bird);

    return NextResponse.json({ data: dossierResult }, { status: 201 });
  } catch (error) {
    await cleanupBird();
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
