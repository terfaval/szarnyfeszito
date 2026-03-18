import { randomUUID } from "crypto";
import { z, ZodError } from "zod";
import { callOpenAIChatCompletion, type OpenAIChatMessage } from "@/lib/openaiClient";
import { AI_MODEL_TEXT } from "@/lib/aiConfig";
import { extractJsonPayload, AIJsonParseError, AISchemaMismatchError } from "@/lib/aiUtils";
import { hashPrompt } from "@/lib/promptHash";
import { phenomenonUiVariantsSchemaV1 } from "@/lib/phenomenonContentSchema";
import type { PhenomenonSeason } from "@/types/phenomenon";

const phenomenonDraftSchemaV1 = z
  .object({
    schema_version: z.literal("phenomenon_draft_v1"),
    language: z.literal("hu"),
    phenomenon: z.object({
      title: z.string().trim().min(1),
    }),
    content: phenomenonUiVariantsSchemaV1,
    suggested_birds: z
      .array(
        z.object({
          name_hu: z.string().trim().min(1),
        })
      )
      .max(12),
  })
  .catchall(z.unknown());

export type PhenomenonDraftV1 = z.infer<typeof phenomenonDraftSchemaV1>;

const SYSTEM_PROMPT = `You are an editorial assistant for Szarnyfeszito phenomena.
Return JSON only (no markdown, no explanation).

Task:
- Write Hungarian UI variants for a place-based seasonal phenomenon using the discovery draft provided.
- The discovery draft is the source of truth for type and timing. Do not invent timing.
- Keep the copy realistic and safe. Avoid exact coordinates, sensitive nesting info, or rare bait.

Bird suggestions:
- Provide 0-12 Hungarian bird names in "suggested_birds". If unsure, return empty list.

Output JSON schema:
{
  "schema_version": "phenomenon_draft_v1",
  "language": "hu",
  "phenomenon": {
    "title": string
  },
  "content": {
    "schema_version": "phenomenon_ui_variants_v1",
    "language": "hu",
    "variants": {
      "teaser": string,
      "short": string,
      "long": string,
      "spectacular_moment": string,
      "timing": string,
      "how_to_watch": string,
      "what_to_look_for": string,
      "ethics_tip": string,
      "did_you_know": string
    }
  },
  "suggested_birds": [{"name_hu": string}]
}`;

function zodIssuesToStrings(error: ZodError) {
  return error.issues.slice(0, 25).map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`);
}

export async function generatePhenomenonDraftV1(args: {
  region_name: string;
  region_id: string;
  season: PhenomenonSeason;
  discovery: {
    phenomenon_type: string;
    typical_start_mmdd: string;
    typical_end_mmdd: string;
    why_here: string;
    why_now: string;
  };
  admin_description?: string | null;
  existing_payload?: unknown | null;
  review_note?: string | null;
}): Promise<{
  payload: PhenomenonDraftV1;
  model: string;
  request_id: string;
  finish_reason: string;
  prompt_hash: string;
}> {
  const requestId = randomUUID();
  const modelId = AI_MODEL_TEXT;

  const userMessage = JSON.stringify(
    {
      region: {
        region_id: args.region_id,
        name: args.region_name,
      },
      season: args.season,
      discovery: args.discovery,
      admin_description: args.admin_description ?? null,
      existing_payload: args.existing_payload ?? null,
      review_note: args.review_note ?? null,
    },
    null,
    2
  );

  const promptHash = hashPrompt(`${SYSTEM_PROMPT}\n\n${userMessage}`);
  const messages: OpenAIChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userMessage },
  ];

  const completion = await callOpenAIChatCompletion({
    model: modelId,
    temperature: 0.2,
    max_tokens: 1900,
    messages,
  });

  const finishReason = completion.choices?.[0]?.finish_reason ?? "unknown";
  const rawContent = completion.choices?.[0]?.message?.content ?? "";
  const parsedResult = extractJsonPayload(rawContent);

  if (!parsedResult.success) {
    throw new AIJsonParseError(
      requestId,
      modelId,
      parsedResult.error.reason,
      parsedResult.error.raw_head,
      parsedResult.error.raw_tail,
      finishReason
    );
  }

  try {
    const payload = phenomenonDraftSchemaV1.parse(parsedResult.payload);
    const modelName = completion.model ?? modelId;
    return {
      payload,
      model: modelName,
      request_id: requestId,
      finish_reason: finishReason,
      prompt_hash: promptHash,
    };
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AISchemaMismatchError(zodIssuesToStrings(error), parsedResult.raw);
    }
    throw error;
  }
}

