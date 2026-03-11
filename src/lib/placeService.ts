import { supabaseServerClient } from "@/lib/supabaseServerClient";
import { normalizeHungarianName } from "@/lib/stringUtils";
import {
  Place,
  PlaceNotableUnit,
  PlaceMarker,
  PlaceStatus,
  PlaceType,
  PLACE_STATUS_VALUES,
  PLACE_TYPE_VALUES,
} from "@/types/place";
import { getDistributionRegionBboxesById } from "@/lib/distributionRegionCatalogService";

type ListPlacesOptions = {
  search?: string;
  status?: PlaceStatus | null;
  place_type?: PlaceType | null;
  county?: string | null;
  region_landscape?: string | null;
};

const PLACE_SELECT =
  "id,slug,name,place_type,place_types,status,leaflet_region_id,region_landscape,county,district,nearest_city,distance_from_nearest_city_km,settlement,location_precision,sensitivity_level,is_beginner_friendly,access_note,parking_note,best_visit_note,notable_units_json,generation_input,published_at,published_revision,created_at,updated_at";

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

export async function listAllPlaceLeafletRegionIds(): Promise<string[]> {
  const { data, error } = await supabaseServerClient
    .from("places")
    .select("leaflet_region_id")
    .not("leaflet_region_id", "is", null)
    .limit(5000);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  return Array.from(
    new Set(rows.map((row) => String(row.leaflet_region_id ?? "").trim()).filter(Boolean))
  );
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
  place_types?: PlaceType[] | null;
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
    place_types:
      input.place_types && input.place_types.length > 0
        ? Array.from(new Set(input.place_types))
        : [input.place_type],
    status: "draft" as const,
    leaflet_region_id: null,
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
  place_types?: PlaceType[] | null;
  status?: PlaceStatus;
  leaflet_region_id?: string | null;
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
  notable_units_json?: PlaceNotableUnit[] | null;
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

  if (Array.isArray(mutablePayload.place_types)) {
    const unique = Array.from(
      new Set(
        (mutablePayload.place_types as unknown[])
          .filter((value): value is string => typeof value === "string")
          .map((value) => value.trim())
          .filter(Boolean)
      )
    );
    mutablePayload.place_types = unique;
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

  if (typeof mutablePayload.leaflet_region_id === "string") {
    mutablePayload.leaflet_region_id = mutablePayload.leaflet_region_id.trim() || null;
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
    .select(
      "id,slug,name,place_type,status,location_precision,sensitivity_level,is_beginner_friendly,leaflet_region_id,lat,lng,updated_at"
    )
    .eq("status", "published")
    .neq("location_precision", "hidden")
    .not("lat", "is", null)
    .not("lng", "is", null)
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    id: String(row.id ?? ""),
    slug: String(row.slug ?? ""),
    name: String(row.name ?? ""),
    place_type: row.place_type as PlaceMarker["place_type"],
    status: row.status as PlaceMarker["status"],
    location_precision: row.location_precision as PlaceMarker["location_precision"],
    sensitivity_level: row.sensitivity_level as PlaceMarker["sensitivity_level"],
    is_beginner_friendly: Boolean(row.is_beginner_friendly),
    leaflet_region_id: typeof row.leaflet_region_id === "string" ? row.leaflet_region_id : null,
    lat: typeof row.lat === "number" ? row.lat : null,
    lng: typeof row.lng === "number" ? row.lng : null,
    updated_at: String(row.updated_at ?? ""),
  }));
}

export async function listPublishedPlaceDashboardMarkers(): Promise<PlaceMarker[]> {
  const { data, error } = await supabaseServerClient
    .from("place_markers_v1")
    .select(
      "id,slug,name,place_type,status,location_precision,sensitivity_level,is_beginner_friendly,leaflet_region_id,lat,lng,updated_at"
    )
    .eq("status", "published")
    .neq("location_precision", "hidden")
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const regionIds = Array.from(
    new Set(rows.map((r) => String(r.leaflet_region_id ?? "").trim()).filter(Boolean))
  );
  let bboxById: Record<string, { south: number; west: number; north: number; east: number }> = {};
  try {
    bboxById = await getDistributionRegionBboxesById(regionIds);
  } catch {
    bboxById = {};
  }

  const out: PlaceMarker[] = [];
  rows.forEach((row) => {
    const leafletRegionId = String(row.leaflet_region_id ?? "").trim();
    const bbox = leafletRegionId ? bboxById[leafletRegionId] : undefined;
    const pinLat =
      bbox && Number.isFinite(bbox.south) && Number.isFinite(bbox.north)
        ? (bbox.south + bbox.north) / 2
        : (typeof row.lat === "number" ? row.lat : null);
    const pinLng =
      bbox && Number.isFinite(bbox.west) && Number.isFinite(bbox.east)
        ? (bbox.west + bbox.east) / 2
        : (typeof row.lng === "number" ? row.lng : null);

    if (pinLat === null || pinLng === null) return;

    out.push({
      id: String(row.id ?? ""),
      slug: String(row.slug ?? ""),
      name: String(row.name ?? ""),
      place_type: row.place_type as PlaceType,
      status: row.status as PlaceStatus,
      location_precision: row.location_precision as PlaceMarker["location_precision"],
      sensitivity_level: row.sensitivity_level as PlaceMarker["sensitivity_level"],
      is_beginner_friendly: Boolean(row.is_beginner_friendly),
      leaflet_region_id: leafletRegionId || null,
      lat: pinLat,
      lng: pinLng,
      updated_at: String(row.updated_at ?? ""),
    });
  });

  return out;
}

export async function getPlaceMarkerById(placeId: string): Promise<PlaceMarker | null> {
  const { data, error } = await supabaseServerClient
    .from("place_markers_v1")
    .select(
      "id,slug,name,place_type,status,location_precision,sensitivity_level,is_beginner_friendly,leaflet_region_id,lat,lng,updated_at"
    )
    .eq("id", placeId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const row = (data ?? null) as Record<string, unknown> | null;
  if (!row) return null;
  return {
    id: String(row.id ?? ""),
    slug: String(row.slug ?? ""),
    name: String(row.name ?? ""),
    place_type: row.place_type as PlaceMarker["place_type"],
    status: row.status as PlaceMarker["status"],
    location_precision: row.location_precision as PlaceMarker["location_precision"],
    sensitivity_level: row.sensitivity_level as PlaceMarker["sensitivity_level"],
    is_beginner_friendly: Boolean(row.is_beginner_friendly),
    leaflet_region_id: typeof row.leaflet_region_id === "string" ? row.leaflet_region_id : null,
    lat: typeof row.lat === "number" ? row.lat : null,
    lng: typeof row.lng === "number" ? row.lng : null,
    updated_at: String(row.updated_at ?? ""),
  };
}

export async function listPublishedPlacesByPrimaryType(placeTypes: PlaceType[]): Promise<
  Array<Pick<Place, "id" | "slug" | "name" | "place_type">>
> {
  const unique = Array.from(new Set(placeTypes)).filter(Boolean);
  if (unique.length === 0) {
    return [];
  }

  const { data, error } = await supabaseServerClient
    .from("places")
    .select("id,slug,name,place_type")
    .eq("status", "published")
    .in("place_type", unique)
    .order("name", { ascending: true })
    .limit(500);

  if (error) {
    throw error;
  }

  return (data ?? []) as Array<Pick<Place, "id" | "slug" | "name" | "place_type">>;
}
