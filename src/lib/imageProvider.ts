import { IMAGE_PROVIDER } from "@/lib/config";
import type { ImageStyleFamily, ImageVariant } from "@/types/image";

export type GenerateImageInput = {
  birdId: string;
  birdSlug: string;
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

  throw new Error(
    `IMAGE_PROVIDER=${providerName} is not implemented yet. Use IMAGE_PROVIDER=stub for now.`
  );
}

