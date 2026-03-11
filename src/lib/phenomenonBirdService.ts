import { supabaseServerClient } from "@/lib/supabaseServerClient";
import type { PhenomenonBirdLink, PhenomenonBirdReviewStatus } from "@/types/phenomenon";

function normalizePendingBirdName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

export async function listPhenomenonBirdLinks(phenomenonId: string): Promise<PhenomenonBirdLink[]> {
  const { data, error } = await supabaseServerClient
    .from("phenomenon_birds")
    .select(
      "id,phenomenon_id,bird_id,pending_bird_name_hu,review_status,rank,created_at,updated_at"
    )
    .eq("phenomenon_id", phenomenonId)
    .order("rank", { ascending: true })
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PhenomenonBirdLink[];
}

export type ApprovedPublishedPhenomenonBirdLink = Pick<
  PhenomenonBirdLink,
  "id" | "phenomenon_id" | "bird_id" | "rank" | "review_status" | "updated_at"
> & {
  bird: { id: string; slug: string; name_hu: string } | null;
};

export async function listApprovedPublishedBirdLinksForPhenomenon(
  phenomenonId: string
): Promise<ApprovedPublishedPhenomenonBirdLink[]> {
  type BirdWithStatus = { id: string; slug: string; name_hu: string; status?: string };
  type RowWithStatus = Pick<
    PhenomenonBirdLink,
    "id" | "phenomenon_id" | "bird_id" | "rank" | "review_status" | "updated_at"
  > & {
    bird: BirdWithStatus | BirdWithStatus[] | null;
  };

  const { data, error } = await supabaseServerClient
    .from("phenomenon_birds")
    .select(
      "id,phenomenon_id,bird_id,rank,review_status,updated_at,bird:birds!phenomenon_birds_bird_id_fkey(id,slug,name_hu,status)"
    )
    .eq("phenomenon_id", phenomenonId)
    .eq("review_status", "approved")
    .not("bird_id", "is", null)
    .order("rank", { ascending: true })
    .order("updated_at", { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as RowWithStatus[];
  return rows
    .map((row) => {
      const bird = Array.isArray(row.bird) ? (row.bird[0] ?? null) : row.bird;
      return { ...row, bird };
    })
    .filter((row) => row.bird?.status === "published")
    .map((row) => ({
      ...row,
      bird: row.bird ? { id: row.bird.id, slug: row.bird.slug, name_hu: row.bird.name_hu } : null,
    })) as ApprovedPublishedPhenomenonBirdLink[];
}

export async function createPhenomenonBirdLink(input: {
  phenomenon_id: string;
  bird_id?: string | null;
  pending_bird_name_hu?: string | null;
  review_status?: PhenomenonBirdReviewStatus;
  rank?: number;
}): Promise<PhenomenonBirdLink> {
  const payload = {
    phenomenon_id: input.phenomenon_id,
    bird_id: input.bird_id ?? null,
    pending_bird_name_hu: input.pending_bird_name_hu?.trim() || null,
    review_status: input.review_status ?? ("approved" as const),
    rank: typeof input.rank === "number" ? input.rank : 0,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseServerClient
    .from("phenomenon_birds")
    .insert(payload)
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to create phenomenon bird link.");
  }

  return data as PhenomenonBirdLink;
}

export async function updatePhenomenonBirdLink(input: {
  id: string;
  review_status?: PhenomenonBirdReviewStatus;
  rank?: number;
  bird_id?: string | null;
  pending_bird_name_hu?: string | null;
}): Promise<PhenomenonBirdLink> {
  const { id, ...rest } = input;

  const payload = Object.entries(rest).reduce<Record<string, unknown>>((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key] = value;
    }
    return acc;
  }, {});

  if (typeof payload.pending_bird_name_hu === "string") {
    payload.pending_bird_name_hu = payload.pending_bird_name_hu.trim() || null;
  }

  payload.updated_at = new Date().toISOString();

  const { data, error } = await supabaseServerClient
    .from("phenomenon_birds")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to update phenomenon bird link.");
  }

  return data as PhenomenonBirdLink;
}

export async function deletePhenomenonBirdLink(id: string): Promise<void> {
  const { error } = await supabaseServerClient.from("phenomenon_birds").delete().eq("id", id);
  if (error) throw error;
}

export async function replacePhenomenonBirdSuggestions(input: {
  phenomenon_id: string;
  suggestions: Array<{ bird_id?: string | null; pending_bird_name_hu?: string | null }>;
}): Promise<{ inserted: PhenomenonBirdLink[]; deleted_count: number }> {
  const { phenomenon_id } = input;

  const { data: existingRows, error: existingError } = await supabaseServerClient
    .from("phenomenon_birds")
    .select("id,phenomenon_id,bird_id,pending_bird_name_hu,review_status,rank,created_at,updated_at")
    .eq("phenomenon_id", phenomenon_id)
    .eq("review_status", "suggested")
    .order("updated_at", { ascending: false })
    .limit(500);

  if (existingError) throw existingError;

  const existing = (existingRows ?? []) as PhenomenonBirdLink[];
  const existingIds = existing.map((row) => row.id).filter(Boolean);

  let deletedCount = 0;
  if (existingIds.length > 0) {
    const { error: deleteError } = await supabaseServerClient
      .from("phenomenon_birds")
      .delete()
      .in("id", existingIds);
    if (deleteError) throw deleteError;
    deletedCount = existingIds.length;
  }

  const normalizedSuggestions = input.suggestions
    .map((s) => ({
      bird_id: typeof s.bird_id === "string" ? s.bird_id : null,
      pending_bird_name_hu:
        typeof s.pending_bird_name_hu === "string" ? normalizePendingBirdName(s.pending_bird_name_hu) : null,
    }))
    .filter((s) => (s.bird_id ? true : Boolean(s.pending_bird_name_hu)));

  if (normalizedSuggestions.length === 0) {
    return { inserted: [], deleted_count: deletedCount };
  }

  const insertPayload = normalizedSuggestions.map((s, idx) => ({
    phenomenon_id,
    bird_id: s.bird_id,
    pending_bird_name_hu: s.pending_bird_name_hu,
    review_status: "suggested" as const,
    rank: idx,
    updated_at: new Date().toISOString(),
  }));

  const { data: insertedRows, error: insertError } = await supabaseServerClient
    .from("phenomenon_birds")
    .insert(insertPayload)
    .select("*");

  if (insertError) throw insertError;
  return { inserted: (insertedRows ?? []) as PhenomenonBirdLink[], deleted_count: deletedCount };
}

