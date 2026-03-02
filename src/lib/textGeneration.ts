import { Bird } from "@/types/bird";
import { FeatureBlock, GeneratedContent } from "@/types/content";
import { callOpenAIChatCompletion } from "@/lib/openaiClient";
import { extractJsonPayload } from "@/lib/aiUtils";
import { AI_MODEL_TEXT } from "@/lib/config";

const SYSTEM_PROMPT =
  "You are writing structured Szarnyfeszito bird narratives for the Admin dashboard. Respond only with valid JSON that includes the keys short, long, feature_block, did_you_know, and ethics_tip. The feature_block value must be an array of objects with heading and content string fields. Do not add commentary outside the JSON.";

export function getTextModelName() {
  return AI_MODEL_TEXT;
}

export function getTextModelId() {
  return AI_MODEL_TEXT;
}

function normalizeFeatureBlock(input: unknown): FeatureBlock[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((entry): FeatureBlock | null => {
      if (typeof entry !== "object" || entry === null) {
        return null;
      }

      const candidate = entry as Record<string, unknown>;
      const heading =
        typeof candidate.heading === "string" ? candidate.heading.trim() : "";
      const content =
        typeof candidate.content === "string" ? candidate.content.trim() : "";

      if (!heading && !content) {
        return null;
      }

      return { heading, content };
    })
    .filter((block): block is FeatureBlock => Boolean(block));
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function generateBirdContent(bird: Bird): Promise<GeneratedContent> {
  const modelId = getTextModelId();
  const completion = await callOpenAIChatCompletion({
    model: modelId,
    temperature: 0.2,
    max_tokens: 600,
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: `Generate a short narrative for the bird with slug "${bird.slug}", Hungarian name "${bird.name_hu}", and Latin name "${bird.name_latin ?? "pending"}". Keep the short version as a 1-2 sentence highlight, the long version as two paragraphs with texture about habitat and behavior, the feature_block as three bullet-like entries, and the did_you_know plus ethics_tip as short wrap-ups. Always output exactly the JSON described.`,
      },
    ],
  });

  const rawContent = completion.choices?.[0]?.message?.content ?? "";
  const parsedResult = extractJsonPayload(rawContent);

  if (!parsedResult.success) {
    throw new Error("OpenAI response could not be parsed as JSON.");
  }

  const parsed = parsedResult.payload;

  const short = asString(parsed.short);
  const long = asString(parsed.long);
  const did_you_know = asString(parsed.did_you_know);
  const ethics_tip = asString(parsed.ethics_tip);
  const feature_block = normalizeFeatureBlock(parsed.feature_block);

  if (!short || !long) {
    throw new Error(
      "OpenAI response omitted required short or long narratives."
    );
  }

  return {
    short,
    long,
    feature_block,
    did_you_know,
    ethics_tip,
    version: `${AI_MODEL_TEXT}:${bird.slug}`,
  };
}
