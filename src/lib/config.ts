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

export const OPENAI_API_KEY = requiredEnv("OPENAI_API_KEY");
export const AI_MODEL_TEXT = requiredEnv("AI_MODEL_TEXT");
export const AI_MODEL_IMAGE = requiredEnv("AI_MODEL_IMAGE");
export const SUPABASE_URL = requiredEnv("SUPABASE_URL");
export const SUPABASE_SERVICE_ROLE_KEY = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
export const ADMIN_EMAIL = optionalEnv("ADMIN_EMAIL", "") ?? "";
export const ADMIN_EMAIL_LOWERCASE = ADMIN_EMAIL.toLowerCase();
export const SUPABASE_IMAGE_BUCKET =
  optionalEnv("SUPABASE_IMAGE_BUCKET", "bird-images") ?? "bird-images";
export const NODE_ENV = process.env.NODE_ENV?.trim() || "development";
export const IS_PRODUCTION = NODE_ENV === "production";
