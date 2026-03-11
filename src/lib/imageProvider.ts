import {
  IMAGE_PROVIDER,
  IMAGE_QUALITY,
  IMAGE_SIZE,
} from "@/lib/config";
import { AI_MODEL_IMAGE, OPENAI_API_KEY } from "@/lib/aiConfig";
import type { ImageStyleFamily, ImageVariant } from "@/types/image";

export type GenerateImageInput = {
  entityType: "bird" | "place" | "phenomenon";
  entityId: string;
  entitySlug: string;
  styleFamily: ImageStyleFamily;
  variant: ImageVariant;
  promptPayload: Record<string, unknown>;
  seed?: number | null;
  styleConfigId: string;
};

export type GeneratedImage = {
  buffer: Buffer;
  mimeType: "image/png";
  widthPx?: number;
  heightPx?: number;
  seed?: number | null;
  providerModel?: string | null;
};

export interface ImageProvider {
  generate(input: GenerateImageInput): Promise<GeneratedImage>;
}

const ONE_BY_ONE_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/6X8pQAAAABJRU5ErkJggg==";

export class LocalStubImageProvider implements ImageProvider {
  async generate(input: GenerateImageInput): Promise<GeneratedImage> {
    return {
      buffer: Buffer.from(ONE_BY_ONE_PNG_BASE64, "base64"),
      mimeType: "image/png",
      widthPx: 1,
      heightPx: 1,
      seed: input.seed ?? null,
      providerModel: "stub",
    };
  }
}

function parseSizePx(size: string) {
  const match = size.trim().match(/^(\d{2,5})x(\d{2,5})$/i);
  if (!match) return { width: undefined, height: undefined };
  return { width: Number(match[1]), height: Number(match[2]) };
}

function buildOpenAIPrompt(input: GenerateImageInput) {
  const requestedBirdsPayload = (input.promptPayload as { requested_birds?: unknown } | null)
    ?.requested_birds as
    | {
        season?: string;
        mode?: "specific" | "generic";
        birds?: Array<{ slug?: string; name_hu?: string }>;
        rendering?: string;
        count?: number;
      }
    | undefined;

  const requestedBirdNamesHu =
    requestedBirdsPayload?.mode === "specific" && Array.isArray(requestedBirdsPayload.birds)
      ? requestedBirdsPayload.birds
          .map((b) => (typeof b?.name_hu === "string" ? b.name_hu.trim() : ""))
          .filter((name) => name.length > 0)
          .slice(0, 6)
      : [];

  const base = [
    "You are generating a PNG image for a Hungarian nature guide app.",
    "High priority: accuracy, recognizability, consistency, educational natural-history illustration (not artistic).",
    "",
    `Style family: ${input.styleFamily}`,
    `Variant: ${input.variant}`,
    `Entity type: ${input.entityType}`,
    `Entity slug: ${input.entitySlug}`,
    input.seed !== undefined ? `Seed (best-effort): ${input.seed ?? "null"}` : "",
    "",
    "Constraints / negatives:",
    "- NO photograph, NO hyperrealism, NO 3D render, NO CGI, NO game art, NO cartoon, NO anime, NO fantasy.",
    "- NO watermark, NO text, NO labels.",
    "- Do NOT invent anatomy or extra limbs.",
    input.entityType !== "bird"
      ? "- Do NOT include birds/animals unless explicitly requested by the structured JSON hints."
      : "",
    input.entityType === "place" && input.variant === "place_hero_spring_v1"
      ? requestedBirdsPayload?.mode === "specific" && requestedBirdNamesHu.length
        ? `- Requested birds (include a few, small and distant): ${requestedBirdNamesHu.join(", ")}.`
        : "- Requested birds: include 1-3 small, distant generic birds (do not depict an identifiable species if none is specified)."
      : "",
    "",
    "Variant rules:",
    input.styleFamily === "scientific"
      ? [
          "- Natural history plate / scientific illustration style.",
          "- Background: very light, neutral, slightly textured paper feel.",
          "- Colors: soft natural palette (muted greens/browns/beige/greys). Avoid neon/vibrant digital colors.",
          input.entityType === "bird"
            ? "- Bird: full body visible, mostly side view, mild perspective, no extreme distortion."
            : "- Place: realistic habitat / landscape depiction; no maps, no UI, no text; keep it credible.",
          input.variant === "main_habitat"
             ? "- main_habitat: include only a subtle habitat hint (e.g., reeds, shallow water, grass clumps, branch). Keep background simple."
             : "",
           input.variant === "place_hero_spring_v1"
             ? "- place_hero_spring_v1: spring highlight moment for the place; realistic, scientific illustration feel; wide scenic composition; no people; no buildings unless clearly implied by the place metadata; no animals unless requested."
             : "",
           input.variant === "flight_clean"
              ? "- flight_clean: clean neutral background, bird in flight, wings fully visible, wing structure readable."
             : "",
          input.variant === "nesting_clean"
             ? "- nesting_clean: bird at nest with chicks visible if possible; natural scene, not cartoonish."
             : "",
        ]
          .filter(Boolean)
          .join("\n")
      : [
          "- Minimal flat icon illustration.",
          "- Full body, centered, side view, simple geometric shapes.",
          "- 3-5 flat colors maximum. No gradients, no texture, no shadows.",
          "- Background: none / transparent.",
          "- Species should remain recognizable (bill/leg/neck proportions).",
        ].join("\n"),
    "",
    "Structured hints (JSON):",
    JSON.stringify(input.promptPayload ?? null),
  ]
    .filter(Boolean)
    .join("\n");

  return base;
}

type OpenAIImagesGenerationResponse = {
  data?: Array<{ b64_json?: string; url?: string }>;
};

export class OpenAIImageProvider implements ImageProvider {
  async generate(input: GenerateImageInput): Promise<GeneratedImage> {
    const prompt = buildOpenAIPrompt(input);
    const { width, height } = parseSizePx(IMAGE_SIZE);

    const background =
      input.styleFamily === "iconic" ? "transparent" : "opaque";

    const quality = (IMAGE_QUALITY ?? "auto").toLowerCase();
    const qualityParam =
      quality === "low" || quality === "medium" || quality === "high"
        ? quality
        : undefined;

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_MODEL_IMAGE,
        prompt,
        n: 1,
        size: IMAGE_SIZE,
        background,
        output_format: "png",
        ...(qualityParam ? { quality: qualityParam } : {}),
      }),
    });

    if (!response.ok) {
      const message = await response.text().catch(() => "");
      throw new Error(
        `OpenAI images generation failed (${response.status} ${response.statusText}): ${message}`
      );
    }

    const payload = (await response.json()) as OpenAIImagesGenerationResponse;
    const b64 = payload?.data?.[0]?.b64_json;

    if (!b64 || typeof b64 !== "string") {
      throw new Error("OpenAI images generation did not return b64_json.");
    }

    return {
      buffer: Buffer.from(b64, "base64"),
      mimeType: "image/png",
      widthPx: width,
      heightPx: height,
      seed: input.seed ?? null,
      providerModel: AI_MODEL_IMAGE,
    };
  }
}

let cachedProvider: ImageProvider | null = null;

export function getImageProvider(): ImageProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  const providerName = (IMAGE_PROVIDER ?? "stub").toLowerCase();

  if (providerName === "stub") {
    cachedProvider = new LocalStubImageProvider();
    return cachedProvider;
  }

  if (providerName === "openai") {
    cachedProvider = new OpenAIImageProvider();
    return cachedProvider;
  }

  throw new Error(
    `IMAGE_PROVIDER=${providerName} is not implemented yet. Use IMAGE_PROVIDER=stub for now.`
  );
}
