import {
  IMAGE_PROVIDER,
  IMAGE_QUALITY,
  IMAGE_SIZE,
  IMAGE_SIZE_PLACE_HERO,
} from "@/lib/config";
import { AI_MODEL_IMAGE, OPENAI_API_KEY } from "@/lib/aiConfig";
import type { ImageStyleFamily, ImageVariant } from "@/types/image";

export type GenerateImageInput = {
  entityType: "bird" | "place" | "phenomenon" | "habitat_stock_asset";
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

function normalizeOpenAIImageSize(size: string) {
  const value = size.trim().toLowerCase();
  if (value === "auto") return "auto";

  if (
    value === "1024x1024" ||
    value === "1024x1536" ||
    value === "1536x1024"
  ) {
    return value;
  }

  // Backward-compatible mapping: OpenAI no longer accepts 1792x1024 / 1024x1792.
  if (value === "1792x1024") return "1536x1024";
  if (value === "1024x1792") return "1024x1536";

  const parsed = parseSizePx(value);
  if (!parsed.width || !parsed.height) return "1024x1024";

  if (parsed.width > parsed.height) return "1536x1024";
  if (parsed.height > parsed.width) return "1024x1536";
  return "1024x1024";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function asTrimmedStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0)
    .slice(0, 12);
}

type HabitatTileCategoryKey =
  | "water_lakes_v1"
  | "water_rivers_v1"
  | "wetlands_v1"
  | "forest_edge_v1"
  | "grassland_v1"
  | "farmland_v1"
  | "mountains_v1"
  | "urban_park_v1"
  | "urban_waterfront_v1";

const HABITAT_TILE_MOTIF_BY_KEY: Record<HabitatTileCategoryKey, string> = {
  water_lakes_v1:
    "a calm freshwater lake or fishpond with a gentle shoreline, a few reed clumps, still water shapes, and a distant tree line",
  water_rivers_v1:
    "a meandering river with a smooth flowing ribbon of water, grassy banks, and a gentle bend as the main focal shape",
  wetlands_v1:
    "a flat wetland marsh with reeds and sedges, shallow water patches, and a few simple mudflat shapes near the water edge",
  forest_edge_v1:
    "a clear forest-edge boundary: layered tree silhouettes meeting an open meadow, with a simple transition line",
  grassland_v1:
    "open grassland / puszta with wide sky, low horizon, and a few large grass tuft shapes (no flowers, no tiny details)",
  farmland_v1:
    "quiet agricultural fields as a simple patchwork of broad shapes, with a subtle hedgerow line (no buildings, no machinery)",
  mountains_v1:
    "layered low mountains or hills with a few rounded ridgelines and a simple rocky outcrop silhouette (no snow, no sharp cliffs)",
  urban_park_v1:
    "an urban park mood with trimmed lawn shapes, a gentle curved walkway, and a few rounded tree canopies (no benches, no buildings)",
  urban_waterfront_v1:
    "a calm urban waterfront with flat water shapes and a simple embankment/promenade line (no boats, no bridges, no buildings)",
};

const HABITAT_TILE_MOTIF_BY_PLACE_TYPE: Record<string, string> = {
  lake: "a calm freshwater lake with a gentle shoreline and a few reed clumps",
  fishpond: "a calm fishpond with still water shapes and simple shoreline reeds",
  reservoir: "a calm reservoir lake with still water and a distant tree line silhouette",
  river: "a meandering river with a smooth flowing ribbon of water as the main focal shape",
  marsh: "a flat marsh with reeds, sedges, and shallow water patches",
  reedbed: "a reedbed wetland with tall reed masses and shallow water patches",
  salt_lake: "a flat saline wetland with shallow water patches and pale shoreline shapes",
  forest_edge: "a forest-edge boundary where tree silhouettes meet an open meadow",
  grassland: "open grassland with low horizon and a few broad grass tuft shapes",
  farmland: "quiet agricultural fields as a broad patchwork of simple shapes",
  mountain_area: "layered low mountains or hills with rounded ridgelines",
  urban_park: "an urban park mood with trimmed lawns and a gentle curved walkway",
  urban_waterfront: "a calm urban waterfront with water shapes and a simple embankment line",
};

function buildHabitatTileMotif(args: {
  key: string | null;
  labelHu: string | null;
  placeTypes: string[];
}): string {
  if (args.key && args.key in HABITAT_TILE_MOTIF_BY_KEY) {
    return HABITAT_TILE_MOTIF_BY_KEY[args.key as HabitatTileCategoryKey];
  }

  const byType = args.placeTypes
    .map((t) => HABITAT_TILE_MOTIF_BY_PLACE_TYPE[t])
    .filter(Boolean);

  if (byType.length) return byType[0];
  if (args.labelHu) return `a calm landscape tile representing: ${args.labelHu}`;
  return "a calm natural landscape habitat scene";
}

// Habitat tiles are meant to read as a single consistent "set". To prevent category-to-category drift,
// keep *all* rendering instructions centralized here and keep category logic limited to the motif only.
// Separation contract:
// - Global style: how it is rendered (vector-like, shapes, detail level).
// - Global composition: how the square tile is framed and layered.
// - Category subject: what the scene depicts (motif/content only).
// - Negatives: what must never appear in habitat tiles.
const HABITAT_TILE_CONSISTENCY_LOCK = [
  "- IMPORTANT CONSISTENCY LOCK: every habitat tile must share the same visual language across categories.",
  "- Keep the same flat, vector-like storybook landscape style across all tiles; only the motif/content changes.",
].join("\n");

const HABITAT_TILE_STYLE_CORE = [
  "- Flat vector-like landscape illustration (calm storybook mood).",
  "- Rounded organic shapes; clean readable silhouettes; large simple forms.",
  "- Soft layered depth using overlapping flat forms (foreground / midground / background).",
  "- Minimal internal detail (no tiny decorations, no leaves/grass blades).",
  "- Matte flat fills only: no gradients, no texture, no shading, no lighting effects.",
].join("\n");

/*
const HABITAT_TILE_COMPOSITION_CORE = [
  \"- Square 1:1 tile, full-bleed (fill the whole frame). No border, no frame, no vignette.\",
  \"- Composition: 2–4 big layers (sky + land + 1–2 feature layers). Keep a clear horizon / read direction.\",
  \"- Make the main habitat feature obvious at thumbnail size (simple silhouette and big shapes).\",\
].join("\n");

const HABITAT_TILE_COLOR_CORE = [
  \"- Limited harmonious palette: 4–6 colors total, muted natural tones, consistent saturation across tiles.\",
  \"- Avoid neon/vibrant digital colors. Avoid high contrast micro-accents.\",
].join("\n");

const HABITAT_TILE_NEGATIVE_CORE = [
  \"- NO birds, NO people, NO animals (including fish/insects), NO tracks, NO droppings.\",
  \"- NO text, NO labels, NO symbols, NO icons, NO signs, NO logos, NO watermarks.\",
  \"- NO photorealism, NO 3D, NO glossy icon style, NO CGI.\",
  \"- NO painterly rendering, NO brush strokes, NO watercolor, NO heavy texture.\",
  \"- NO clutter, NO busy scenes, NO tiny decorative detail.\",
].join("\n");

*/

const HABITAT_TILE_COMPOSITION_CORE = [
  "- Square 1:1 tile, full-bleed (fill the whole frame). No border, no frame, no vignette.",
  "- Composition: 2-4 big layers (sky + land + 1-2 feature layers). Keep a clear horizon / read direction.",
  "- Make the main habitat feature obvious at thumbnail size (simple silhouette and big shapes).",
].join("\n");

const HABITAT_TILE_COLOR_CORE = [
  "- Limited harmonious palette: 4-6 colors total, muted natural tones, consistent saturation across tiles.",
  "- Avoid neon/vibrant digital colors. Avoid high contrast micro-accents.",
].join("\n");

const HABITAT_TILE_NEGATIVE_CORE = [
  "- NO birds, NO people, NO animals (including fish/insects), NO tracks, NO droppings.",
  "- NO text, NO labels, NO symbols, NO icons, NO signs, NO logos, NO watermarks.",
  "- NO photorealism, NO 3D, NO glossy icon style, NO CGI.",
  "- NO painterly rendering, NO brush strokes, NO watercolor, NO heavy texture.",
  "- NO clutter, NO busy scenes, NO tiny decorative detail.",
].join("\n");

function buildHabitatTileSubjectPrompt(promptPayload: Record<string, unknown>): string {
  const habitat = isRecord(promptPayload.habitat_stock_asset)
    ? (promptPayload.habitat_stock_asset as Record<string, unknown>)
    : null;

  const key = habitat ? asTrimmedString(habitat.key) : null;
  const labelHu = habitat ? asTrimmedString(habitat.label_hu) : null;
  const placeTypes = habitat ? asTrimmedStringArray(habitat.place_types) : [];

  const motif = buildHabitatTileMotif({ key, labelHu, placeTypes });

  // Category subject (content only): must describe only "what is depicted" and never "how it is rendered".
  return [
    "Habitat motif / subject (content only; do NOT change rendering style based on this):",
    `- Depict: ${motif}.`,
    placeTypes.length ? `- Place types hint: ${placeTypes.join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join("\n");
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

  const nestingParentSexHint = (() => {
    if (input.entityType !== "bird" || input.variant !== "nesting_clean") return null;

    const visualBrief = (input.promptPayload as { visual_brief?: unknown } | null)
      ?.visual_brief as
      | {
          scientific?: {
            nesting_clean?: {
              parent_sex_hint?: unknown;
            };
          };
        }
      | undefined;

    const raw = visualBrief?.scientific?.nesting_clean?.parent_sex_hint;
    if (raw === "female" || raw === "male" || raw === "both" || raw === "none") {
      return raw;
    }
    return null;
  })();

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
    input.entityType === "habitat_stock_asset"
      ? "- Habitat tiles: do NOT include birds, people, or identifiable animals. Environment only."
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
          input.variant === "main_habitat_pair_sexes_v1"
            ? "- main_habitat_pair_sexes_v1: depict two birds of the same species together (male + female). Full bodies visible. Keep it a simple scientific plate with a subtle habitat hint (similar to main_habitat)."
            : "",
           input.variant === "place_hero_spring_v1"
             ? "- place_hero_spring_v1: spring highlight moment for the place; realistic, scientific illustration feel; wide scenic composition; no people; no buildings unless clearly implied by the place metadata; no animals unless requested."
             : "",
          input.variant === "flight_clean"
              ? "- flight_clean: clean neutral background, bird in flight, wings fully visible, wing structure readable."
             : "",
          input.variant === "nesting_clean"
             ? nestingParentSexHint === "none"
               ? "- nesting_clean: nest + chicks only; do NOT depict an adult bird."
               : nestingParentSexHint === "female"
                 ? "- nesting_clean: depict the adult female at the nest (with chicks if possible); natural scene, not cartoonish."
                 : nestingParentSexHint === "male"
                   ? "- nesting_clean: depict the adult male at the nest (with chicks if possible); natural scene, not cartoonish."
                   : nestingParentSexHint === "both"
                     ? "- nesting_clean: depict both parents at/near the nest (with chicks if possible); keep the scene simple; natural, not cartoonish."
                     : "- nesting_clean: bird at nest with chicks visible if possible; natural scene, not cartoonish."
             : "",
        ]
          .filter(Boolean)
          .join("\n")
      : input.variant === "habitat_square_v1"
      ? [
          HABITAT_TILE_CONSISTENCY_LOCK,
          "",
          "Global style (locked):",
          HABITAT_TILE_STYLE_CORE,
          "",
          "Global composition (locked):",
          HABITAT_TILE_COMPOSITION_CORE,
          "",
          "Global color/palette (locked):",
          HABITAT_TILE_COLOR_CORE,
          "",
          "Category subject (motif only):",
          buildHabitatTileSubjectPrompt(input.promptPayload),
          "",
          "Habitat tile negatives (strict):",
          HABITAT_TILE_NEGATIVE_CORE,
        ]
          .filter(Boolean)
          .join("\n")
      : [
          "- Minimal flat icon illustration.",
          "- Full body, centered, side view, simple geometric shapes.",
          "- 3-5 flat colors maximum. No gradients, no texture, no shadows.",
          "- Background: none / transparent.",
          "- IMPORTANT: the bird must be SOLID-FILLED (opaque). Do NOT draw an outline-only / hollow silhouette. No see-through body.",
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
    const rawSize =
      input.entityType === "place" && input.variant === "place_hero_spring_v1"
        ? IMAGE_SIZE_PLACE_HERO
        : IMAGE_SIZE;
    const size = normalizeOpenAIImageSize(rawSize);
    if (size !== rawSize) {
      console.info("[image-gen] normalized size", {
        entity_type: input.entityType,
        entity_id: input.entityId,
        variant: input.variant,
        raw_size: rawSize,
        size,
      });
    }
    const { width, height } = parseSizePx(size);

    const background =
      input.styleFamily === "iconic" && input.variant !== "habitat_square_v1"
        ? "transparent"
        : "opaque";

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
        size,
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
