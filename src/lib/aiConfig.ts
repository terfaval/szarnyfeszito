import { requiredEnv } from "@/lib/env";

// AI config is intentionally split from `src/lib/config.ts` so that non-AI
// routes (e.g. auth/login) do not fail at import-time when OpenAI env vars are
// not configured yet.
export const OPENAI_API_KEY = requiredEnv("OPENAI_API_KEY");
export const AI_MODEL_TEXT = requiredEnv("AI_MODEL_TEXT");
export const AI_MODEL_IMAGE = requiredEnv("AI_MODEL_IMAGE");

