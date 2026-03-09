import { supabaseServerClient } from "@/lib/supabaseServerClient";
import type { PlaceBirdLink, PlaceFrequencyBand } from "@/types/place";

export async function listPlaceBirdLinks(placeId: string): Promise<PlaceBirdLink[]> {
  const { data, error } = await supabaseServerClient
    .from("place_birds")
    .select(
      "id,place_id,bird_id,pending_bird_name_hu,rank,frequency_band,is_iconic,visible_in_spring,visible_in_summer,visible_in_autumn,visible_in_winter,seasonality_note,created_at,updated_at"
    )
    .eq("place_id", placeId)
    .order("rank", { ascending: true })
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as PlaceBirdLink[];
}

export async function createPlaceBirdLink(input: {
  place_id: string;
  bird_id?: string | null;
  pending_bird_name_hu?: string | null;
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

