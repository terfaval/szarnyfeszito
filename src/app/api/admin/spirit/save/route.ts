import { NextResponse } from "next/server";
import { readFile, writeFile, rename } from "node:fs/promises";
import { join } from "node:path";
import { getAdminUserFromCookies } from "@/lib/auth";
import { SpiritDraftSchema } from "@/lib/spiritDraftSchema";
import { validateSpiritLibrary } from "@/lib/spiritSchema";

const LIBRARY_PATH = join(process.cwd(), "data", "spirit", "library.json");

const FORBIDDEN = ["TBD", "TODO", "..."];
const SLUG_RE = /^[a-z0-9_]+$/;

function hasForbidden(value?: string | null) {
  if (!value) return false;
  return FORBIDDEN.some((token) => value.includes(token));
}

function normalizeDraft(draft: any) {
  const cleaned = { ...draft };
  if (!cleaned.year) delete cleaned.year;
  if (Array.isArray(cleaned.prerequisites) && cleaned.prerequisites.length === 0) delete cleaned.prerequisites;
  if (Array.isArray(cleaned.related) && cleaned.related.length === 0) delete cleaned.related;
  if (Array.isArray(cleaned.tags) && cleaned.tags.length === 0) delete cleaned.tags;
  if (!cleaned.notes) delete cleaned.notes;
  return cleaned;
}

export async function POST(request: Request) {
  const admin = await getAdminUserFromCookies();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  if (!payload?.draft) {
    return NextResponse.json({ error: "Missing draft" }, { status: 400 });
  }

  const draft = SpiritDraftSchema.parse(payload.draft);
  if (!SLUG_RE.test(draft.id)) {
    return NextResponse.json({ error: "Invalid ASCII slug" }, { status: 400 });
  }

  if (hasForbidden(draft.summary_short) || hasForbidden(draft.summary_long) || hasForbidden(draft.recommendation) || hasForbidden(draft.cautions)) {
    return NextResponse.json({ error: "Forbidden placeholder text" }, { status: 400 });
  }

  const raw = await readFile(LIBRARY_PATH, "utf-8");
  const parsed = JSON.parse(raw);
  const library = validateSpiritLibrary(parsed);

  if (library.books.some((book) => book.id === draft.id)) {
    return NextResponse.json({ error: "Duplicate book id" }, { status: 400 });
  }

  const pillSet = new Set(library.thematic_pills.map((pill) => pill.slug));
  const bookSet = new Set(library.books.map((book) => book.id));

  for (const theme of draft.themes) {
    if (!pillSet.has(theme)) {
      return NextResponse.json({ error: `Unknown theme: ${theme}` }, { status: 400 });
    }
  }

  for (const rel of draft.related ?? []) {
    if (!bookSet.has(rel)) {
      return NextResponse.json({ error: `Unknown related id: ${rel}` }, { status: 400 });
    }
  }

  const cleaned = normalizeDraft(draft);
  library.books.push(cleaned);

  const tmp = `${LIBRARY_PATH}.tmp`;
  await writeFile(tmp, JSON.stringify(library, null, 2) + "\n", "utf-8");
  await rename(tmp, LIBRARY_PATH);

  return NextResponse.json({ ok: true, id: draft.id });
}
