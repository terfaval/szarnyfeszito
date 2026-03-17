import { supabaseServerClient } from "@/lib/supabaseServerClient";
import type { BirdDistributionMapRecord, BirdDistributionMapPayloadV1 } from "@/types/distributionMap";

const DISTRIBUTION_MAP_FIELDS =
  "id,bird_id,schema_version,summary,references_list,ranges,generation_meta,created_at,updated_at";

export async function getDistributionMapForBird(
  birdId: string
): Promise<BirdDistributionMapRecord | null> {
  const { data, error } = await supabaseServerClient
    .from("bird_distribution_maps")
    .select(DISTRIBUTION_MAP_FIELDS)
    .eq("bird_id", birdId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as BirdDistributionMapRecord) ?? null;
}

export async function upsertDistributionMapForBird(args: {
  birdId: string;
  payload: BirdDistributionMapPayloadV1;
  generation_meta: {
    model: string;
    prompt_hash: string;
    generated_at: string;
  };
}): Promise<BirdDistributionMapRecord> {
  const { birdId, payload, generation_meta } = args;
  const row = {
    bird_id: birdId,
    schema_version: "v1",
    summary: payload.summary,
    references_list: payload.references,
    ranges: payload.ranges,
    generation_meta,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseServerClient
    .from("bird_distribution_maps")
    .upsert(row, { onConflict: "bird_id" })
    .select(DISTRIBUTION_MAP_FIELDS)
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to upsert distribution map.");
  }

  return data as BirdDistributionMapRecord;
}
