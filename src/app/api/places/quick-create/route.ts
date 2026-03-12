import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getAdminUserFromCookies } from "@/lib/auth";
import { createPlace, deletePlaceById, updatePlace } from "@/lib/placeService";
import { generateUniquePlaceSlug } from "@/lib/slug";
import { generatePlaceDraftFromNameV1 } from "@/lib/placeGeneration";
import { createPlaceUiVariantsBlock } from "@/lib/placeContentService";
import { suggestPlaceBirdLinksV1 } from "@/lib/placeBirdSuggestion";
import { AIJsonParseError, AISchemaMismatchError } from "@/lib/aiUtils";
import { AI_MODEL_TEXT } from "@/lib/aiConfig";
import { supabaseServerClient } from "@/lib/supabaseServerClient";

export async function POST(request: Request) {
  const user = await getAdminUserFromCookies();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));

  const requestedName = typeof body?.name === "string" ? body.name.trim() : "";
  const requestedLeafletRegionId =
    typeof body?.leaflet_region_id === "string" ? body.leaflet_region_id.trim() : "";

  let leafletRegionId: string | null = requestedLeafletRegionId || null;
  let regionNameFromCatalog: string | null = null;

  if (leafletRegionId) {
    const { data, error } = await supabaseServerClient
      .from("distribution_region_catalog_items")
      .select("catalog,scope,type,name")
      .eq("region_id", leafletRegionId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: "Unable to validate leaflet_region_id." }, { status: 500 });
    }

    const catalog = String(data?.catalog ?? "");
    const scope = String(data?.scope ?? "");
    const type = String(data?.type ?? "");
    const isHungarySpa = catalog === "hungaryRegions" && scope === "hungary" && type === "spa";
    const isExtendedSpa =
      catalog === "hungaryExtendedRegions" && scope === "hungary_extended" && type === "spa";
    if (!isHungarySpa && !isExtendedSpa) {
      return NextResponse.json(
        {
          error:
            "leaflet_region_id must reference a HU Natura 2000 SPA or a Hungary-extended SPA catalog item.",
        },
        { status: 400 }
      );
    }

    regionNameFromCatalog = String(data?.name ?? "").trim() || null;

    const { data: existingRows, error: existingError } = await supabaseServerClient
      .from("places")
      .select("id,name,slug")
      .eq("leaflet_region_id", leafletRegionId)
      .order("created_at", { ascending: true })
      .limit(1);

    if (existingError) {
      return NextResponse.json({ error: "Unable to validate existing places." }, { status: 500 });
    }

    const existing = (existingRows ?? []) as Array<Record<string, unknown>>;
    if (existing.length > 0) {
      return NextResponse.json(
        {
          error: "A place already exists for this SPA region.",
          data: {
            existing_place: {
              id: String(existing[0]?.id ?? ""),
              name: String(existing[0]?.name ?? ""),
              slug: String(existing[0]?.slug ?? ""),
            },
          },
        },
        { status: 409 }
      );
    }
  }

  const name = requestedName || regionNameFromCatalog || "";

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
      leaflet_region_id: leafletRegionId ?? undefined,
      access_note: placeMeta.access_note,
      parking_note: placeMeta.parking_note,
      best_visit_note: placeMeta.best_visit_note,
      notable_units_json: draftResult.notable_units,
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

    let birdSuggestions:
      | { inserted_count: number; generation_meta: Record<string, unknown> }
      | { error: string }
      | null = null;

    try {
      const suggestionResult = await suggestPlaceBirdLinksV1({ place: place!, review_status: "suggested" });
      birdSuggestions = {
        inserted_count: suggestionResult.inserted.length,
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
      console.error("Bird suggestion engine failed during place quick-create", suggestError);
    }

    return NextResponse.json(
      { data: { place, content_block: contentBlock, generation_meta: generationMeta, bird_suggestions: birdSuggestions } },
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
