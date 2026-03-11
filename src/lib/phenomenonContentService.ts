import { supabaseServerClient } from "@/lib/supabaseServerClient";
import type { ReviewStatus } from "@/types/content";
import type { GenerationMeta } from "@/types/dossier";
import type { PhenomenonUiVariantsV1 } from "@/lib/phenomenonContentSchema";

export type PhenomenonContentBlockRecord = {
  id: string;
  entity_type: "phenomenon";
  entity_id: string;
  review_status: ReviewStatus;
  created_at: string;
  updated_at: string;
  blocks_json: PhenomenonUiVariantsV1 | null;
  generation_meta: GenerationMeta | null;
  short: string | null;
  long: string | null;
  did_you_know: string | null;
  ethics_tip: string | null;
};

const CONTENT_SELECT =
  "id,entity_type,entity_id,review_status,created_at,updated_at,blocks_json,generation_meta,short,long,did_you_know,ethics_tip";

export async function getLatestContentBlockForPhenomenon(
  phenomenonId: string
): Promise<PhenomenonContentBlockRecord | null> {
  const { data, error } = await supabaseServerClient
    .from("content_blocks")
    .select(CONTENT_SELECT)
    .eq("entity_type", "phenomenon")
    .eq("entity_id", phenomenonId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data ?? null) as PhenomenonContentBlockRecord | null;
}

export async function getLatestApprovedContentBlockForPhenomenon(
  phenomenonId: string
): Promise<PhenomenonContentBlockRecord | null> {
  const { data, error } = await supabaseServerClient
    .from("content_blocks")
    .select(CONTENT_SELECT)
    .eq("entity_type", "phenomenon")
    .eq("entity_id", phenomenonId)
    .eq("review_status", "approved")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data ?? null) as PhenomenonContentBlockRecord | null;
}

export async function createPhenomenonUiVariantsBlock(args: {
  phenomenon_id: string;
  payload: PhenomenonUiVariantsV1;
  review_status: ReviewStatus;
  generation_meta: GenerationMeta;
}): Promise<PhenomenonContentBlockRecord> {
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
      entity_type: "phenomenon",
      entity_id: args.phenomenon_id,
      ...derivedColumns,
      feature_block: [],
    })
    .select(CONTENT_SELECT)
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to persist phenomenon content block.");
  }

  return data as PhenomenonContentBlockRecord;
}

export async function updatePhenomenonContentBlockMeta(args: {
  block_id: string;
  review_status?: ReviewStatus;
  generation_meta?: GenerationMeta;
}): Promise<PhenomenonContentBlockRecord> {
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
    .select(CONTENT_SELECT)
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to update phenomenon content block.");
  }

  return data as PhenomenonContentBlockRecord;
}

