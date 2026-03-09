import { randomUUID } from "crypto";
import { ZodError } from "zod";
import { callOpenAIChatCompletion, type OpenAIChatMessage } from "@/lib/openaiClient";
import { AI_MODEL_CHEF, AI_MODEL_TEXT } from "@/lib/aiConfig";
import { extractJsonPayload, AIJsonParseError, AISchemaMismatchError } from "@/lib/aiUtils";
import { hashPrompt } from "@/lib/promptHash";
import { chefRecipeSchemaV1, type ChefRecipeV1 } from "@/lib/chefRecipeSchema";

const SYSTEM_PROMPT = `Te egy precíz séf-asszisztens vagy.
Csak és kizárólag érvényes JSON-t adj vissza (nincs magyarázat, nincs markdown, nincs extra szöveg).

A JSON pontos sémája:
- schema_version: "v1"
- language: "hu"
- title: string
- short_description: string
- servings: integer (>=1)
- cook_time_minutes: integer (>=1)
- ingredients: array of objects:
  - name: string
  - amount: number|null (ha "ízlés szerint" vagy nem számszerű, legyen null)
  - unit: string|null (pl. g, ml, db, tk, ek, csipet; ha nem kell, null)
  - note: string|null (pl. "ízlés szerint", "opcionális")
- steps: string[] (konkrét, lépéses elkészítés)

Követelmények:
- A hozzávalók mennyiségei legyenek skálázhatók: ahol lehet, használd az amount mezőt.
- A lépések legyenek rövidek, sorszámozás nélkül, de logikai sorrendben.
- Élelmiszerbiztonság: nyers hús/tojás esetén röviden utalj a megfelelő átsütésre/áthevítésre egy lépésben.`;

function zodIssuesToStrings(error: ZodError) {
  return error.issues
    .slice(0, 25)
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`);
}

export async function generateChefRecipeV1(args: {
  title: string;
  short_description: string;
  servings: number;
  existing_recipe?: ChefRecipeV1 | null;
  review_note?: string | null;
}): Promise<{
  payload: ChefRecipeV1;
  model: string;
  request_id: string;
  finish_reason: string;
  prompt_hash: string;
}> {
  const requestId = randomUUID();
  const modelId = AI_MODEL_CHEF ?? AI_MODEL_TEXT;

  const userPayload = {
    title: args.title,
    short_description: args.short_description,
    servings: args.servings,
    existing_recipe: args.existing_recipe ?? null,
    review_note: args.review_note ?? null,
  };

  const userMessage = JSON.stringify(userPayload, null, 2);
  const promptHash = hashPrompt(`${SYSTEM_PROMPT}\n\n${userMessage}`);

  const messages: OpenAIChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userMessage },
  ];

  const completion = await callOpenAIChatCompletion({
    model: modelId,
    temperature: 0.2,
    max_tokens: 900,
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

  const rawJson = parsedResult.raw;
  try {
    const payload = chefRecipeSchemaV1.parse(parsedResult.payload);

    if (payload.servings !== args.servings) {
      throw new AISchemaMismatchError(
        [`servings: expected ${args.servings} but got ${payload.servings}`],
        rawJson
      );
    }
    return {
      payload,
      model: modelId,
      request_id: requestId,
      finish_reason: finishReason,
      prompt_hash: promptHash,
    };
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AISchemaMismatchError(zodIssuesToStrings(error), rawJson);
    }
    throw error;
  }
}
