import { supabaseServerClient } from "@/lib/supabaseServerClient";
import { normalizeHungarianName } from "@/lib/stringUtils";
import {
  Place,
  PlaceMarker,
  PlaceStatus,
  PlaceType,
  PLACE_STATUS_VALUES,
  PLACE_TYPE_VALUES,
} from "@/types/place";

type ListPlacesOptions = {
  search?: string;
  status?: PlaceStatus | null;
  place_type?: PlaceType | null;
  county?: string | null;
  region_landscape?: string | null;
};

const PLACE_SELECT =
  "id,slug,name,place_type,status,region_landscape,county,district,nearest_city,distance_from_nearest_city_km,settlement,location_precision,sensitivity_level,is_beginner_friendly,access_note,parking_note,best_visit_note,notable_units_json,generation_input,published_at,published_revision,created_at,updated_at";

export async function listPlaces(options: ListPlacesOptions = {}): Promise<Place[]> {
  const { search, status, place_type, county, region_landscape } = options;

  let query = supabaseServerClient
    .from("places")
    .select(PLACE_SELECT)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (status && PLACE_STATUS_VALUES.includes(status)) {
    query = query.eq("status", status);
  }

  if (place_type && PLACE_TYPE_VALUES.includes(place_type)) {
    query = query.eq("place_type", place_type);
  }

  if (county && county.trim()) {
    query = query.ilike("county", `%${county.trim()}%`);
  }

  if (region_landscape && region_landscape.trim()) {
    query = query.ilike("region_landscape", `%${region_landscape.trim()}%`);
  }

  if (search && search.trim()) {
    const normalized = `%${search.trim().toLowerCase()}%`;
    query = query.or(`name.ilike.${normalized},slug.ilike.${normalized}`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Place[];
}

export async function getPlaceById(id: string): Promise<Place | null> {
  const { data, error } = await supabaseServerClient
    .from("places")
    .select(PLACE_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as Place | null;
}

export async function getPlaceBySlug(slug: string): Promise<Place | null> {
  const { data, error } = await supabaseServerClient
    .from("places")
    .select(PLACE_SELECT)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as Place | null;
}

export async function createPlace(input: {
  slug: string;
  name: string;
  place_type: PlaceType;
  region_landscape?: string | null;
  county?: string | null;
  district?: string | null;
  nearest_city?: string | null;
  distance_from_nearest_city_km?: number | null;
  settlement?: string | null;
  generation_input?: string | null;
}): Promise<Place> {
  const payload = {
    slug: input.slug.trim(),
    name: normalizeHungarianName(input.name),
    place_type: input.place_type,
    status: "draft" as const,
    region_landscape: input.region_landscape?.trim() || null,
    county: input.county?.trim() || null,
    district: input.district?.trim() || null,
    nearest_city: input.nearest_city?.trim() || null,
    distance_from_nearest_city_km:
      typeof input.distance_from_nearest_city_km === "number"
        ? input.distance_from_nearest_city_km
        : null,
    settlement: input.settlement?.trim() || null,
    generation_input: input.generation_input?.trim() || null,
  };

  const { data, error } = await supabaseServerClient
    .from("places")
    .insert(payload)
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to create place.");
  }

  return data as Place;
}

export async function updatePlace(input: {
  id: string;
  slug?: string;
  name?: string;
  place_type?: PlaceType;
  status?: PlaceStatus;
  region_landscape?: string | null;
  county?: string | null;
  district?: string | null;
  nearest_city?: string | null;
  distance_from_nearest_city_km?: number | null;
  settlement?: string | null;
  location_wkt?: string | null;
  location_precision?: "exact" | "approximate" | "hidden";
  sensitivity_level?: "normal" | "sensitive";
  is_beginner_friendly?: boolean;
  access_note?: string | null;
  parking_note?: string | null;
  best_visit_note?: string | null;
  notable_units_json?: unknown | null;
  generation_input?: string | null;
  published_at?: string | null;
  published_revision?: number;
}): Promise<Place> {
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

  if (typeof mutablePayload.slug === "string") {
    mutablePayload.slug = mutablePayload.slug.trim();
  }

  if (typeof mutablePayload.name === "string") {
    mutablePayload.name = normalizeHungarianName(mutablePayload.name);
  }

  if (typeof mutablePayload.region_landscape === "string") {
    mutablePayload.region_landscape = mutablePayload.region_landscape.trim() || null;
  }

  if (typeof mutablePayload.county === "string") {
    mutablePayload.county = mutablePayload.county.trim() || null;
  }

  if (typeof mutablePayload.district === "string") {
    mutablePayload.district = mutablePayload.district.trim() || null;
  }

  if (typeof mutablePayload.nearest_city === "string") {
    mutablePayload.nearest_city = mutablePayload.nearest_city.trim() || null;
  }

  if (typeof mutablePayload.settlement === "string") {
    mutablePayload.settlement = mutablePayload.settlement.trim() || null;
  }

  if (typeof mutablePayload.generation_input === "string") {
    mutablePayload.generation_input = mutablePayload.generation_input.trim() || null;
  }

  if (Object.prototype.hasOwnProperty.call(mutablePayload, "location_wkt")) {
    const raw = mutablePayload.location_wkt;
    delete mutablePayload.location_wkt;
    if (raw === null) {
      mutablePayload.location = null;
    } else if (typeof raw === "string" && raw.trim()) {
      mutablePayload.location = raw.trim();
    }
  }

  const payload = {
    ...mutablePayload,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseServerClient
    .from("places")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to update place.");
  }

  return data as Place;
}

export async function deletePlaceById(id: string): Promise<void> {
  const { error } = await supabaseServerClient.from("places").delete().eq("id", id);
  if (error) throw error;
}

export async function listPublishedPlaceMarkers(): Promise<PlaceMarker[]> {
  const { data, error } = await supabaseServerClient
    .from("place_markers_v1")
    .select("id,slug,name,place_type,status,location_precision,sensitivity_level,is_beginner_friendly,lat,lng,updated_at")
    .eq("status", "published")
    .neq("location_precision", "hidden")
    .not("lat", "is", null)
    .not("lng", "is", null)
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as PlaceMarker[];
}

export async function getPlaceMarkerById(placeId: string): Promise<PlaceMarker | null> {
  const { data, error } = await supabaseServerClient
    .from("place_markers_v1")
    .select("id,slug,name,place_type,status,location_precision,sensitivity_level,is_beginner_friendly,lat,lng,updated_at")
    .eq("id", placeId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data ?? null) as PlaceMarker | null;
}
