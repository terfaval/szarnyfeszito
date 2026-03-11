import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { getAdminUserFromCookies } from "@/lib/auth";
import { AI_MODEL_TEXT } from "@/lib/aiConfig";
import { extractJsonPayload, AIJsonParseError, AISchemaMismatchError } from "@/lib/aiUtils";
import { callOpenAIChatCompletion, type OpenAIChatMessage } from "@/lib/openaiClient";
import { hashPrompt } from "@/lib/promptHash";

const latinLookupSchemaV1 = z
  .object({
    schema_version: z.literal("bird_latin_lookup_v1"),
    language: z.literal("hu"),
    name_hu: z.string().trim().min(1),
    name_latin: z.string().trim().min(1).nullable(),
    confidence: z.enum(["high", "medium", "low"]),
    rationale: z.string().trim().min(1),
  })
  .catchall(z.unknown());

function zodIssuesToStrings(error: ZodError) {
  return error.issues
    .slice(0, 25)
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`);
}

const SYSTEM_PROMPT = `Te egy madarász-szerkesztői asszisztens vagy a Szárnyfeszítő Bird modulhoz.
Csak és kizárólag érvényes JSON-t adj vissza (nincs magyarázat, nincs markdown, nincs extra szöveg).

Feladat:
- A megadott magyar madárnévhez add vissza a legvalószínűbb latin (binominális) fajnevet.

Stop rules:
- Ha nem vagy biztos (több jelölt / homonímia / bizonytalan fordítás), akkor \`name_latin\` legyen null és \`confidence\` legyen "low".
- Ne találj ki latin nevet bizonytalanság esetén.

Output JSON sémája pontosan:
{
  "schema_version": "bird_latin_lookup_v1",
  "language": "hu",
  "name_hu": string,
  "name_latin": string | null,
  "confidence": "high" | "medium" | "low",
  "rationale": string
}`;

export async function POST(request: Request) {
  const user = await getAdminUserFromCookies();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const nameHu = typeof body?.name_hu === "string" ? body.name_hu.trim() : "";

  if (!nameHu) {
    return NextResponse.json({ error: "name_hu is required." }, { status: 400 });
  }

  const userPayload = { name_hu: nameHu };
  const userMessage = JSON.stringify(userPayload, null, 2);
  const promptHash = hashPrompt(`${SYSTEM_PROMPT}\n\n${userMessage}`);

  const messages: OpenAIChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userMessage },
  ];

  try {
    const completion = await callOpenAIChatCompletion({
      model: AI_MODEL_TEXT,
      temperature: 0.1,
      max_tokens: 220,
      messages,
    });

    const requestId = completion.id ?? "unknown";
    const finishReason = completion.choices?.[0]?.finish_reason ?? "unknown";
    const rawContent = completion.choices?.[0]?.message?.content ?? "";
    const parsedResult = extractJsonPayload(rawContent);

    if (!parsedResult.success) {
      throw new AIJsonParseError(
        requestId,
        AI_MODEL_TEXT,
        parsedResult.error.reason,
        parsedResult.error.raw_head,
        parsedResult.error.raw_tail,
        finishReason
      );
    }

    const rawJson = parsedResult.raw;
    const payload = latinLookupSchemaV1.parse(parsedResult.payload);

    if (!payload.name_latin || payload.confidence === "low") {
      return NextResponse.json(
        {
          error: "Latin lookup is uncertain.",
          confidence: payload.confidence,
          rationale: payload.rationale,
          model: AI_MODEL_TEXT,
          request_id: requestId,
          finish_reason: finishReason,
          prompt_hash: promptHash,
        },
        { status: 422 }
      );
    }

    return NextResponse.json(
      {
        data: {
          name_hu: payload.name_hu,
          name_latin: payload.name_latin,
          confidence: payload.confidence,
          rationale: payload.rationale,
          model: AI_MODEL_TEXT,
          request_id: requestId,
          finish_reason: finishReason,
          prompt_hash: promptHash,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof AIJsonParseError) {
      const debugAI = process.env.DEBUG_AI === "true";
      const payload: Record<string, unknown> = {
        error: error.message,
        error_code: "AI_JSON_PARSE_FAILED",
        model: error.model,
        request_id: error.requestId,
        reason: error.reason,
        finish_reason: error.finishReason ?? "unknown",
      };

      if (debugAI) {
        payload.raw_head = error.rawHead;
        payload.raw_tail = error.rawTail;
      }

      return NextResponse.json(payload, { status: 502 });
    }

    if (error instanceof AISchemaMismatchError) {
      const debugAI = process.env.DEBUG_AI === "true";
      const payload: Record<string, unknown> = {
        error: error.message,
        error_code: error.errorCode,
        issues: error.issues,
        model: AI_MODEL_TEXT,
      };

      if (debugAI) {
        payload.raw_json = error.rawJson;
      }

      return NextResponse.json(payload, { status: 502 });
    }

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Latin lookup validation failed.", issues: zodIssuesToStrings(error), model: AI_MODEL_TEXT },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { error: (error as Error)?.message ?? "Unable to look up Latin name." },
      { status: 502 }
    );
  }
}
