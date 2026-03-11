import { supabaseServerClient } from "@/lib/supabaseServerClient";
import {
  Bird,
  BirdColorTag,
  BirdCreateInput,
  BirdStatus,
  BirdSizeCategory,
  BirdUpdateInput,
  BIRD_STATUS_VALUES,
  BirdVisibilityCategory,
} from "@/types/bird";
import { normalizeHungarianName } from "@/lib/stringUtils";

type ListBirdsOptions = {
  search?: string;
  status?: BirdStatus;
  sizeCategory?: BirdSizeCategory;
  visibilityCategory?: BirdVisibilityCategory;
  colorTags?: BirdColorTag[];
};

export type PublishedBirdRefillListItem = {
  id: string;
  slug: string;
  name_hu: string;
  updated_at: string;
};

export async function listBirds(options: ListBirdsOptions = {}): Promise<Bird[]> {
  const { search, status, sizeCategory, visibilityCategory, colorTags } = options;
  let query = supabaseServerClient
    .from("birds")
    .select(
      "id,slug,name_hu,name_latin,status,published_at,published_revision,science_dossier_status,visual_brief_status,size_category,visibility_category,classification_status,color_tags,created_at,updated_at"
    )
    .order("updated_at", { ascending: false })
    .limit(100);

  if (status && BIRD_STATUS_VALUES.includes(status)) {
    query = query.eq("status", status);
  }

  if (sizeCategory) {
    query = query.eq("size_category", sizeCategory);
  }

  if (visibilityCategory) {
    query = query.eq("visibility_category", visibilityCategory);
  }

  if (colorTags && colorTags.length > 0) {
    query = query.overlaps("color_tags", colorTags);
  }

  if (search) {
    const normalized = `%${search.trim().toLowerCase()}%`;
    query = query.or(`name_hu.ilike.${normalized},name_latin.ilike.${normalized}`);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function listPublishedBirdsForRefill(args: {
  limit?: number;
} = {}): Promise<PublishedBirdRefillListItem[]> {
  const limit = typeof args.limit === "number" && args.limit > 0 ? args.limit : 300;
  const { data, error } = await supabaseServerClient
    .from("birds")
    .select("id,slug,name_hu,updated_at")
    .eq("status", "published")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []) as PublishedBirdRefillListItem[];
}

export async function listBirdsMissingClassification(): Promise<Bird[]> {
  const { data, error } = await supabaseServerClient
    .from("birds")
    .select(
      "id,slug,name_hu,name_latin,status,published_at,published_revision,science_dossier_status,visual_brief_status,size_category,visibility_category,classification_status,color_tags,created_at,updated_at"
    )
    .or("size_category.is.null,visibility_category.is.null")
    .order("updated_at", { ascending: false })
    .limit(200);

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getBirdById(id: string): Promise<Bird | null> {
  const { data, error } = await supabaseServerClient
    .from("birds")
    .select(
      "id,slug,name_hu,name_latin,status,published_at,published_revision,science_dossier_status,visual_brief_status,size_category,visibility_category,classification_status,color_tags,created_at,updated_at"
    )
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
    .select(
      "id,slug,name_hu,name_latin,status,published_at,published_revision,science_dossier_status,visual_brief_status,size_category,visibility_category,classification_status,color_tags,created_at,updated_at"
    )
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
  const relationMissing = (error: unknown, relation: string) => {
    if (!error || typeof error !== "object") return false;
    const message = "message" in error ? String((error as { message?: unknown }).message ?? "") : "";
    const code = "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
    return (
      code === "42P01" ||
      message.includes(`relation "${relation}" does not exist`)
    );
  };

  const { count: sightingsCount, error: sightingsError } = await supabaseServerClient
    .from("bird_sighting_birds")
    .select("bird_id", { count: "exact", head: true })
    .eq("bird_id", id);

  if (sightingsError && !relationMissing(sightingsError, "bird_sighting_birds")) {
    throw sightingsError;
  }

  if (!sightingsError && (sightingsCount ?? 0) > 0) {
    throw new Error("Cannot delete bird: it is referenced by sightings.");
  }

  const { error: placeBirdsError } = await supabaseServerClient
    .from("place_birds")
    .delete()
    .eq("bird_id", id);

  if (placeBirdsError && !relationMissing(placeBirdsError, "place_birds")) {
    throw placeBirdsError;
  }

  const { error: imagesError } = await supabaseServerClient
    .from("images")
    .delete()
    .eq("entity_type", "bird")
    .eq("entity_id", id);

  if (imagesError) {
    throw imagesError;
  }

  const { error: blocksError } = await supabaseServerClient
    .from("content_blocks")
    .delete()
    .eq("entity_type", "bird")
    .eq("entity_id", id);

  if (blocksError) {
    throw blocksError;
  }

  const { error } = await supabaseServerClient.from("birds").delete().eq("id", id);

  if (error) throw error;
}
