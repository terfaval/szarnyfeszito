function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Environment variable ${name} is required but missing or empty.`);
  }
  return value;
}

function optionalEnv(name: string, fallback: string | null = null): string | null {
  const value = process.env[name]?.trim();
  if (value) {
    return value;
  }
  return fallback;
}

function enumEnv<T extends readonly string[]>(
  name: string,
  allowed: T,
  fallback: T[number]
): T[number] {
  const raw = optionalEnv(name, fallback) ?? fallback;
  if ((allowed as readonly string[]).includes(raw)) {
    return raw as T[number];
  }
  throw new Error(`Environment variable ${name} must be one of: ${allowed.join(", ")}.`);
}

export const OPENAI_API_KEY = requiredEnv("OPENAI_API_KEY");
export const AI_MODEL_TEXT = requiredEnv("AI_MODEL_TEXT");
export const AI_MODEL_IMAGE = requiredEnv("AI_MODEL_IMAGE");
export const SUPABASE_URL = requiredEnv("SUPABASE_URL");
export const SUPABASE_SERVICE_ROLE_KEY = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
export const ADMIN_EMAIL = optionalEnv("ADMIN_EMAIL", "") ?? "";
export const ADMIN_EMAIL_LOWERCASE = ADMIN_EMAIL.toLowerCase();
export const SUPABASE_IMAGE_BUCKET =
  optionalEnv("SUPABASE_IMAGE_BUCKET", "bird-images") ?? "bird-images";

export const IMAGE_PROVIDER = optionalEnv("IMAGE_PROVIDER", "stub") ?? "stub";

export const IMAGE_STYLE_CONFIG_ID_SCIENTIFIC =
  optionalEnv("IMAGE_STYLE_CONFIG_ID_SCIENTIFIC", "scientific_v1") ?? "scientific_v1";

export const IMAGE_STYLE_CONFIG_ID_ICONIC =
  optionalEnv("IMAGE_STYLE_CONFIG_ID_ICONIC", "iconic_v1") ?? "iconic_v1";

export const IMAGE_SIZE = optionalEnv("IMAGE_SIZE", "1024x1024") ?? "1024x1024";
export const IMAGE_QUALITY = optionalEnv("IMAGE_QUALITY", "auto") ?? "auto";

// Controls whether Science Dossier + Visual Brief are used as prompt inputs during image generation.
// - off: do not use (default; keeps the pipeline simpler while tuning style)
// - auto: generate drafts if missing and use them
// - approved: use only if approved records exist (no auto-generation)
export const IMAGE_ACCURACY_INPUTS =
  optionalEnv("IMAGE_ACCURACY_INPUTS", "off") ?? "off";

// D26 distribution region catalog source:
// - supabase: read from distribution_region_catalog_items only (recommended for large catalogs)
// - repo: read from data/distribution-region-catalog only
// - auto: repo first, fallback to supabase
export const DISTRIBUTION_REGION_CATALOG_SOURCE = enumEnv(
  "DISTRIBUTION_REGION_CATALOG_SOURCE",
  ["supabase", "repo", "auto"] as const,
  "supabase"
);
export const NODE_ENV = process.env.NODE_ENV?.trim() || "development";
export const IS_PRODUCTION = NODE_ENV === "production";
export const APP_URL = optionalEnv("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000";
