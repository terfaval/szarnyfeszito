import { Bird } from "@/types/bird";
import {
  ImageRecord,
  ImageReviewStatus,
  ImageSpec,
  ImageVariant,
} from "@/types/image";
import { createHash, randomUUID } from "crypto";
import { supabaseServerClient } from "@/lib/supabaseServerClient";
import { getBirdById, updateBird } from "@/lib/birdService";
import {
  IMAGE_ACCURACY_INPUTS,
  IMAGE_STYLE_CONFIG_ID_ICONIC,
  IMAGE_STYLE_CONFIG_ID_SCIENTIFIC,
  SUPABASE_IMAGE_BUCKET,
} from "@/lib/config";
import { AI_MODEL_IMAGE } from "@/lib/aiConfig";
import { getImageProvider } from "@/lib/imageProvider";
import { getLatestContentBlockForBird } from "@/lib/contentService";
import { generateScienceDossierV1, generateVisualBriefV1 } from "@/lib/imageAccuracyGeneration";
import { scienceDossierSchemaV1 } from "@/lib/imageAccuracySchemas";
import { getScienceDossierForBird, upsertScienceDossierDraft } from "@/lib/scienceDossierService";
import { getVisualBriefForBird, upsertVisualBriefDraft } from "@/lib/visualBriefService";

const REQUIRED_IMAGE_VARIANTS: ImageVariant[] = [
  "main_habitat",
  "fixed_pose_icon_v1",
];

const REQUIRED_SPECS: ImageSpec[] = [
  { style_family: "scientific", variant: "main_habitat" },
  { style_family: "iconic", variant: "fixed_pose_icon_v1" },
];

const OPTIONAL_SPECS: ImageSpec[] = [
  { style_family: "scientific", variant: "flight_clean" },
  { style_family: "scientific", variant: "nesting_clean" },
];

type BuiltImageSpec = {
  styleFamily: ImageSpec["style_family"];
  variant: ImageSpec["variant"];
  styleConfigId: string;
  seed: number | null;
  promptPayload: Record<string, unknown>;
  isRequired: boolean;
};

const LEGACY_IMAGE_FILES: Array<{
  styleFamily: ImageSpec["style_family"];
  variant: ImageVariant;
  filename: string;
}> = [
  { styleFamily: "scientific", variant: "main_habitat", filename: "main_habitat.png" },
  { styleFamily: "scientific", variant: "flight_clean", filename: "flight_clean.png" },
  { styleFamily: "scientific", variant: "nesting_clean", filename: "nesting_clean.png" },
  { styleFamily: "scientific", variant: "standing_clean", filename: "standing_clean.png" },
  { styleFamily: "iconic", variant: "fixed_pose_icon_v1", filename: "fixed_pose_icon_v1.png" },
];

export type ImageGenerationResult = {
  variant: ImageVariant;
  style_family: ImageSpec["style_family"];
  required: boolean;
  status: "success" | "failed";
  storage_path?: string;
  provider_model?: string | null;
  width_px?: number | null;
  height_px?: number | null;
  seed?: number | null;
  error_code?: string;
  error_message?: string;
};

function buildVersionedObjectPath(args: {
  bird: Bird;
  styleFamily: string;
  variant: string;
  imageId: string;
}) {
  return `birds/${args.bird.slug}/${args.styleFamily}/${args.variant}/${args.imageId}.png`;
}

async function uploadPngToStorage(args: {
  objectPath: string;
  buffer: Buffer;
}) {
  const { objectPath, buffer } = args;
  const { error } = await supabaseServerClient.storage
    .from(SUPABASE_IMAGE_BUCKET)
    .upload(objectPath, buffer, {
      upsert: true,
      cacheControl: "3600",
      contentType: "image/png",
    });

  if (error) {
    throw error;
  }
}

function parsePngDimensions(buffer: Buffer): { widthPx: number | null; heightPx: number | null } {
  if (!buffer || buffer.length < 24) {
    return { widthPx: null, heightPx: null };
  }

  // PNG signature (8 bytes) + IHDR chunk length (4) + type "IHDR" (4) + width (4) + height (4)
  const pngSignature = "89504e470d0a1a0a";
  const signatureHex = buffer.subarray(0, 8).toString("hex");
  if (signatureHex !== pngSignature) {
    return { widthPx: null, heightPx: null };
  }

  const ihdrType = buffer.subarray(12, 16).toString("ascii");
  if (ihdrType !== "IHDR") {
    return { widthPx: null, heightPx: null };
  }

  const widthPx = buffer.readUInt32BE(16);
  const heightPx = buffer.readUInt32BE(20);
  if (!Number.isFinite(widthPx) || !Number.isFinite(heightPx) || widthPx <= 0 || heightPx <= 0) {
    return { widthPx: null, heightPx: null };
  }

  return { widthPx, heightPx };
}

function sha256Hex(value: unknown) {
  const text = JSON.stringify(value ?? null);
  return createHash("sha256").update(text).digest("hex");
}

function deterministicSeed(args: { birdId: string; styleFamily: string; variant: string }) {
  const digest = createHash("sha256")
    .update(`${args.birdId}:${args.styleFamily}:${args.variant}`)
    .digest();
  const seed = digest.readUInt32BE(0) % 2147483647;
  return seed;
}

async function ensureScienceDossierForImageGen(bird: Bird) {
  const existing = await getScienceDossierForBird(bird.id);
  if (existing?.payload) {
    return existing;
  }

  const contentBlock = await getLatestContentBlockForBird(bird.id);
  const fieldGuideDossier = contentBlock?.blocks_json ?? null;

  const result = await generateScienceDossierV1({
    bird,
    dossier: fieldGuideDossier,
  });

  const saved = await upsertScienceDossierDraft({
    bird_id: bird.id,
    schema_version: "v1",
    payload: result.payload,
    created_by: "ai",
  });

  if (bird.science_dossier_status !== "approved") {
    await updateBird({ id: bird.id, science_dossier_status: "generated" });
  }

  return saved;
}

async function ensureVisualBriefForImageGen(bird: Bird, scienceDossier: { payload: unknown }) {
  const existing = await getVisualBriefForBird(bird.id);
  if (existing?.payload) {
    return existing;
  }

  const parsedScience = scienceDossierSchemaV1.parse(scienceDossier.payload);
  const contentBlock = await getLatestContentBlockForBird(bird.id);
  const fieldGuideDossier = contentBlock?.blocks_json ?? null;

  const result = await generateVisualBriefV1({
    bird,
    dossier: fieldGuideDossier,
    scienceDossier: parsedScience,
  });

  const saved = await upsertVisualBriefDraft({
    bird_id: bird.id,
    schema_version: "v1",
    payload: result.payload,
    created_by: "ai",
  });

  if (bird.visual_brief_status !== "approved") {
    await updateBird({ id: bird.id, visual_brief_status: "generated" });
  }

  return saved;
}

export async function generateImagesForBird(
  bird: Bird,
  options: { forceRegenerate?: boolean } = {}
): Promise<{
  bird: Bird;
  required_success: boolean;
  results: ImageGenerationResult[];
}> {
  if (bird.status === "images_approved" || bird.status === "published") {
    throw new Error("Images cannot be generated after images are approved or published.");
  }

  if (bird.status === "images_generated" && !options.forceRegenerate) {
    throw new Error(
      "Images can only be regenerated from images_generated status when force_regenerate=true."
    );
  }

  if (bird.status !== "text_approved" && bird.status !== "images_generated") {
    throw new Error("Images can only be generated when the bird has text_approved status.");
  }

  const contentBlock = await getLatestContentBlockForBird(bird.id);
  const blocksJson = contentBlock?.blocks_json ?? null;
  const dossierForImages =
    blocksJson && typeof blocksJson === "object"
      ? {
          signature_trait: (blocksJson as Record<string, unknown>).signature_trait ?? null,
          identification: (blocksJson as Record<string, unknown>).identification ?? null,
          distribution: (blocksJson as Record<string, unknown>).distribution ?? null,
          nesting: (blocksJson as Record<string, unknown>).nesting ?? null,
          migration: (blocksJson as Record<string, unknown>).migration ?? null,
        }
      : null;

  const accuracyMode = (IMAGE_ACCURACY_INPUTS ?? "off").toLowerCase();
  const scienceDossier =
    accuracyMode === "auto"
      ? await ensureScienceDossierForImageGen(bird)
      : await getScienceDossierForBird(bird.id);

  const visualBrief =
    accuracyMode === "auto" && scienceDossier
      ? await ensureVisualBriefForImageGen(bird, scienceDossier)
      : await getVisualBriefForBird(bird.id);

  const useScienceDossier =
    accuracyMode === "auto" ||
    (accuracyMode === "approved" && scienceDossier?.review_status === "approved");

  const useVisualBrief =
    accuracyMode === "auto" ||
    (accuracyMode === "approved" && visualBrief?.review_status === "approved");

  const provider = getImageProvider();
  const results: ImageGenerationResult[] = [];

  const buildSpecs = () => {
    const makeOne = (spec: ImageSpec, isRequired: boolean): BuiltImageSpec => {
      const styleConfigId =
        spec.style_family === "scientific"
          ? IMAGE_STYLE_CONFIG_ID_SCIENTIFIC
          : IMAGE_STYLE_CONFIG_ID_ICONIC;

      return {
        styleFamily: spec.style_family,
        variant: spec.variant,
        styleConfigId,
        seed: deterministicSeed({
          birdId: bird.id,
          styleFamily: spec.style_family,
          variant: spec.variant,
        }),
        promptPayload: {
          bird: {
            id: bird.id,
            slug: bird.slug,
            name_hu: bird.name_hu,
            name_latin: bird.name_latin ?? null,
          },
          field_guide_dossier: dossierForImages,
          ...(useScienceDossier ? { science_dossier: scienceDossier?.payload ?? null } : {}),
          ...(useVisualBrief ? { visual_brief: visualBrief?.payload ?? null } : {}),
          style_family: spec.style_family,
          variant: spec.variant,
          style_config_id: styleConfigId,
        },
        isRequired,
      };
    };

    return [
      ...REQUIRED_SPECS.map((spec) => makeOne(spec, true)),
      ...OPTIONAL_SPECS.map((spec) => makeOne(spec, false)),
    ];
  };

  const specs = buildSpecs();

  const generateOne = async (spec: BuiltImageSpec): Promise<ImageGenerationResult> => {
    const imageId = randomUUID();
    const storageObjectPath = buildVersionedObjectPath({
      bird,
      styleFamily: spec.styleFamily,
      variant: spec.variant,
      imageId,
    });
    const storagePath = `${SUPABASE_IMAGE_BUCKET}/${storageObjectPath}`;

    const prompt_hash = sha256Hex(spec.promptPayload);
    const spec_hash = sha256Hex({
      styleFamily: spec.styleFamily,
      variant: spec.variant,
      styleConfigId: spec.styleConfigId,
      seed: spec.seed,
      prompt_hash,
    });

    try {
      const startedAt = new Date().toISOString();
      console.info("[image-gen] start", {
        bird_id: bird.id,
        variant: spec.variant,
        style_family: spec.styleFamily,
        required: spec.isRequired,
        seed: spec.seed,
        storage_path: storagePath,
        image_id: imageId,
        started_at: startedAt,
      });

      const generated = await provider.generate({
        birdId: bird.id,
        birdSlug: bird.slug,
        styleFamily: spec.styleFamily,
        variant: spec.variant,
        promptPayload: spec.promptPayload,
        seed: spec.seed,
        styleConfigId: spec.styleConfigId,
      });

      if (generated.mimeType !== "image/png") {
        throw new Error(`Invalid mimeType returned by provider: ${generated.mimeType}`);
      }

      if (!generated.buffer || generated.buffer.length === 0) {
        throw new Error("Provider returned empty image buffer.");
      }

      await uploadPngToStorage({
        objectPath: storageObjectPath,
        buffer: generated.buffer,
      });

      const now = new Date().toISOString();
      const providerModel = generated.providerModel ?? null;

      const { error: unsetError } = await supabaseServerClient
        .from("images")
        .update({ is_current: false, updated_at: now })
        .eq("entity_type", "bird")
        .eq("entity_id", bird.id)
        .eq("style_family", spec.styleFamily)
        .eq("variant", spec.variant)
        .eq("is_current", true);

      if (unsetError) {
        throw unsetError;
      }

      const { data, error } = await supabaseServerClient
        .from("images")
        .insert(
          {
            id: imageId,
            entity_type: "bird",
            entity_id: bird.id,
            style_family: spec.styleFamily,
            variant: spec.variant,
            storage_path: storagePath,
            is_current: true,
            review_status: "draft",
            review_comment: null,
            version: `${providerModel ?? AI_MODEL_IMAGE}:${spec.variant}`,
            style_config_id: spec.styleConfigId,
            seed: spec.seed,
            width_px: generated.widthPx ?? null,
            height_px: generated.heightPx ?? null,
            provider_model: providerModel,
            spec_hash,
            prompt_hash,
            created_by: "script",
            updated_at: now,
          },
        )
        .select("storage_path, provider_model, width_px, height_px, seed")
        .single();

      if (error || !data) {
        throw error ?? new Error("Failed to upsert image record.");
      }

      const finishedAt = new Date().toISOString();
      console.info("[image-gen] success", {
        bird_id: bird.id,
        variant: spec.variant,
        style_family: spec.styleFamily,
        required: spec.isRequired,
        storage_path: data.storage_path,
        provider_model: data.provider_model ?? null,
        seed: data.seed ?? null,
        width_px: data.width_px ?? null,
        height_px: data.height_px ?? null,
        finished_at: finishedAt,
      });

      return {
        variant: spec.variant,
        style_family: spec.styleFamily,
        required: spec.isRequired,
        status: "success",
        storage_path: data.storage_path,
        provider_model: data.provider_model ?? null,
        width_px: data.width_px ?? null,
        height_px: data.height_px ?? null,
        seed: data.seed ?? null,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error.";
      console.info("[image-gen] failed", {
        bird_id: bird.id,
        variant: spec.variant,
        style_family: spec.styleFamily,
        required: spec.isRequired,
        error_message: message,
      });
      return {
        variant: spec.variant,
        style_family: spec.styleFamily,
        required: spec.isRequired,
        status: "failed",
        error_code: "UNKNOWN",
        error_message: message,
      };
    }
  };

  for (const spec of specs) {
    results.push(await generateOne(spec));
  }

  const required_success = REQUIRED_IMAGE_VARIANTS.every((variant) =>
    results.some(
      (result) => result.variant === variant && result.required && result.status === "success"
    )
  );

  const updatedBird = required_success
    ? await updateBird({ id: bird.id, status: "images_generated" })
    : bird;

  return { bird: updatedBird, required_success, results };
}

export async function listImagesForBird(birdId: string): Promise<ImageRecord[]> {
  const { data, error } = await supabaseServerClient
    .from("images")
    .select("*")
    .eq("entity_type", "bird")
    .eq("entity_id", birdId)
    .eq("is_current", true)
    .order("variant", { ascending: true });

  if (error) {
    throw error;
  }

  const current = (data ?? []) as ImageRecord[];
  if (current.length > 0) {
    return current;
  }

  const legacyImported = await importLegacyStorageImagesForBird(birdId);
  if (legacyImported.length > 0) {
    return legacyImported;
  }

  // Fallback for older rows where `is_current` was not set reliably yet.
  const { data: allData, error: allError } = await supabaseServerClient
    .from("images")
    .select("*")
    .eq("entity_type", "bird")
    .eq("entity_id", birdId)
    .order("variant", { ascending: true })
    .order("created_at", { ascending: false });

  if (allError) {
    throw allError;
  }

  const byVariant = new Map<ImageVariant, ImageRecord>();
  ((allData ?? []) as ImageRecord[]).forEach((image) => {
    if (!byVariant.has(image.variant)) {
      byVariant.set(image.variant, image);
    }
  });

  return Array.from(byVariant.values()).sort((a, b) =>
    a.variant.localeCompare(b.variant)
  );
}

async function importLegacyStorageImagesForBird(birdId: string): Promise<ImageRecord[]> {
  const bird = await getBirdById(birdId);
  if (!bird?.slug) {
    return [];
  }

  const scientificPath = `birds/${bird.slug}/scientific`;
  const iconicPath = `birds/${bird.slug}/iconic`;

  const [{ data: scientificFiles, error: scientificError }, { data: iconicFiles, error: iconicError }] =
    await Promise.all([
      supabaseServerClient.storage.from(SUPABASE_IMAGE_BUCKET).list(scientificPath, {
        limit: 200,
        offset: 0,
      }),
      supabaseServerClient.storage.from(SUPABASE_IMAGE_BUCKET).list(iconicPath, {
        limit: 200,
        offset: 0,
      }),
    ]);

  if (scientificError || iconicError) {
    return [];
  }

  const scientificNames = new Set((scientificFiles ?? []).map((file) => file.name));
  const iconicNames = new Set((iconicFiles ?? []).map((file) => file.name));

  const now = new Date().toISOString();
  const toInsert = LEGACY_IMAGE_FILES.filter((spec) => {
    const names = spec.styleFamily === "scientific" ? scientificNames : iconicNames;
    return names.has(spec.filename);
  }).map((spec) => {
    const folder = spec.styleFamily === "scientific" ? scientificPath : iconicPath;
    const storagePath = `${SUPABASE_IMAGE_BUCKET}/${folder}/${spec.filename}`;

    return {
      id: randomUUID(),
      entity_type: "bird" as const,
      entity_id: birdId,
      style_family: spec.styleFamily,
      variant: spec.variant,
      storage_path: storagePath,
      is_current: true,
      review_status: "draft" as const,
      review_comment: null,
      version: `legacy_import:${spec.styleFamily}:${spec.variant}`,
      style_config_id: null,
      seed: null,
      width_px: null,
      height_px: null,
      provider_model: null,
      spec_hash: sha256Hex({
        source: "legacy_import",
        style_family: spec.styleFamily,
        variant: spec.variant,
      }),
      prompt_hash: null,
      created_by: "legacy_import",
      updated_at: now,
    };
  });

  if (toInsert.length === 0) {
    return [];
  }

  const { data: inserted, error: insertError } = await supabaseServerClient
    .from("images")
    .insert(toInsert)
    .select("*");

  if (insertError) {
    return [];
  }

  return (inserted ?? []) as ImageRecord[];
}

function extractBucketPath(storagePath: string) {
  const normalized = storagePath.replace(/^\/+/, "");
  const [bucket, ...rest] = normalized.split("/");
  return { bucket, path: rest.join("/") };
}

export async function getSignedImageUrl(storagePath: string) {
  const normalized = storagePath.replace(/^\/+/, "");
  const { bucket, path } = extractBucketPath(normalized);

  const attempts: Array<{ bucket: string; path: string }> = [];
  if (bucket && path) {
    attempts.push({ bucket, path });
  }

  // If the stored path is missing the bucket prefix (legacy), retry with configured bucket.
  if (normalized) {
    const legacyPath = normalized.startsWith(`${SUPABASE_IMAGE_BUCKET}/`)
      ? normalized.slice(SUPABASE_IMAGE_BUCKET.length + 1)
      : normalized;
    attempts.push({ bucket: SUPABASE_IMAGE_BUCKET, path: legacyPath });
  }

  for (const attempt of attempts) {
    if (!attempt.bucket || !attempt.path) {
      continue;
    }

    const { data, error } = await supabaseServerClient.storage
      .from(attempt.bucket)
      .createSignedUrl(attempt.path, 60 * 5);

    if (!error && data?.signedUrl) {
      return data.signedUrl;
    }
  }

  return null;
}

export async function uploadManualBirdImageVariant(args: {
  birdId: string;
  styleFamily: ImageSpec["style_family"];
  variant: ImageVariant;
  pngBuffer: Buffer;
  createdBy: string;
}): Promise<ImageRecord> {
  const bird = await getBirdById(args.birdId);

  if (!bird) {
    throw new Error("Bird not found.");
  }

  if (!args.pngBuffer || args.pngBuffer.length === 0) {
    throw new Error("Uploaded file is empty.");
  }

  const signatureHex = args.pngBuffer.subarray(0, 8).toString("hex");
  if (signatureHex !== "89504e470d0a1a0a") {
    throw new Error("Only PNG uploads are supported.");
  }

  const imageId = randomUUID();
  const objectPath = buildVersionedObjectPath({
    bird,
    styleFamily: args.styleFamily,
    variant: args.variant,
    imageId,
  });
  const storagePath = `${SUPABASE_IMAGE_BUCKET}/${objectPath}`;

  await uploadPngToStorage({ objectPath, buffer: args.pngBuffer });

  const now = new Date().toISOString();
  const { widthPx, heightPx } = parsePngDimensions(args.pngBuffer);
  const styleConfigId =
    args.styleFamily === "scientific"
      ? IMAGE_STYLE_CONFIG_ID_SCIENTIFIC
      : IMAGE_STYLE_CONFIG_ID_ICONIC;

  const { error: unsetError } = await supabaseServerClient
    .from("images")
    .update({ is_current: false, updated_at: now })
    .eq("entity_type", "bird")
    .eq("entity_id", bird.id)
    .eq("style_family", args.styleFamily)
    .eq("variant", args.variant)
    .eq("is_current", true);

  if (unsetError) {
    throw unsetError;
  }

  const { data, error } = await supabaseServerClient
    .from("images")
    .insert({
      id: imageId,
      entity_type: "bird",
      entity_id: bird.id,
      style_family: args.styleFamily,
      variant: args.variant,
      storage_path: storagePath,
      is_current: true,
      review_status: "draft",
      review_comment: null,
      version: `manual_upload:${args.styleFamily}:${args.variant}`,
      style_config_id: styleConfigId,
      seed: null,
      width_px: widthPx,
      height_px: heightPx,
      provider_model: null,
      spec_hash: sha256Hex({
        source: "manual_upload",
        style_family: args.styleFamily,
        variant: args.variant,
      }),
      prompt_hash: null,
      created_by: args.createdBy,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to save uploaded image.");
  }

  return data as ImageRecord;
}

async function advanceBirdIfImagesApproved(birdId: string) {
  const { data, error } = await supabaseServerClient
    .from("images")
    .select("review_status, variant")
    .eq("entity_type", "bird")
    .eq("entity_id", birdId)
    .eq("is_current", true);

  if (error) {
    throw error;
  }

  const images = (data ?? []) as ImageRecord[];

  if (images.length === 0) {
    return;
  }

  const approvalByVariant = new Map<ImageVariant, ImageReviewStatus>();
  images.forEach((image) => {
    approvalByVariant.set(image.variant, image.review_status);
  });

  const requiredApproved = REQUIRED_IMAGE_VARIANTS.every(
    (variant) => approvalByVariant.get(variant) === "approved"
  );

  if (!requiredApproved) {
    return;
  }

  const bird = await getBirdById(birdId);

  if (!bird) {
    return;
  }

  if (bird.status === "images_approved" || bird.status === "published") {
    return;
  }

  await updateBird({ id: birdId, status: "images_approved" });
}

export async function updateImageReviewStatus(
  imageId: string,
  status: ImageReviewStatus
): Promise<ImageRecord> {
  const { data, error } = await supabaseServerClient
    .from("images")
    .update({
      review_status: status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", imageId)
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to update image status.");
  }

  await advanceBirdIfImagesApproved(data.entity_id);

  return data;
}

export async function approveCurrentImagesForBird(args: {
  birdId: string;
  scope: "required" | "all";
}): Promise<{ updated: number }> {
  const now = new Date().toISOString();
  const variants = args.scope === "required" ? REQUIRED_IMAGE_VARIANTS : null;

  let query = supabaseServerClient
    .from("images")
    .update({ review_status: "approved", updated_at: now })
    .eq("entity_type", "bird")
    .eq("entity_id", args.birdId)
    .eq("is_current", true);

  if (variants) {
    query = query.in("variant", variants);
  }

  const { data, error } = await query.select("id");

  if (error) {
    throw error;
  }

  await advanceBirdIfImagesApproved(args.birdId);

  return { updated: (data ?? []).length };
}

export async function requestImageReview(
  birdId: string,
  imageId: string,
  comment: string
): Promise<ImageRecord> {
  const trimmedComment = comment.trim();

  if (!trimmedComment) {
    throw new Error("Please add a short note before requesting changes.");
  }

  const { data: existing, error: existingError } = await supabaseServerClient
    .from("images")
    .select("entity_id")
    .eq("id", imageId)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (!existing) {
    throw new Error("Image not found.");
  }

  if (existing.entity_id !== birdId) {
    throw new Error("Image does not belong to this bird.");
  }

  const { data, error } = await supabaseServerClient
    .from("images")
    .update({
      review_status: "reviewed",
      review_comment: trimmedComment,
      updated_at: new Date().toISOString(),
    })
    .eq("id", imageId)
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to save the image review request.");
  }

  return data;
}
