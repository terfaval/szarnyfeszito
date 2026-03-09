import { GeneratedContent, ContentBlock, ReviewStatus } from "@/types/content";
import { supabaseServerClient } from "@/lib/supabaseServerClient";
import { BirdDossier, GenerationMeta } from "@/types/dossier";

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

export async function listLatestDossierBlocksForBirds(birdIds: string[]) {
  if (birdIds.length === 0) {
    return new Map<string, BirdDossier>();
  }

  const { data, error } = await supabaseServerClient
    .from("content_blocks")
    .select("entity_id, blocks_json, updated_at")
    .eq("entity_type", "bird")
    .in("entity_id", birdIds)
    .not("blocks_json", "is", null)
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  const latest = new Map<string, BirdDossier>();
  const rows = (data ?? []) as Array<{
    entity_id: string;
    blocks_json: BirdDossier | null;
    updated_at: string;
  }>;

  for (const row of rows) {
    if (!latest.has(row.entity_id) && row.blocks_json) {
      latest.set(row.entity_id, row.blocks_json);
    }
  }

  return latest;
}

type UpdateContentBlockInput = Partial<GeneratedContent> &
  Partial<Pick<ContentBlock, "version" | "review_status">> & {
    generation_meta?: GenerationMeta;
    blocks_json?: BirdDossier;
  };

export async function updateContentBlock(
  blockId: string,
  input: UpdateContentBlockInput
): Promise<ContentBlock> {
  const { feature_block, generation_meta, blocks_json, ...rest } = input;
  const payload: Record<string, unknown> = { ...rest };

  if (feature_block) {
    payload.feature_block = feature_block;
  }

  if (generation_meta) {
    payload.generation_meta = generation_meta;
  }

  if (blocks_json) {
    payload.blocks_json = blocks_json;
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
