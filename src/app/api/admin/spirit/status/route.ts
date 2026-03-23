import { NextResponse } from "next/server";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getAdminUserFromCookies } from "@/lib/auth";
import { SpiritStatusEnum, validateSpiritLibrary } from "@/lib/spiritSchema";

const LIBRARY_PATH = join(process.cwd(), "data", "spirit", "library.json");

type Payload = {
  bookId: string;
  status?: string;
  notes?: string;
};

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
  const hasStatus = typeof payload.status !== "undefined";
  const hasNotes = typeof payload.notes !== "undefined";

  if (!payload.bookId || (!hasStatus && !hasNotes)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const statusParse = hasStatus ? SpiritStatusEnum.safeParse(payload.status) : null;
  if (hasStatus && !statusParse?.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (hasNotes && typeof payload.notes !== "string") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const raw = await readFile(LIBRARY_PATH, "utf-8");
  const parsed = JSON.parse(raw);
  const library = validateSpiritLibrary(parsed);

  const book = library.books.find((item) => item.id === payload.bookId);
  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  if (statusParse?.success) {
    if (statusParse?.success) {
    book.status = statusParse.data;
  }
  if (typeof payload.notes === "string") {
    book.notes = payload.notes;
  }
  }

  if (typeof payload.notes !== "undefined") {
    const trimmed = payload.notes.trim();
    if (trimmed) {
      book.notes = trimmed;
    } else {
      delete book.notes;
    }
  }

  await writeFile(LIBRARY_PATH, JSON.stringify(library, null, 2) + "\n", "utf-8");

  return NextResponse.json({ ok: true, status: book.status, notes: book.notes ?? "" });
}
