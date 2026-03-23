import { NextResponse } from "next/server";
import OpenAI from "openai";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getAdminUserFromCookies } from "@/lib/auth";
import { SpiritDraftResponseSchema } from "@/lib/spiritDraftSchema";
import { validateSpiritLibrary } from "@/lib/spiritSchema";

const LIBRARY_PATH = join(process.cwd(), "data", "spirit", "library.json");

type Payload = {
  title: string;
  author: string;
  publisher?: string | null;
};

function extractJson(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON found in model output");
  }
  return JSON.parse(text.slice(start, end + 1));
}

export async function POST(request: Request) {
  const admin = await getAdminUserFromCookies();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!payload.title || !payload.author) {
    return NextResponse.json({ error: "Title and author required" }, { status: 400 });
  }

  const searchModel = process.env.SPIRIT_SEARCH_MODEL;
  const aiModel = process.env.SPIRIT_AI_MODEL;
  const apiKey = process.env.OPENAI_API_KEY;

  if (!searchModel || !aiModel || !apiKey) {
    return NextResponse.json({ error: "Missing OpenAI env config" }, { status: 500 });
  }

  const raw = await readFile(LIBRARY_PATH, "utf-8");
  const parsed = JSON.parse(raw);
  const library = validateSpiritLibrary(parsed);

  const client = new OpenAI({ apiKey });

  const searchPrompt = `Find reliable public references for the book below. Return JSON only with keys: \n` +
    `identified_title, identified_author, language, format, tradition, short_summary, sources (array of {title, url}).\n` +
    `If uncertain, set fields to null and include a warning in short_summary.\n\n` +
    `Input: title="${payload.title}", author="${payload.author}", publisher="${payload.publisher ?? ""}".`;

  const searchResponse = await client.responses.create({
    model: searchModel,
    tools: [{ type: "web_search" }],
    input: searchPrompt,
  });

  const searchText = (searchResponse as any).output_text ?? "";
  const searchJson = extractJson(searchText);

  const draftPrompt = `You are drafting a curated spiritual book entry. Output JSON only, with schema: ` +
    `{ draft: { id, title, author, tradition, level, summary_short, recommendation, themes, language, format, status, summary_long, prerequisites, cautions, tags, notes, year, related }, confidence, warnings, uncertain_fields, sources }.` +
    `\nRules: use only existing themes, no new slugs. status must be "olvasatlan". ` +
    `Do not invent facts; if uncertain, add warnings + uncertain_fields. ` +
    `Prerequisites must be decided (not always []).` +
    `Style: objective, non-marketing.\n\n` +
    `Existing themes: ${library.thematic_pills.map((p) => `${p.slug} (${p.label})`).join(", ")}\n` +
    `Existing books (for related suggestions): ${library.books.map((b) => `${b.id}|${b.title}|${b.author}|${b.tradition}|${b.level}|${b.themes.join("/")}`).slice(0, 80).join("; ")}\n\n` +
    `Search evidence: ${JSON.stringify(searchJson)}\n`;

  const draftResponse = await client.responses.create({
    model: aiModel,
    input: draftPrompt,
  });

  const draftText = (draftResponse as any).output_text ?? "";
  const draftJson = extractJson(draftText);

  const parsedDraft = SpiritDraftResponseSchema.parse(draftJson);

  return NextResponse.json(parsedDraft);
}
