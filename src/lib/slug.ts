import { supabaseServerClient } from "@/lib/supabaseServerClient";

const DIACRITIC_REGEX = /\p{Diacritic}/gu;
const NON_SLUG_CHAR_REGEX = /[^a-z0-9]+/g;

export function normalizeBirdSlug(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  const deaccented = trimmed.normalize("NFD").replace(DIACRITIC_REGEX, "");

  const slug = deaccented
    .toLowerCase()
    .replace(NON_SLUG_CHAR_REGEX, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");

  return slug;
}

export async function generateUniqueBirdSlug(nameLatin: string): Promise<string> {
  const baseSlug = normalizeBirdSlug(nameLatin);

  if (!baseSlug) {
    throw new Error("Latin name must contain letters or numbers to derive a slug.");
  }

  const { data, error } = await supabaseServerClient
    .from("birds")
    .select("slug")
    .like("slug", `${baseSlug}%`);

  if (error) {
    throw error;
  }

  const existingSlugs = new Set((data ?? []).map((record) => record.slug));

  if (!existingSlugs.has(baseSlug)) {
    return baseSlug;
  }

  let suffix = 2;
  let candidate = `${baseSlug}-${suffix}`;

  while (existingSlugs.has(candidate)) {
    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }

  return candidate;
}
