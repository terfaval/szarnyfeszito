import { supabaseServerClient } from "@/lib/supabaseServerClient";
import type { ReviewStatus } from "@/types/content";
import type { GenerationMeta } from "@/types/dossier";
import type { PlaceUiVariantsV1 } from "@/lib/placeContentSchema";

export type PlaceContentBlockRecord = {
  id: string;
  entity_type: "place";
  entity_id: string;
  review_status: ReviewStatus;
  created_at: string;
  updated_at: string;
  blocks_json: PlaceUiVariantsV1 | null;
  generation_meta: GenerationMeta | null;
  short: string | null;
  long: string | null;
  did_you_know: string | null;
  ethics_tip: string | null;
};

export async function getLatestContentBlockForPlace(
  placeId: string
): Promise<PlaceContentBlockRecord | null> {
  const { data, error } = await supabaseServerClient
    .from("content_blocks")
    .select(
      "id,entity_type,entity_id,review_status,created_at,updated_at,blocks_json,generation_meta,short,long,did_you_know,ethics_tip"
    )
    .eq("entity_type", "place")
    .eq("entity_id", placeId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data ?? null) as PlaceContentBlockRecord | null;
}

export async function getLatestApprovedContentBlockForPlace(
  placeId: string
): Promise<PlaceContentBlockRecord | null> {
  const { data, error } = await supabaseServerClient
    .from("content_blocks")
    .select(
      "id,entity_type,entity_id,review_status,created_at,updated_at,blocks_json,generation_meta,short,long,did_you_know,ethics_tip"
    )
    .eq("entity_type", "place")
    .eq("entity_id", placeId)
    .eq("review_status", "approved")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data ?? null) as PlaceContentBlockRecord | null;
}

export async function createPlaceUiVariantsBlock(args: {
  place_id: string;
  payload: PlaceUiVariantsV1;
  review_status: ReviewStatus;
  generation_meta: GenerationMeta;
}): Promise<PlaceContentBlockRecord> {
  const derivedColumns = {
    short: args.payload.variants.short,
    long: args.payload.variants.long,
    did_you_know: args.payload.variants.did_you_know,
    ethics_tip: args.payload.variants.ethics_tip,
    blocks_json: args.payload,
    generation_meta: args.generation_meta,
    review_status: args.review_status,
    version: `${args.generation_meta.model}:${args.generation_meta.generated_at}`,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseServerClient
    .from("content_blocks")
    .insert({
      entity_type: "place",
      entity_id: args.place_id,
      ...derivedColumns,
      feature_block: [],
    })
    .select(
      "id,entity_type,entity_id,review_status,created_at,updated_at,blocks_json,generation_meta,short,long,did_you_know,ethics_tip"
    )
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to persist place content block.");
  }

  return data as PlaceContentBlockRecord;
}

export async function updatePlaceContentBlockMeta(args: {
  block_id: string;
  review_status?: ReviewStatus;
  generation_meta?: GenerationMeta;
}): Promise<PlaceContentBlockRecord> {
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (args.review_status) {
    payload.review_status = args.review_status;
  }

  if (args.generation_meta) {
    payload.generation_meta = args.generation_meta;
  }

  const { data, error } = await supabaseServerClient
    .from("content_blocks")
    .update(payload)
    .eq("id", args.block_id)
    .select(
      "id,entity_type,entity_id,review_status,created_at,updated_at,blocks_json,generation_meta,short,long,did_you_know,ethics_tip"
    )
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to update place content block.");
  }

  return data as PlaceContentBlockRecord;
}
