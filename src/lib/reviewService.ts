import { GeneratedContent } from "@/types/content";
import { GenerationMeta } from "@/types/dossier";
import {
  getLatestContentBlockForBird,
  updateContentBlock,
} from "@/lib/contentService";
import { generateBirdDossier, regenerateBirdIdentification } from "@/lib/dossierGeneration";
import { getBirdById, updateBird } from "@/lib/birdService";

export async function approveBirdText(
  birdId: string,
  overrides: Partial<GeneratedContent>
) {
  const block = await getLatestContentBlockForBird(birdId);

  if (!block) {
    throw new Error("No generated content block found for this bird.");
  }

  const dossier = block.blocks_json;
  const sexComparison = dossier?.sex_comparison;
  const shouldAutoApproveSexComparison =
    !!sexComparison && sexComparison.review_status !== "approved";
  const normalizedSexComparison =
    shouldAutoApproveSexComparison && typeof sexComparison === "object"
      ? (() => {
          const summary =
            typeof sexComparison.summary === "string"
              ? sexComparison.summary.trim()
              : "";
          const diffsRaw = Array.isArray(sexComparison.key_differences)
            ? sexComparison.key_differences
            : [];
          const diffs = (diffsRaw as unknown[]).map((d) =>
            typeof d === "string" ? d.trim() : ""
          );

          if (!summary) return null;
          if (diffs.length !== 3 || diffs.some((d) => !d)) return null;

          const keyDifferences = [diffs[0], diffs[1], diffs[2]] as [
            string,
            string,
            string,
          ];

          return {
            ...sexComparison,
            review_status: "approved" as const,
            summary,
            key_differences: keyDifferences,
          };
        })()
      : null;

  const content = {
    short: overrides.short ?? block.short,
    long: overrides.long ?? block.long,
    feature_block: overrides.feature_block ?? block.feature_block,
    did_you_know: overrides.did_you_know ?? block.did_you_know,
    ethics_tip: overrides.ethics_tip ?? block.ethics_tip,
    version: overrides.version ?? block.version,
    review_status: "approved" as const,
  };

  const nextBlocksJson =
    dossier && normalizedSexComparison
      ? {
          ...dossier,
          sex_comparison: normalizedSexComparison,
        }
      : null;

  const updatedBlock = await updateContentBlock(block.id, {
    ...content,
    ...(nextBlocksJson ? { blocks_json: nextBlocksJson } : {}),
  });
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

export async function regenerateBirdTextForReview(birdId: string) {
  const block = await getLatestContentBlockForBird(birdId);

  if (!block) {
    throw new Error("No generated content block found for this bird.");
  }

  const bird = await getBirdById(birdId);

  if (!bird) {
    throw new Error("Bird not found.");
  }

  const reviewComment = block.generation_meta?.review_comment?.trim();
  const generationResult = await generateBirdDossier(bird, {
    reviewComment,
  });

  const updatedMeta: GenerationMeta = {
    model: generationResult.model,
    prompt_hash: generationResult.prompt_hash,
    generated_at: generationResult.generated_at,
    review_comment: block.generation_meta?.review_comment,
    review_requested_at: block.generation_meta?.review_requested_at,
  };

  const updatedBlock = await updateContentBlock(block.id, {
    blocks_json: generationResult.dossier,
    generation_meta: updatedMeta,
    review_status: "draft",
  });

  return updatedBlock;
}

export async function regenerateBirdIdentificationForReview(birdId: string) {
  const block = await getLatestContentBlockForBird(birdId);

  if (!block) {
    throw new Error("No generated content block found for this bird.");
  }

  if (!block.blocks_json) {
    throw new Error("No dossier JSON found for this bird.");
  }

  const bird = await getBirdById(birdId);

  if (!bird) {
    throw new Error("Bird not found.");
  }

  const reviewComment = block.generation_meta?.review_comment?.trim();
  const generationResult = await regenerateBirdIdentification({
    bird,
    dossier: block.blocks_json,
    reviewComment,
  });

  const updatedMeta: GenerationMeta = {
    model: generationResult.model,
    prompt_hash: generationResult.prompt_hash,
    generated_at: generationResult.generated_at,
    review_comment: block.generation_meta?.review_comment,
    review_requested_at: block.generation_meta?.review_requested_at,
  };

  const updatedBlock = await updateContentBlock(block.id, {
    blocks_json: generationResult.dossier,
    generation_meta: updatedMeta,
    review_status: "draft",
  });

  return updatedBlock;
}
