import { GeneratedContent, ContentBlock, ReviewStatus } from "@/types/content";
import { supabaseServerClient } from "@/lib/supabaseServerClient";
import { GenerationMeta } from "@/types/dossier";

export async function createContentBlockForBird(
  birdId: string,
  content: GeneratedContent
): Promise<ContentBlock> {
  const payload = {
    entity_type: "bird",
    entity_id: birdId,
    short: content.short,
    long: content.long,
    feature_block: content.feature_block,
    did_you_know: content.did_you_know,
    ethics_tip: content.ethics_tip,
    review_status: "draft" as ReviewStatus,
    version: content.version,
  };

  const { data, error } = await supabaseServerClient
    .from("content_blocks")
    .insert(payload)
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to persist content blocks.");
  }

  return data;
}

export async function getLatestContentBlockForBird(
  birdId: string
): Promise<ContentBlock | null> {
  const { data, error } = await supabaseServerClient
    .from("content_blocks")
    .select("*")
    .eq("entity_type", "bird")
    .eq("entity_id", birdId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ?? null;
}

type UpdateContentBlockInput = Partial<GeneratedContent> &
  Partial<Pick<ContentBlock, "version" | "review_status">> & {
    generation_meta?: GenerationMeta;
  };

export async function updateContentBlock(
  blockId: string,
  input: UpdateContentBlockInput
): Promise<ContentBlock> {
  const { feature_block, generation_meta, ...rest } = input;
  const payload: Record<string, unknown> = { ...rest };

  if (feature_block) {
    payload.feature_block = feature_block;
  }

  if (generation_meta) {
    payload.generation_meta = generation_meta;
  }

  const { data, error } = await supabaseServerClient
    .from("content_blocks")
    .update(payload)
    .eq("id", blockId)
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to update content block.");
  }

  return data;
}
