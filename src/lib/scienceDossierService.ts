import { supabaseServerClient } from "@/lib/supabaseServerClient";
import type { ScienceDossierRecord } from "@/types/imageAccuracy";

export async function getScienceDossierForBird(
  birdId: string
): Promise<ScienceDossierRecord | null> {
  const { data, error } = await supabaseServerClient
    .from("bird_science_dossiers")
    .select("*")
    .eq("bird_id", birdId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as ScienceDossierRecord | null) ?? null;
}

export async function upsertScienceDossierDraft(input: {
  bird_id: string;
  schema_version: string;
  payload: unknown;
  created_by: string;
}): Promise<ScienceDossierRecord> {
  const { data, error } = await supabaseServerClient
    .from("bird_science_dossiers")
    .upsert(
      {
        bird_id: input.bird_id,
        schema_version: input.schema_version,
        payload: input.payload,
        review_status: "draft",
        created_by: input.created_by,
        approved_by: null,
        approved_at: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "bird_id" }
    )
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to save science dossier.");
  }

  return data as ScienceDossierRecord;
}

export async function approveScienceDossier(input: {
  bird_id: string;
  approved_by: string;
}): Promise<ScienceDossierRecord> {
  const now = new Date().toISOString();
  const { data, error } = await supabaseServerClient
    .from("bird_science_dossiers")
    .update({
      review_status: "approved",
      approved_by: input.approved_by,
      approved_at: now,
      updated_at: now,
    })
    .eq("bird_id", input.bird_id)
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to approve science dossier.");
  }

  return data as ScienceDossierRecord;
}
