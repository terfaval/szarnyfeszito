import { supabaseServerClient } from "@/lib/supabaseServerClient";
import type { PlaceBirdLink, PlaceBirdReviewStatus, PlaceFrequencyBand } from "@/types/place";
import { normalizeBirdSlug } from "@/lib/slug";

function normalizePendingBirdName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  const size = Number.isFinite(chunkSize) && chunkSize > 0 ? Math.floor(chunkSize) : 1;
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

export async function listPlaceBirdLinks(placeId: string): Promise<PlaceBirdLink[]> {
  const { data, error } = await supabaseServerClient
    .from("place_birds")
    .select(
      "id,place_id,bird_id,pending_bird_name_hu,review_status,rank,frequency_band,is_iconic,visible_in_spring,visible_in_summer,visible_in_autumn,visible_in_winter,seasonality_note,created_at,updated_at"
    )
    .eq("place_id", placeId)
    .order("rank", { ascending: true })
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as PlaceBirdLink[];
}

export type ApprovedPublishedPlaceBirdLink = Pick<
  PlaceBirdLink,
  | "id"
  | "place_id"
  | "bird_id"
  | "rank"
  | "frequency_band"
  | "is_iconic"
  | "visible_in_spring"
  | "visible_in_summer"
  | "visible_in_autumn"
  | "visible_in_winter"
  | "updated_at"
> & {
  bird: { id: string; slug: string; name_hu: string } | null;
};

export async function listApprovedPublishedBirdLinksForPlace(
  placeId: string
): Promise<ApprovedPublishedPlaceBirdLink[]> {
  type BirdWithStatus = { id: string; slug: string; name_hu: string; status?: string };
  type RowWithStatus = Pick<
    PlaceBirdLink,
    | "id"
    | "place_id"
    | "bird_id"
    | "rank"
    | "frequency_band"
    | "is_iconic"
    | "visible_in_spring"
    | "visible_in_summer"
    | "visible_in_autumn"
    | "visible_in_winter"
    | "updated_at"
  > & {
    bird: BirdWithStatus | BirdWithStatus[] | null;
  };

  const { data, error } = await supabaseServerClient
    .from("place_birds")
    .select(
      "id,place_id,bird_id,rank,frequency_band,is_iconic,visible_in_spring,visible_in_summer,visible_in_autumn,visible_in_winter,updated_at,bird:birds!place_birds_bird_id_fkey(id,slug,name_hu,status)"
    )
    .eq("place_id", placeId)
    .eq("review_status", "approved")
    .not("bird_id", "is", null)
    .order("rank", { ascending: true })
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

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
    })) as ApprovedPublishedPlaceBirdLink[];
}

export async function createPlaceBirdLink(input: {
  place_id: string;
  bird_id?: string | null;
  pending_bird_name_hu?: string | null;
  review_status?: PlaceBirdReviewStatus;
  rank?: number;
  frequency_band?: PlaceFrequencyBand;
  is_iconic?: boolean;
  visible_in_spring?: boolean;
  visible_in_summer?: boolean;
  visible_in_autumn?: boolean;
  visible_in_winter?: boolean;
  seasonality_note?: string | null;
}): Promise<PlaceBirdLink> {
  const payload = {
    place_id: input.place_id,
    bird_id: input.bird_id ?? null,
    pending_bird_name_hu: input.pending_bird_name_hu?.trim() || null,
    review_status: input.review_status ?? ("approved" as const),
    rank: typeof input.rank === "number" ? input.rank : 0,
    frequency_band: input.frequency_band ?? ("regular" as const),
    is_iconic: input.is_iconic ?? false,
    visible_in_spring: input.visible_in_spring ?? false,
    visible_in_summer: input.visible_in_summer ?? false,
    visible_in_autumn: input.visible_in_autumn ?? false,
    visible_in_winter: input.visible_in_winter ?? false,
    seasonality_note: input.seasonality_note?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseServerClient
    .from("place_birds")
    .insert(payload)
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to create place bird link.");
  }

  return data as PlaceBirdLink;
}

export async function updatePlaceBirdLink(input: {
  id: string;
  review_status?: PlaceBirdReviewStatus;
  rank?: number;
  frequency_band?: PlaceFrequencyBand;
  is_iconic?: boolean;
  visible_in_spring?: boolean;
  visible_in_summer?: boolean;
  visible_in_autumn?: boolean;
  visible_in_winter?: boolean;
  seasonality_note?: string | null;
  bird_id?: string | null;
  pending_bird_name_hu?: string | null;
}): Promise<PlaceBirdLink> {
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

  if (typeof payload.seasonality_note === "string") {
    payload.seasonality_note = payload.seasonality_note.trim() || null;
  }

  payload.updated_at = new Date().toISOString();

  const { data, error } = await supabaseServerClient
    .from("place_birds")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to update place bird link.");
  }

  return data as PlaceBirdLink;
}

export async function deletePlaceBirdLink(id: string): Promise<void> {
  const { error } = await supabaseServerClient.from("place_birds").delete().eq("id", id);
  if (error) {
    throw error;
  }
}

type PlaceBirdApproveCandidateRow = {
  id?: unknown;
  bird_id?: unknown;
  bird?: { status?: unknown } | { status?: unknown }[] | null;
};

export async function approveSuggestedLinkedBirdsForPlace(placeId: string): Promise<{
  updated_count: number;
  skipped_unpublished_count: number;
}> {
  const { data, error } = await supabaseServerClient
    .from("place_birds")
    .select("id,bird_id,bird:birds!place_birds_bird_id_fkey(status)")
    .eq("place_id", placeId)
    .eq("review_status", "suggested")
    .not("bird_id", "is", null)
    .order("updated_at", { ascending: false })
    .limit(2000);

  if (error) throw error;

  const rows = (data ?? []) as PlaceBirdApproveCandidateRow[];
  const toApproveIds: string[] = [];
  let skippedUnpublished = 0;

  rows.forEach((row) => {
    const id = typeof row?.id === "string" ? row.id : "";
    if (!id) return;
    const bird = Array.isArray(row.bird) ? (row.bird[0] ?? null) : row.bird;
    const status = typeof bird?.status === "string" ? bird.status : "";
    if (status === "published") {
      toApproveIds.push(id);
    } else {
      skippedUnpublished += 1;
    }
  });

  if (toApproveIds.length === 0) {
    return { updated_count: 0, skipped_unpublished_count: skippedUnpublished };
  }

  let updatedCount = 0;
  for (const chunk of chunkArray(toApproveIds, 200)) {
    const { error: updateError } = await supabaseServerClient
      .from("place_birds")
      .update({ review_status: "approved", updated_at: new Date().toISOString() })
      .in("id", chunk);
    if (updateError) throw updateError;
    updatedCount += chunk.length;
  }

  return { updated_count: updatedCount, skipped_unpublished_count: skippedUnpublished };
}

export type PlaceBirdLinkSummary = {
  place_id: string;
  suggested_linked_count: number;
  suggested_pending_count: number;
  suggested_pending_names_preview: string[];
  approved_linked_count: number;
};

export async function getPlaceBirdLinkSummaries(placeIds: string[]): Promise<PlaceBirdLinkSummary[]> {
  const uniqueIds = Array.from(new Set(placeIds.map((id) => id.trim()).filter(Boolean)));
  if (uniqueIds.length === 0) return [];

  type Row = {
    place_id?: unknown;
    bird_id?: unknown;
    pending_bird_name_hu?: unknown;
    review_status?: unknown;
  };

  const { data, error } = await supabaseServerClient
    .from("place_birds")
    .select("place_id,bird_id,pending_bird_name_hu,review_status")
    .in("place_id", uniqueIds)
    .order("updated_at", { ascending: false })
    .limit(8000);

  if (error) throw error;

  const baseByPlace = new Map<
    string,
    {
      suggested_linked_count: number;
      suggested_pending_names: string[];
      suggested_pending_name_set: Set<string>;
      approved_linked_count: number;
    }
  >();

  uniqueIds.forEach((placeId) => {
    baseByPlace.set(placeId, {
      suggested_linked_count: 0,
      suggested_pending_names: [],
      suggested_pending_name_set: new Set<string>(),
      approved_linked_count: 0,
    });
  });

  (data ?? []).forEach((raw: Row) => {
    const row = raw as Row;
    const placeId = typeof row?.place_id === "string" ? row.place_id : "";
    if (!placeId) return;
    const bucket = baseByPlace.get(placeId);
    if (!bucket) return;

    const reviewStatus = typeof row?.review_status === "string" ? row.review_status : "";
    const birdId = typeof row?.bird_id === "string" ? row.bird_id : null;
    const pendingName =
      typeof row?.pending_bird_name_hu === "string" ? normalizePendingBirdName(row.pending_bird_name_hu) : "";

    if (reviewStatus === "suggested") {
      if (birdId) {
        bucket.suggested_linked_count += 1;
      } else if (pendingName) {
        const key = pendingName.toLowerCase();
        if (!bucket.suggested_pending_name_set.has(key)) {
          bucket.suggested_pending_name_set.add(key);
          bucket.suggested_pending_names.push(pendingName);
        }
      }
    }

    if (reviewStatus === "approved" && birdId) {
      bucket.approved_linked_count += 1;
    }
  });

  return uniqueIds.map((placeId) => {
    const bucket = baseByPlace.get(placeId)!;
    return {
      place_id: placeId,
      suggested_linked_count: bucket.suggested_linked_count,
      suggested_pending_count: bucket.suggested_pending_names.length,
      suggested_pending_names_preview: bucket.suggested_pending_names.slice(0, 8),
      approved_linked_count: bucket.approved_linked_count,
    };
  });
}

type SuggestedQueueRow = {
  id: string;
  place_id: string;
  pending_bird_name_hu: string | null;
  created_at: string;
  updated_at: string;
};

export type SuggestedBirdQueueItem = {
  key: string;
  name_hu: string;
  suggested_count: number;
  latest: {
    place_id: string;
    place_bird_id: string;
    place_name: string | null;
    place_slug: string | null;
    updated_at: string;
  };
};

export async function listSuggestedBirdQueue(): Promise<SuggestedBirdQueueItem[]> {
  const { data, error } = await supabaseServerClient
    .from("place_birds")
    .select("id,place_id,pending_bird_name_hu,created_at,updated_at")
    .eq("review_status", "suggested")
    .is("bird_id", null)
    .not("pending_bird_name_hu", "is", null)
    .order("updated_at", { ascending: false })
    .limit(800);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as SuggestedQueueRow[];
  const groups = new Map<string, { name_hu: string; rows: SuggestedQueueRow[] }>();

  rows.forEach((row) => {
    const raw = typeof row.pending_bird_name_hu === "string" ? row.pending_bird_name_hu : "";
    const normalized = normalizePendingBirdName(raw);
    if (!normalized) return;
    const slugKey = normalizeBirdSlug(normalized);
    if (!slugKey) return;

    const existing = groups.get(slugKey);
    if (!existing) {
      groups.set(slugKey, { name_hu: normalized, rows: [row] });
      return;
    }

    existing.rows.push(row);
  });

  const itemsBase = Array.from(groups.entries()).map(([key, group]) => {
    const latest = group.rows[0]!;
    return {
      key,
      name_hu: group.name_hu,
      suggested_count: group.rows.length,
      latest: {
        place_id: latest.place_id,
        place_bird_id: latest.id,
        updated_at: latest.updated_at,
      },
    };
  });

  const placeIds = Array.from(new Set(itemsBase.map((item) => item.latest.place_id))).filter(Boolean);
  const placeById = new Map<string, { name: string; slug: string }>();

  if (placeIds.length > 0) {
    const { data: places, error: placesError } = await supabaseServerClient
      .from("places")
      .select("id,name,slug")
      .in("id", placeIds);

    if (placesError) {
      throw placesError;
    }

    (places ?? []).forEach((place: { id?: unknown; name?: unknown; slug?: unknown }) => {
      const id = typeof place?.id === "string" ? place.id : "";
      const name = typeof place?.name === "string" ? place.name : "";
      const slug = typeof place?.slug === "string" ? place.slug : "";
      if (!id || !name) return;
      placeById.set(id, { name, slug });
    });
  }

  const items: SuggestedBirdQueueItem[] = itemsBase
    .slice(0, 240)
    .map((item) => {
      const placeMeta = placeById.get(item.latest.place_id) ?? null;
      return {
        ...item,
        latest: {
          ...item.latest,
          place_name: placeMeta?.name ?? null,
          place_slug: placeMeta?.slug ?? null,
        },
      };
    })
    .sort((a, b) => {
      if (a.suggested_count !== b.suggested_count) return b.suggested_count - a.suggested_count;
      return a.name_hu.localeCompare(b.name_hu, "hu");
    });

  return items;
}
