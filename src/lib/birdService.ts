import { supabaseServerClient } from "@/lib/supabaseServerClient";
import {
  Bird,
  BirdCreateInput,
  BirdStatus,
  BirdUpdateInput,
  BIRD_STATUS_VALUES,
} from "@/types/bird";
import { normalizeHungarianName } from "@/lib/stringUtils";

type ListBirdsOptions = {
  search?: string;
  status?: BirdStatus;
};

export async function listBirds(options: ListBirdsOptions = {}): Promise<Bird[]> {
  const { search, status } = options;
  let query = supabaseServerClient
    .from("birds")
    .select("id,slug,name_hu,name_latin,status,created_at,updated_at")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (status && BIRD_STATUS_VALUES.includes(status)) {
    query = query.eq("status", status);
  }

  if (search) {
    const normalized = `%${search.trim().toLowerCase()}%`;
    query = query.ilike("name_hu", normalized);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getBirdById(id: string): Promise<Bird | null> {
  const { data, error } = await supabaseServerClient
    .from("birds")
    .select("id,slug,name_hu,name_latin,status,created_at,updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ?? null;
}

export async function getBirdBySlug(slug: string): Promise<Bird | null> {
  const { data, error } = await supabaseServerClient
    .from("birds")
    .select("id,slug,name_hu,name_latin,status,created_at,updated_at")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ?? null;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

export async function createBird(input: BirdCreateInput): Promise<Bird> {
  const { slug, name_hu, name_latin } = input;
  const normalizedNameHu = normalizeHungarianName(name_hu);

  const { data, error } = await supabaseServerClient
    .from("birds")
    .insert({
      slug,
      name_hu: normalizedNameHu,
      name_latin,
      status: "draft",
    })
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to create bird.");
  }

  return data;
}

export async function updateBird(input: BirdUpdateInput): Promise<Bird> {
  const { id, ...rest } = input;

  const mutablePayload = Object.entries(rest).reduce<Record<string, unknown>>(
    (acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    },
    {}
  );

  if (
    Reflect.has(mutablePayload, "name_hu") &&
    typeof mutablePayload.name_hu === "string"
  ) {
    mutablePayload.name_hu = normalizeHungarianName(
      mutablePayload.name_hu
    );
  }

  const payload = {
    ...mutablePayload,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseServerClient
    .from("birds")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to update bird.");
  }

  return data;
}

export async function deleteBirdById(id: string): Promise<void> {
  const { error } = await supabaseServerClient
    .from("birds")
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }
}
