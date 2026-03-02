export type JsonExtractionReason = "no_braces" | "unbalanced" | "json_parse_failed";

export type JsonExtractionError = {
  reason: JsonExtractionReason;
  raw_head: string;
  raw_tail: string;
};

export type JsonExtractionResult =
  | { success: true; payload: Record<string, unknown>; raw: string }
  | { success: false; error: JsonExtractionError };

const SNIPPET_LENGTH = 200;

const snippet = (text: string, length: number) =>
  text.length <= length ? text : `${text.slice(0, length)}...`;

const stripFences = (text: string) => {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return fenceMatch ? fenceMatch[1] : text;
};

const makeError = (reason: JsonExtractionReason, raw: string): JsonExtractionError => ({
  reason,
  raw_head: snippet(raw, SNIPPET_LENGTH),
  raw_tail: snippet(raw.slice(-SNIPPET_LENGTH), SNIPPET_LENGTH),
});

export function extractJsonPayload(raw: string): JsonExtractionResult {
  const cleaned = stripFences(raw);
  const trimmed = cleaned.trim();
  const firstBrace = trimmed.indexOf("{");

  if (firstBrace === -1) {
    return { success: false, error: makeError("no_braces", raw) };
  }

  let braceDepth = 0;
  let inString = false;
  let escapeNext = false;
  let braceStart = -1;

  for (let i = firstBrace; i < trimmed.length; i += 1) {
    const char = trimmed[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === "\\") {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === "{") {
      braceDepth += 1;
      if (braceStart === -1) {
        braceStart = i;
      }
      continue;
    }

    if (char === "}") {
      braceDepth -= 1;
      if (braceDepth === 0 && braceStart !== -1) {
        const candidate = trimmed.slice(braceStart, i + 1);
        try {
          const payload = JSON.parse(candidate);
          return { success: true, payload, raw: candidate };
        } catch {
          return { success: false, error: makeError("json_parse_failed", raw) };
        }
      }

      if (braceDepth < 0) {
        return { success: false, error: makeError("unbalanced", raw) };
      }
    }
  }

  return { success: false, error: makeError("unbalanced", raw) };
}

export class AIJsonParseError extends Error {
  constructor(
    public readonly requestId: string,
    public readonly model: string,
    public readonly reason: JsonExtractionReason,
    public readonly rawHead: string,
    public readonly rawTail: string,
    public readonly finishReason?: string
  ) {
    super(`AI JSON parse failure (${reason})`);
    Object.setPrototypeOf(this, AIJsonParseError.prototype);
  }
}

export class AISchemaMismatchError extends Error {
  public readonly errorCode = "AI_SCHEMA_MISMATCH";

  constructor(
    public readonly issues: string[],
    public readonly rawJson: string
  ) {
    super(
      issues.length
        ? `AI schema mismatch - ${issues.join("; ")}`
        : "AI schema mismatch detected"
    );
    Object.setPrototypeOf(this, AISchemaMismatchError.prototype);
  }
}
