import { supabaseServerClient } from "@/lib/supabaseServerClient";
import type { VisualBriefRecord } from "@/types/imageAccuracy";

export async function getVisualBriefForBird(
  birdId: string
): Promise<VisualBriefRecord | null> {
  const { data, error } = await supabaseServerClient
    .from("bird_visual_briefs")
    .select("*")
    .eq("bird_id", birdId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as VisualBriefRecord | null) ?? null;
}

export async function getApprovedVisualBriefForBird(
  birdId: string
): Promise<VisualBriefRecord | null> {
  const { data, error } = await supabaseServerClient
    .from("bird_visual_briefs")
    .select("*")
    .eq("bird_id", birdId)
    .eq("review_status", "approved")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as VisualBriefRecord | null) ?? null;
}

export async function upsertVisualBriefDraft(input: {
  bird_id: string;
  schema_version: string;
  payload: unknown;
  created_by: string;
}): Promise<VisualBriefRecord> {
  const { data, error } = await supabaseServerClient
    .from("bird_visual_briefs")
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
    throw error ?? new Error("Unable to save visual brief.");
  }

  return data as VisualBriefRecord;
}

export async function approveVisualBrief(input: {
  bird_id: string;
  approved_by: string;
}): Promise<VisualBriefRecord> {
  const now = new Date().toISOString();
  const { data, error } = await supabaseServerClient
    .from("bird_visual_briefs")
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
    throw error ?? new Error("Unable to approve visual brief.");
  }

  return data as VisualBriefRecord;
}
