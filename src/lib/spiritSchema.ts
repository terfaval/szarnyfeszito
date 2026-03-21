import { z } from "zod";

export const SpiritTraditionEnum = z.enum(["taoizmus", "buddhizmus", "vegyes"]);
export const SpiritLevelEnum = z.enum(["kezdo", "kozep-halado", "halado"]);
export const SpiritFormatEnum = z.enum(["konyv", "kommentar", "valogatas", "szutra", "essze"]);
export const SpiritStatusEnum = z.enum(["olvasatlan", "folyamatban", "befejezett", "referencia"]);

export const SpiritPillSchema = z.object({
  slug: z.string().min(1),
  label: z.string().min(1),
});

export const SpiritBookSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  author: z.string().min(1),
  tradition: SpiritTraditionEnum,
  level: SpiritLevelEnum,
  summary_short: z.string().min(1),
  recommendation: z.string().min(1),
  themes: z.array(z.string().min(1)).min(1),
  language: z.string().min(1),
  format: SpiritFormatEnum,
  status: SpiritStatusEnum,
  summary_long: z.string().min(1).optional(),
  prerequisites: z.array(z.string().min(1)).optional(),
  cautions: z.string().min(1).optional(),
  tags: z.array(z.string().min(1)).optional(),
  notes: z.string().min(1).optional(),
  year: z.string().min(1).optional(),
  related: z.array(z.string().min(1)).optional(),
});

export const SpiritPathSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  book_ids: z.array(z.string().min(1)).min(1),
});

export const SpiritLibrarySchema = z.object({
  library_version: z.string().min(1),
  thematic_pills: z.array(SpiritPillSchema).min(1),
  books: z.array(SpiritBookSchema).min(1),
  paths: z.array(SpiritPathSchema).optional(),
});

export type SpiritPill = z.infer<typeof SpiritPillSchema>;
export type SpiritBook = z.infer<typeof SpiritBookSchema>;
export type SpiritPath = z.infer<typeof SpiritPathSchema>;
export type SpiritLibrary = z.infer<typeof SpiritLibrarySchema>;

export function validateSpiritLibrary(raw: unknown): SpiritLibrary {
  const parsed = SpiritLibrarySchema.parse(raw);
  const errors: string[] = [];

  const pillSlugs = parsed.thematic_pills.map((pill) => pill.slug);
  const pillSet = new Set(pillSlugs);
  if (pillSet.size !== pillSlugs.length) {
    errors.push("Duplicate thematic_pills.slug detected.");
  }

  const bookIds = parsed.books.map((book) => book.id);
  const bookIdSet = new Set(bookIds);
  if (bookIdSet.size !== bookIds.length) {
    errors.push("Duplicate book.id detected.");
  }

  parsed.books.forEach((book) => {
    book.themes.forEach((theme) => {
      if (!pillSet.has(theme)) {
        errors.push(`Book '${book.id}' references missing theme '${theme}'.`);
      }
    });
    (book.related ?? []).forEach((relatedId) => {
      if (!bookIdSet.has(relatedId)) {
        errors.push(`Book '${book.id}' references missing related id '${relatedId}'.`);
      }
    });
  });

  (parsed.paths ?? []).forEach((path) => {
    path.book_ids.forEach((bookId) => {
      if (!bookIdSet.has(bookId)) {
        errors.push(`Path '${path.id}' references missing book id '${bookId}'.`);
      }
    });
  });

  if (errors.length > 0) {
    throw new Error(`Spirit library validation failed:\\n${errors.join("\\n")}`);
  }

  return parsed;
}
