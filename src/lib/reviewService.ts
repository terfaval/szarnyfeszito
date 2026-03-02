import { GeneratedContent } from "@/types/content";
import { GenerationMeta } from "@/types/dossier";
import {
  getLatestContentBlockForBird,
  updateContentBlock,
} from "@/lib/contentService";
import { updateBird } from "@/lib/birdService";

export async function approveBirdText(
  birdId: string,
  overrides: Partial<GeneratedContent>
) {
  const block = await getLatestContentBlockForBird(birdId);

  if (!block) {
    throw new Error("No generated content block found for this bird.");
  }

  const content = {
    short: overrides.short ?? block.short,
    long: overrides.long ?? block.long,
    feature_block: overrides.feature_block ?? block.feature_block,
    did_you_know: overrides.did_you_know ?? block.did_you_know,
    ethics_tip: overrides.ethics_tip ?? block.ethics_tip,
    version: overrides.version ?? block.version,
    review_status: "approved" as const,
  };

  const updatedBlock = await updateContentBlock(block.id, content);
  const updatedBird = await updateBird({ id: birdId, status: "text_approved" });

  return { bird: updatedBird, content_block: updatedBlock };
}

export async function requestBirdTextReview(birdId: string, comment: string) {
  const block = await getLatestContentBlockForBird(birdId);

  if (!block) {
    throw new Error("No generated content block found for this bird.");
  }

  const trimmedComment = comment.trim();

  if (!trimmedComment) {
    throw new Error("Review comment is required.");
  }

  const existingMeta = block.generation_meta;

  if (!existingMeta) {
    throw new Error("Missing generation metadata for this dossier.");
  }

  const updatedMeta: GenerationMeta = {
    ...existingMeta,
    review_comment: trimmedComment,
    review_requested_at: new Date().toISOString(),
  };

  const updatedBlock = await updateContentBlock(block.id, {
    review_status: "reviewed",
    generation_meta: updatedMeta,
  });

  return updatedBlock;
}
