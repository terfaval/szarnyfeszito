import { supabaseServerClient } from "@/lib/supabaseServerClient";
import type { BirdSighting, BirdSightingCreateInput } from "@/types/birdSighting";

type ListSightingsOptions = {
  limit?: number;
};

type SightingsRow = {
  id: string;
  seen_at: string;
  notes: string | null;
  birds: Array<{
    bird: { id: string; slug: string; name_hu: string } | null;
  }> | null;
};

function mapRow(row: SightingsRow): BirdSighting {
  const birds = (row.birds ?? [])
    .map((item) => item.bird)
    .filter((bird): bird is NonNullable<typeof bird> => Boolean(bird));

  return {
    id: row.id,
    seen_at: row.seen_at,
    notes: row.notes,
    birds,
  };
}

export async function listBirdSightingsForUser(
  userId: string,
  options: ListSightingsOptions = {}
): Promise<BirdSighting[]> {
  const limit = Math.max(1, Math.min(50, options.limit ?? 12));

  const { data, error } = await supabaseServerClient
    .from("bird_sightings")
    .select("id,seen_at,notes,birds:bird_sighting_birds(bird:birds(id,slug,name_hu))")
    .eq("created_by", userId)
    .order("seen_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as unknown as SightingsRow[];
  return rows.map(mapRow);
}

export async function createBirdSighting(input: BirdSightingCreateInput): Promise<BirdSighting> {
  const { createdBy, birdIds, seenAt, notes } = input;

  const { data: inserted, error: insertError } = await supabaseServerClient
    .from("bird_sightings")
    .insert({
      created_by: createdBy,
      seen_at: seenAt ?? new Date().toISOString(),
      notes: notes ?? null,
      updated_at: new Date().toISOString(),
    })
    .select("id,seen_at,notes")
    .single();

  if (insertError || !inserted) {
    throw insertError ?? new Error("Unable to create sighting.");
  }

  const sightingId = inserted.id as string;
  const joinPayload = birdIds.map((birdId) => ({
    sighting_id: sightingId,
    bird_id: birdId,
    quantity: 1,
  }));

  const { error: joinError } = await supabaseServerClient
    .from("bird_sighting_birds")
    .insert(joinPayload);

  if (joinError) {
    throw joinError;
  }

  const { data, error } = await supabaseServerClient
    .from("bird_sightings")
    .select("id,seen_at,notes,birds:bird_sighting_birds(bird:birds(id,slug,name_hu))")
    .eq("id", sightingId)
    .maybeSingle();

  if (error || !data) {
    throw error ?? new Error("Unable to fetch created sighting.");
  }

  return mapRow(data as unknown as SightingsRow);
}

