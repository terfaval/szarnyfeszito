import { supabaseServerClient } from "@/lib/supabaseServerClient";
import { GenerationMeta, BirdDossier } from "@/types/dossier";
import { ReviewStatus } from "@/types/content";
import { generateBirdDossier } from "@/lib/dossierGeneration";
import { updateBird } from "@/lib/birdService";
import { Bird } from "@/types/bird";

export type DossierBlockRecord = {
  id: string;
  entity_type: "bird";
  entity_id: string;
  review_status: ReviewStatus;
  created_at: string;
  updated_at: string;
  blocks_json: BirdDossier;
  generation_meta: GenerationMeta;
};

export async function createDossierBlockForBird(
  birdId: string,
  dossier: BirdDossier,
  meta: GenerationMeta
): Promise<DossierBlockRecord> {
  const short = dossier.header.short_summary ?? "";
  const long = Array.isArray(dossier.long_paragraphs) ? dossier.long_paragraphs.join("\n\n") : "";
  const did_you_know = dossier.did_you_know ?? "";
  const ethics_tip = dossier.ethics_tip ?? "";

  const payload = {
    entity_type: "bird",
    entity_id: birdId,
    review_status: "draft" as ReviewStatus,
    blocks_json: dossier,
    generation_meta: meta,
    version: `${meta.model}:${meta.generated_at}`,
    short,
    long,
    feature_block: [],
    did_you_know,
    ethics_tip,
  };

  const { data, error } = await supabaseServerClient
    .from("content_blocks")
    .insert(payload)
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to persist dossier blocks.");
  }

  return data;
}

export async function generateAndPersistDossierForBird(
  bird: Bird
): Promise<{
  bird: Bird;
  content_block: DossierBlockRecord;
  generation_meta: GenerationMeta;
}> {
  const generationResult = await generateBirdDossier(bird);
  const generationMeta = {
    model: generationResult.model,
    prompt_hash: generationResult.prompt_hash,
    generated_at: generationResult.generated_at,
  };

  const dossierBlock = await createDossierBlockForBird(
    bird.id,
    generationResult.dossier,
    generationMeta
  );

  const shouldSetColorTags = Array.isArray(bird.color_tags) ? bird.color_tags.length === 0 : true;

  const updatedBird = await updateBird({
    id: bird.id,
    status: "text_generated",
    color_tags: shouldSetColorTags ? [generationResult.dossier.pill_meta.color_bg] : undefined,
  });

  return {
    bird: updatedBird,
    content_block: dossierBlock,
    generation_meta: generationMeta,
  };
}
