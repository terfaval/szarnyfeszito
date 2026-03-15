import { supabaseServerClient } from "@/lib/supabaseServerClient";
import { normalizeBirdSlug } from "@/lib/slug";
import type {
  Phenomenon,
  PhenomenonSeason,
  PhenomenonStatus,
  PhenomenonType,
} from "@/types/phenomenon";
import {
  PHENOMENON_SEASON_VALUES,
  PHENOMENON_STATUS_VALUES,
  PHENOMENON_TYPE_VALUES,
} from "@/types/phenomenon";

const PHENOMENON_SELECT =
  "id,slug,title,phenomenon_type,season,region_id,typical_start_mmdd,typical_end_mmdd,status,generation_input,published_at,created_at,updated_at";

type ListPhenomenaOptions = {
  search?: string;
  status?: PhenomenonStatus | null;
  season?: PhenomenonSeason | null;
  region_id?: string | null;
  phenomenon_type?: PhenomenonType | null;
};

export async function listPhenomena(options: ListPhenomenaOptions = {}): Promise<Phenomenon[]> {
  const { search, status, season, region_id, phenomenon_type } = options;

  let query = supabaseServerClient
    .from("phenomena")
    .select(PHENOMENON_SELECT)
    .order("updated_at", { ascending: false })
    .limit(250);

  if (status && PHENOMENON_STATUS_VALUES.includes(status)) {
    query = query.eq("status", status);
  }

  if (season && PHENOMENON_SEASON_VALUES.includes(season)) {
    query = query.eq("season", season);
  }

  if (phenomenon_type && PHENOMENON_TYPE_VALUES.includes(phenomenon_type)) {
    query = query.eq("phenomenon_type", phenomenon_type);
  }

  if (region_id && region_id.trim()) {
    query = query.eq("region_id", region_id.trim());
  }

  if (search && search.trim()) {
    const normalized = `%${search.trim().toLowerCase()}%`;
    query = query.or(`title.ilike.${normalized},slug.ilike.${normalized}`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Phenomenon[];
}

export async function getPhenomenonById(id: string): Promise<Phenomenon | null> {
  const { data, error } = await supabaseServerClient
    .from("phenomena")
    .select(PHENOMENON_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as Phenomenon | null;
}

export async function getPhenomenonBySlug(slug: string): Promise<Phenomenon | null> {
  const { data, error } = await supabaseServerClient
    .from("phenomena")
    .select(PHENOMENON_SELECT)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as Phenomenon | null;
}

export async function generateUniquePhenomenonSlug(base: string): Promise<string> {
  const baseSlug = normalizeBirdSlug(base);
  if (!baseSlug) {
    throw new Error("Phenomenon title must contain letters or numbers to derive a slug.");
  }

  const { data, error } = await supabaseServerClient
    .from("phenomena")
    .select("slug")
    .like("slug", `${baseSlug}%`);

  if (error) {
    throw error;
  }

  const existingSlugs = new Set(
    ((data ?? []) as Array<{ slug?: unknown }>)
      .map((record) => (typeof record.slug === "string" ? record.slug : ""))
      .filter(Boolean)
  );
  if (!existingSlugs.has(baseSlug)) return baseSlug;

  let suffix = 2;
  let candidate = `${baseSlug}-${suffix}`;
  while (existingSlugs.has(candidate)) {
    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }
  return candidate;
}

export async function createPhenomenon(input: {
  slug: string;
  title: string;
  phenomenon_type?: PhenomenonType;
  season: PhenomenonSeason;
  region_id: string;
  typical_start_mmdd?: string | null;
  typical_end_mmdd?: string | null;
  generation_input?: string | null;
}): Promise<Phenomenon> {
  const payload = {
    slug: input.slug.trim(),
    title: input.title.trim(),
    phenomenon_type: input.phenomenon_type ?? ("migration_peak" as const),
    season: input.season,
    region_id: input.region_id.trim(),
    typical_start_mmdd: input.typical_start_mmdd?.trim() || null,
    typical_end_mmdd: input.typical_end_mmdd?.trim() || null,
    status: "draft" as const,
    generation_input: input.generation_input?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseServerClient.from("phenomena").insert(payload).select("*").single();

  if (error || !data) {
    throw error ?? new Error("Unable to create phenomenon.");
  }

  return data as Phenomenon;
}

export async function updatePhenomenon(input: {
  id: string;
  slug?: string;
  title?: string;
  season?: PhenomenonSeason;
  region_id?: string;
  typical_start_mmdd?: string | null;
  typical_end_mmdd?: string | null;
  status?: PhenomenonStatus;
  generation_input?: string | null;
  published_at?: string | null;
}): Promise<Phenomenon> {
  const { id, ...rest } = input;

  const mutablePayload = Object.entries(rest).reduce<Record<string, unknown>>((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key] = value;
    }
    return acc;
  }, {});

  if (typeof mutablePayload.slug === "string") {
    mutablePayload.slug = mutablePayload.slug.trim();
  }
  if (typeof mutablePayload.title === "string") {
    mutablePayload.title = mutablePayload.title.trim();
  }
  if (typeof mutablePayload.region_id === "string") {
    mutablePayload.region_id = mutablePayload.region_id.trim();
  }
  if (typeof mutablePayload.typical_start_mmdd === "string") {
    mutablePayload.typical_start_mmdd = mutablePayload.typical_start_mmdd.trim() || null;
  }
  if (typeof mutablePayload.typical_end_mmdd === "string") {
    mutablePayload.typical_end_mmdd = mutablePayload.typical_end_mmdd.trim() || null;
  }
  if (typeof mutablePayload.generation_input === "string") {
    mutablePayload.generation_input = mutablePayload.generation_input.trim() || null;
  }

  const payload = { ...mutablePayload, updated_at: new Date().toISOString() };

  const { data, error } = await supabaseServerClient
    .from("phenomena")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to update phenomenon.");
  }

  return data as Phenomenon;
}

export async function deletePhenomenonById(id: string): Promise<void> {
  const { error } = await supabaseServerClient.from("phenomena").delete().eq("id", id);
  if (error) throw error;
}
