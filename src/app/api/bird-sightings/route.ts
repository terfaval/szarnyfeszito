import { NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { createBirdSighting, listBirdSightingsForUser } from "@/lib/birdSightingService";
import { supabaseServerClient } from "@/lib/supabaseServerClient";
import { isUuid } from "@/lib/birdService";

function parseLimit(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return Math.floor(parsed);
}

export async function GET(request: Request) {
  const user = await getAdminUserFromCookies();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = parseLimit(url.searchParams.get("limit"));

  const sightings = await listBirdSightingsForUser(user.id, { limit });
  return NextResponse.json({ data: sightings });
}

export async function POST(request: Request) {
  const user = await getAdminUserFromCookies();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const placeId = typeof body.placeId === "string" ? body.placeId.trim() : "";
  const birdIdsRaw = body.birdIds;
  const seenAt = typeof body.seenAt === "string" ? body.seenAt : undefined;
  const notes = typeof body.notes === "string" ? body.notes : null;

  if (!placeId || !isUuid(placeId)) {
    return NextResponse.json({ error: "placeId is required (uuid)." }, { status: 400 });
  }

  if (!Array.isArray(birdIdsRaw)) {
    return NextResponse.json({ error: "birdIds is required (array)." }, { status: 400 });
  }

  const birdIds = birdIdsRaw
    .filter((value) => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => isUuid(value));

  const uniqueBirdIds = Array.from(new Set(birdIds));

  if (uniqueBirdIds.length === 0) {
    return NextResponse.json({ error: "At least one bird must be selected." }, { status: 400 });
  }

  if (uniqueBirdIds.length > 12) {
    return NextResponse.json({ error: "Too many birds selected (max 12)." }, { status: 400 });
  }

  const { data: place, error: placeError } = await supabaseServerClient
    .from("places")
    .select("id")
    .eq("id", placeId)
    .maybeSingle();

  if (placeError || !place) {
    return NextResponse.json({ error: "Place not found." }, { status: 404 });
  }

  const { data: birds, error } = await supabaseServerClient
    .from("birds")
    .select("id,status")
    .in("id", uniqueBirdIds)
    .eq("status", "published");

  if (error) {
    return NextResponse.json({ error: (error as Error)?.message ?? "Unable to validate birds." }, { status: 400 });
  }

  type BirdValidationRow = { id?: unknown };
  const foundIds = new Set(
    ((birds ?? []) as BirdValidationRow[])
      .map((row) => (typeof row.id === "string" ? row.id : ""))
      .filter((id): id is string => Boolean(id))
  );
  const missing = uniqueBirdIds.filter((id) => !foundIds.has(id));
  if (missing.length > 0) {
    return NextResponse.json({ error: "Some birds are missing or not published." }, { status: 400 });
  }

  try {
    const sighting = await createBirdSighting({
      createdBy: user.id,
      placeId,
      birdIds: uniqueBirdIds,
      seenAt,
      notes,
    });
    return NextResponse.json({ data: sighting }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error)?.message ?? "Unable to create sighting." },
      { status: 400 }
    );
  }
}
