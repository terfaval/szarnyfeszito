import type { BirdDossier, SexComparisonV1 } from "@/types/dossier";
import type { ReviewStatus } from "@/types/content";
import { getBirdById } from "@/lib/birdService";
import { getLatestContentBlockForBird, updateContentBlock } from "@/lib/contentService";
import { generateSexComparisonV1 } from "@/lib/sexComparisonGeneration";

const SCHEMA_VERSION = "sex_comparison_v1" as const;

function getSexComparison(dossier: BirdDossier | null | undefined): SexComparisonV1 | null {
  const candidate = (dossier as BirdDossier | null)?.sex_comparison ?? null;
  if (!candidate || typeof candidate !== "object") return null;
  return candidate as SexComparisonV1;
}

export async function generateSexComparisonDraft(args: {
  birdId: string;
}): Promise<{ content_block: Awaited<ReturnType<typeof getLatestContentBlockForBird>> }> {
  const bird = await getBirdById(args.birdId);
  if (!bird) {
    throw new Error("Bird not found.");
  }

  const block = await getLatestContentBlockForBird(args.birdId);
  if (!block?.blocks_json) {
    throw new Error("No dossier found for this bird. Generate the dossier first.");
  }

  const existing = getSexComparison(block.blocks_json);
  if (existing?.review_status === "approved") {
    throw new Error("Sex comparison is approved and locked. Request changes instead of regenerating.");
  }

  const reviewComment = existing?.generation_meta?.review_comment?.trim() || null;
  const generated = await generateSexComparisonV1({
    bird,
    dossier: block.blocks_json,
    reviewComment,
  });

  const next: SexComparisonV1 = {
    schema_version: SCHEMA_VERSION,
    language: "hu",
    review_status: "draft",
    summary: generated.payload.summary,
    key_differences: generated.payload.key_differences,
    generation_meta: {
      ...generated.meta,
      review_comment: existing?.generation_meta?.review_comment,
      review_requested_at: existing?.generation_meta?.review_requested_at,
    },
  };

  const updated = await updateContentBlock(block.id, {
    blocks_json: {
      ...block.blocks_json,
      sex_comparison: next,
    },
  });

  return { content_block: updated };
}

export async function requestSexComparisonFix(args: { birdId: string; comment: string }) {
  const block = await getLatestContentBlockForBird(args.birdId);
  if (!block?.blocks_json) {
    throw new Error("No dossier found for this bird. Generate the dossier first.");
  }

  const existing = getSexComparison(block.blocks_json);
  if (!existing) {
    throw new Error("No sex comparison found for this bird. Generate it first.");
  }

  const trimmed = args.comment.trim();
  if (!trimmed) {
    throw new Error("Review comment is required.");
  }

  const next: SexComparisonV1 = {
    ...existing,
    review_status: "reviewed",
    generation_meta: {
      ...existing.generation_meta,
      review_comment: trimmed,
      review_requested_at: new Date().toISOString(),
    },
  };

  const updated = await updateContentBlock(block.id, {
    blocks_json: {
      ...block.blocks_json,
      sex_comparison: next,
    },
  });

  return { content_block: updated };
}

export async function approveSexComparison(args: {
  birdId: string;
  summary?: string;
  key_differences?: unknown;
}) {
  const block = await getLatestContentBlockForBird(args.birdId);
  if (!block?.blocks_json) {
    throw new Error("No dossier found for this bird. Generate the dossier first.");
  }

  const existing = getSexComparison(block.blocks_json);
  if (!existing) {
    throw new Error("No sex comparison found for this bird. Generate it first.");
  }

  const summary = typeof args.summary === "string" ? args.summary.trim() : existing.summary;
  const diffsRaw = Array.isArray(args.key_differences) ? args.key_differences : existing.key_differences;
  const diffs = (diffsRaw as unknown[]).map((d) => (typeof d === "string" ? d.trim() : "")).filter(Boolean);

  if (!summary) {
    throw new Error("summary is required.");
  }

  if (diffs.length !== 3) {
    throw new Error("Exactly three key differences are required.");
  }

  const next: SexComparisonV1 = {
    ...existing,
    review_status: "approved",
    summary,
    key_differences: [diffs[0], diffs[1], diffs[2]],
  };

  const updated = await updateContentBlock(block.id, {
    blocks_json: {
      ...block.blocks_json,
      sex_comparison: next,
    },
  });

  return { content_block: updated };
}

export async function getSexComparisonStatus(args: { birdId: string }): Promise<{
  sex_comparison: SexComparisonV1 | null;
  content_block_status: ReviewStatus | null;
}> {
  const block = await getLatestContentBlockForBird(args.birdId);
  const dossier = block?.blocks_json ?? null;
  return {
    sex_comparison: getSexComparison(dossier),
    content_block_status: (block?.review_status as ReviewStatus | undefined) ?? null,
  };
}

