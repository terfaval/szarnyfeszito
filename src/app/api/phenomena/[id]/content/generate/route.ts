import { NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { getPhenomenonById, updatePhenomenon } from "@/lib/phenomenonService";
import {
  createPhenomenonUiVariantsBlock,
  getLatestContentBlockForPhenomenon,
} from "@/lib/phenomenonContentService";
import { generatePhenomenonDraftV1 } from "@/lib/phenomenonGeneration";
import { AIJsonParseError, AISchemaMismatchError } from "@/lib/aiUtils";
import { AI_MODEL_TEXT } from "@/lib/aiConfig";
import { getDistributionRegionCatalogMetaById } from "@/lib/distributionRegionCatalogService";
import { suggestPhenomenonBirdLinksV1 } from "@/lib/phenomenonBirdSuggestion";
import { getDiscoveryDraftById } from "@/lib/phenomenonDiscoveryDraftService";
import { getPlaceById } from "@/lib/placeService";
import type { GenerationMeta } from "@/types/dossier";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getAdminUserFromCookies();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const phenomenon = await getPhenomenonById(id);
  if (!phenomenon) {
    return NextResponse.json({ error: "Phenomenon not found." }, { status: 404 });
  }

  let contextName = "";
  let contextId = "";
  if (phenomenon.place_id) {
    const place = await getPlaceById(phenomenon.place_id);
    if (!place) {
      return NextResponse.json({ error: "Place not found for this phenomenon." }, { status: 404 });
    }
    contextName = place.name;
    contextId = place.id;
  } else if (phenomenon.region_id) {
    const region = await getDistributionRegionCatalogMetaById(phenomenon.region_id);
    if (!region) {
      return NextResponse.json({ error: "Region catalog entry not found for this phenomenon." }, { status: 404 });
    }
    contextName = contextName;
    contextId = region.region_id;
  }

  if (!contextName) {
    return NextResponse.json({ error: "Phenomenon context missing (place or region)." }, { status: 409 });
  }

  if (!phenomenon.discovery_draft_id) {
    return NextResponse.json({ error: "Discovery draft missing for this phenomenon." }, { status: 409 });
  }

  const discoveryDraft = await getDiscoveryDraftById(phenomenon.discovery_draft_id);
  if (!discoveryDraft) {
    return NextResponse.json({ error: "Discovery draft not found for this phenomenon." }, { status: 404 });
  }

  const existingBlock = await getLatestContentBlockForPhenomenon(phenomenon.id);
  const existingPayload = existingBlock?.blocks_json ?? null;
  const reviewNote = existingBlock?.generation_meta?.review_comment ?? null;

  try {
        const generationResult = await generatePhenomenonDraftV1({
      region_name: contextName,
      region_id: contextId,
      season: phenomenon.season,
      discovery: {
        phenomenon_type: discoveryDraft.phenomenon_type,
        typical_start_mmdd: discoveryDraft.typical_start_mmdd,
        typical_end_mmdd: discoveryDraft.typical_end_mmdd,
        why_here: discoveryDraft.why_here,
        why_now: discoveryDraft.why_now,
      },
      admin_description: phenomenon.generation_input,
      existing_payload: existingPayload,
      review_note: reviewNote,
    });

    const generationMeta: GenerationMeta = {
      model: generationResult.model,
      prompt_hash: generationResult.prompt_hash,
      generated_at: new Date().toISOString(),
      review_comment: existingBlock?.generation_meta?.review_comment,
      review_requested_at: existingBlock?.generation_meta?.review_requested_at,
    };

    const updatedBlock = await createPhenomenonUiVariantsBlock({
      phenomenon_id: phenomenon.id,
      payload: generationResult.payload.content,
      generation_meta: generationMeta,
      review_status: "draft",
    });

    const nextTitle = generationResult.payload.phenomenon.title?.trim() || phenomenon.title;

    const updatedPhenomenon = await updatePhenomenon({
      id: phenomenon.id,
      title: nextTitle,
    });

    let birdSuggestions:
      | { inserted_count: number; deleted_count: number; generation_meta: Record<string, unknown> }
      | { error: string }
      | null = null;

    try {
      const suggestionResult = await suggestPhenomenonBirdLinksV1({
        phenomenon: updatedPhenomenon,
        region_name: contextName,
      });
      birdSuggestions = {
        inserted_count: suggestionResult.inserted.length,
        deleted_count: suggestionResult.deleted_count,
        generation_meta: {
          model: suggestionResult.model,
          request_id: suggestionResult.request_id,
          finish_reason: suggestionResult.finish_reason,
          prompt_hash: suggestionResult.prompt_hash,
          generated_at: new Date().toISOString(),
        },
      };
    } catch (suggestError) {
      birdSuggestions = { error: (suggestError as Error)?.message ?? "Unable to suggest birds." };
      console.error("Bird suggestion engine failed during phenomenon generation", suggestError);
    }

    return NextResponse.json({
      data: {
        phenomenon: updatedPhenomenon,
        content_block: updatedBlock,
        generation_meta: generationMeta,
        bird_suggestions: birdSuggestions,
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
      { error: (error as Error)?.message ?? "Unable to generate phenomenon content." },
      { status: 502 }
    );
  }
}


