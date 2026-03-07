import { Bird } from "@/types/bird";
import {
  ImageRecord,
  ImageReviewStatus,
  ImageSpec,
  ImageVariant,
} from "@/types/image";
import { createHash } from "crypto";
import { supabaseServerClient } from "@/lib/supabaseServerClient";
import { getBirdById, updateBird } from "@/lib/birdService";
import {
  AI_MODEL_IMAGE,
  IMAGE_STYLE_CONFIG_ID_ICONIC,
  IMAGE_STYLE_CONFIG_ID_SCIENTIFIC,
  SUPABASE_IMAGE_BUCKET,
} from "@/lib/config";
import { getImageProvider } from "@/lib/imageProvider";
import {
  getApprovedScienceDossierForBird,
} from "@/lib/scienceDossierService";
import { getApprovedVisualBriefForBird } from "@/lib/visualBriefService";

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
  storageObjectPath: string;
  storagePath: string;
  styleConfigId: string;
  seed: number | null;
  promptPayload: Record<string, unknown>;
  isRequired: boolean;
};

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

function buildCanonicalObjectPath(bird: Bird, spec: { styleFamily: string; variant: string }) {
  return `birds/${bird.slug}/${spec.styleFamily}/${spec.variant}.png`;
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

function sha256Hex(value: unknown) {
  const text = JSON.stringify(value ?? null);
  return createHash("sha256").update(text).digest("hex");
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

  if (bird.science_dossier_status !== "approved") {
    throw new Error("Science Dossier must be approved before generating images.");
  }

  if (bird.visual_brief_status !== "approved") {
    throw new Error("Visual Brief must be approved before generating images.");
  }

  const [scienceDossier, visualBrief] = await Promise.all([
    getApprovedScienceDossierForBird(bird.id),
    getApprovedVisualBriefForBird(bird.id),
  ]);

  if (!scienceDossier) {
    throw new Error("Approved Science Dossier record not found.");
  }

  if (!visualBrief) {
    throw new Error("Approved Visual Brief record not found.");
  }

  const provider = getImageProvider();
  const results: ImageGenerationResult[] = [];

  const buildSpecs = () => {
    const makeOne = (spec: ImageSpec, isRequired: boolean): BuiltImageSpec => {
      const styleConfigId =
        spec.style_family === "scientific"
          ? IMAGE_STYLE_CONFIG_ID_SCIENTIFIC
          : IMAGE_STYLE_CONFIG_ID_ICONIC;

      const storageObjectPath = buildCanonicalObjectPath(bird, {
        styleFamily: spec.style_family,
        variant: spec.variant,
      });

      return {
        styleFamily: spec.style_family,
        variant: spec.variant,
        storageObjectPath,
        storagePath: `${SUPABASE_IMAGE_BUCKET}/${storageObjectPath}`,
        styleConfigId,
        seed: null,
        promptPayload: {
          bird: { id: bird.id, slug: bird.slug, name_hu: bird.name_hu, name_latin: bird.name_latin ?? null },
          science_dossier: scienceDossier.payload ?? null,
          visual_brief: visualBrief.payload ?? null,
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
    const prompt_hash = sha256Hex(spec.promptPayload);
    const spec_hash = sha256Hex({
      styleFamily: spec.styleFamily,
      variant: spec.variant,
      storagePath: spec.storagePath,
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
        storage_path: spec.storagePath,
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
        objectPath: spec.storageObjectPath,
        buffer: generated.buffer,
      });

      const now = new Date().toISOString();
      const providerModel = generated.providerModel ?? null;

      const { data, error } = await supabaseServerClient
        .from("images")
        .upsert(
          {
            entity_type: "bird",
            entity_id: bird.id,
            style_family: spec.styleFamily,
            variant: spec.variant,
            storage_path: spec.storagePath,
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
          { onConflict: "entity_type,entity_id,variant" }
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
    .order("variant", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

function extractBucketPath(storagePath: string) {
  const [bucket, ...rest] = storagePath.split("/");
  return { bucket, path: rest.join("/") };
}

export async function getSignedImageUrl(storagePath: string) {
  const { bucket, path } = extractBucketPath(storagePath);

  if (!bucket || !path) {
    return null;
  }

  const { data, error } = await supabaseServerClient.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 5);

  if (error || !data?.signedUrl) {
    return null;
  }

  return data.signedUrl;
}

async function advanceBirdIfImagesApproved(birdId: string) {
  const { data, error } = await supabaseServerClient
    .from("images")
    .select("review_status, variant")
    .eq("entity_type", "bird")
    .eq("entity_id", birdId);

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
