import { supabaseServerClient } from "@/lib/supabaseServerClient";
import type { PhenomenonDiscoveryDraft } from "@/types/phenomenonDiscovery";

const DRAFT_SELECT =
  "id,place_id,season,phenomenon_type,typical_start_mmdd,typical_end_mmdd,plausibility_score,confidence_score,why_here,why_now,profile_version,scoring_version,taxonomy_version,source_hash,created_at,updated_at";

export async function createPhenomenonDiscoveryDraft(
  input: Omit<PhenomenonDiscoveryDraft, "id" | "created_at" | "updated_at">
): Promise<PhenomenonDiscoveryDraft> {
  const { data, error } = await supabaseServerClient
    .from("phenomenon_discovery_drafts")
    .insert({
      ...input,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select(DRAFT_SELECT)
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to create phenomenon discovery draft.");
  }

  return data as PhenomenonDiscoveryDraft;
}

export async function getDiscoveryDraftById(id: string): Promise<PhenomenonDiscoveryDraft | null> {
  const { data, error } = await supabaseServerClient
    .from("phenomenon_discovery_drafts")
    .select(DRAFT_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data ?? null) as PhenomenonDiscoveryDraft | null;
}
