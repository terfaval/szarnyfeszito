import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getAdminUserFromCookies } from "@/lib/auth";
import { createBird, deleteBirdById } from "@/lib/birdService";
import { AI_MODEL_TEXT } from "@/lib/aiConfig";
import { AISchemaMismatchError, AIJsonParseError } from "@/lib/aiUtils";
import { formatDossierValidationErrors } from "@/lib/dossierSchema";
import { generateAndPersistDossierForBird } from "@/lib/dossierService";
import { generateUniqueBirdSlug } from "@/lib/slug";
import { getPlaceById } from "@/lib/placeService";
import { supabaseServerClient } from "@/lib/supabaseServerClient";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getAdminUserFromCookies();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const place = await getPlaceById(id);
  if (!place) return NextResponse.json({ error: "Place not found." }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const linkId = typeof body?.link_id === "string" ? body.link_id.trim() : "";
  const rawLatin = typeof body?.name_latin === "string" ? body.name_latin.trim() : "";
  const rawHungarian = typeof body?.name_hu === "string" ? body.name_hu.trim() : "";

  if (!linkId) {
    return NextResponse.json({ error: "link_id is required." }, { status: 400 });
  }

  if (!rawLatin) {
    return NextResponse.json({ error: "name_latin is required." }, { status: 400 });
  }

  const { data: link, error: linkError } = await supabaseServerClient
    .from("place_birds")
    .select("id,place_id,bird_id,pending_bird_name_hu,review_status")
    .eq("place_id", place.id)
    .eq("id", linkId)
    .maybeSingle();

  if (linkError) {
    throw linkError;
  }

  if (!link) {
    return NextResponse.json({ error: "Place bird link not found." }, { status: 404 });
  }

  if (link.bird_id) {
    return NextResponse.json({ error: "This link is already connected to a bird." }, { status: 409 });
  }

  const pendingHu = typeof link.pending_bird_name_hu === "string" ? link.pending_bird_name_hu.trim() : "";
  if (!pendingHu) {
    return NextResponse.json({ error: "This link has no pending Hungarian bird name to generate from." }, { status: 400 });
  }

  let slug: string;
  try {
    slug = await generateUniqueBirdSlug(rawLatin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate slug for that Latin name.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const bird = await createBird({
    slug,
    name_hu: rawHungarian || pendingHu || rawLatin,
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

    const { error: updateError } = await supabaseServerClient
      .from("place_birds")
      .update({
        bird_id: dossierResult.bird.id,
        pending_bird_name_hu: null,
        updated_at: new Date().toISOString(),
      })
      .eq("place_id", place.id)
      .eq("id", link.id);

    if (updateError) {
      console.error("Failed to link generated bird to place_birds row", updateError);
      return NextResponse.json(
        {
          error: "Bird generated, but linking back to Place failed.",
          data: { bird: dossierResult.bird, place_id: place.id, link_id: link.id },
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data: { bird: dossierResult.bird, place_id: place.id, link_id: link.id } },
      { status: 201 }
    );
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

    return NextResponse.json({ error: (error as Error)?.message ?? "Unable to generate dossier." }, { status: 502 });
  }
}

