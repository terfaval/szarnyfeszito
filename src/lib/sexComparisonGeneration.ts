import { z } from "zod";
import type { Bird } from "@/types/bird";
import type { BirdDossier, GenerationMeta } from "@/types/dossier";
import { callOpenAIChatCompletion } from "@/lib/openaiClient";
import { extractJsonPayload } from "@/lib/aiUtils";
import { AI_MODEL_TEXT } from "@/lib/aiConfig";
import { hashPrompt } from "@/lib/promptHash";

const outputSchema = z
  .object({
    summary: z.string().trim().min(1).max(900),
    key_differences: z
      .array(z.string().trim().min(1).max(220))
      .length(3, "Exactly three key differences are required."),
  })
  .strict();

const SYSTEM_PROMPT = `Te egy madarász-szerkesztői asszisztens vagy a Szárnyfeszítő Studio Bird modulhoz.

Feladat: a hím és a nőstény közti különbségeket fogalmazd meg tömören, magyarul, edukatív hangnemben.

Kimenet: csak és kizárólag érvényes JSON. Ne írj magyarázó szöveget a JSON-on kívül.

JSON kulcsok (kötelező):
- summary: 2–4 mondatos, szabad szövegű összefoglaló.
- key_differences: pontosan 3 elemű tömb, mindegyik egy konkrét, rövid különbség (1 mondat).

Szabályok:
- Ne említsd a latin nevet.
- Ha gyenge a dimorfizmus: ezt mondd ki, és a 3 különbség lehet "általában" jellegű, de legyen őszinte (ne találj ki markáns jegyet).
- Ne állíts olyat, ami biztosan nem következik a bemenetből; maradj óvatos, de hasznos.
`;

export function getSexComparisonModelId() {
  return AI_MODEL_TEXT;
}

export async function generateSexComparisonV1(args: {
  bird: Bird;
  dossier: BirdDossier;
  reviewComment?: string | null;
}): Promise<{
  payload: { summary: string; key_differences: [string, string, string] };
  meta: GenerationMeta;
}> {
  const model = getSexComparisonModelId();
  const generated_at = new Date().toISOString();

  const promptBase = {
    schema_version: "sex_comparison_v1",
    language: "hu",
    bird: {
      slug: args.bird.slug,
      name_hu: args.bird.name_hu,
    },
    field_guide_context: {
      signature_trait: args.dossier.signature_trait,
      identification: args.dossier.identification,
      distribution: args.dossier.distribution,
    },
    review_note: args.reviewComment?.trim() || null,
  };

  const userMessage = `Készítsd el a kimeneti JSON-t az alábbi strukturált kontextus alapján:\n\n${JSON.stringify(
    promptBase
  )}`;

  const prompt_hash = hashPrompt(`${SYSTEM_PROMPT}\n\n${userMessage}`);
  const completion = await callOpenAIChatCompletion({
    model,
    temperature: 0.2,
    max_tokens: 480,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
  });

  const raw = completion.choices?.[0]?.message?.content ?? "";
  const parsedResult = extractJsonPayload(raw);
  if (!parsedResult.success) {
    throw new Error("AI response could not be parsed as JSON.");
  }

  const parsed = outputSchema.parse(parsedResult.payload);
  const diffs = parsed.key_differences.map((v) => v.trim()).filter(Boolean);

  if (diffs.length !== 3) {
    throw new Error("AI response did not contain exactly three key differences.");
  }

  const meta: GenerationMeta = {
    model,
    prompt_hash,
    generated_at,
  };

  return {
    payload: {
      summary: parsed.summary.trim(),
      key_differences: [diffs[0], diffs[1], diffs[2]],
    },
    meta,
  };
}
