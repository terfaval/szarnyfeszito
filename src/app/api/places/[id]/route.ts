import { NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { getPlaceById, updatePlace } from "@/lib/placeService";
import { getLatestApprovedContentBlockForPlace } from "@/lib/placeContentService";
import { normalizePlaceNotableUnits } from "@/lib/placeNotableUnits";
import { PLACE_STATUS_VALUES, PLACE_TYPE_VALUES, type PlaceNotableUnit, type PlaceStatus, type PlaceType } from "@/types/place";
import { supabaseServerClient } from "@/lib/supabaseServerClient";

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePlaceTypes(input: unknown): PlaceType[] | null {
  if (!Array.isArray(input)) {
    return null;
  }

  const unique = Array.from(
    new Set(
      input
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean)
    )
  ).filter((value): value is PlaceType => PLACE_TYPE_VALUES.includes(value as PlaceType));

  return unique;
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getAdminUserFromCookies();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const existing = await getPlaceById(id);
  if (!existing) {
    return NextResponse.json({ error: "Place not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const notableUnitsRaw = body?.notable_units_json;
  const hasNotableUnitsUpdate = Object.prototype.hasOwnProperty.call(body ?? {}, "notable_units_json");
  const hasLeafletRegionUpdate = Object.prototype.hasOwnProperty.call(body ?? {}, "leaflet_region_id");

  let notableUnitsUpdate: PlaceNotableUnit[] | null | undefined = undefined;
  if (hasNotableUnitsUpdate) {
    if (notableUnitsRaw === null) {
      notableUnitsUpdate = null;
    } else if (Array.isArray(notableUnitsRaw)) {
      notableUnitsUpdate = normalizePlaceNotableUnits(notableUnitsRaw);
    } else {
      return NextResponse.json(
        { error: "notable_units_json must be a JSON array (or null)." },
        { status: 400 }
      );
    }
  }

  let leafletRegionUpdate: string | null | undefined = undefined;
  if (hasLeafletRegionUpdate) {
    const raw = asString(body?.leaflet_region_id);
    leafletRegionUpdate = raw ? raw : null;

    if (leafletRegionUpdate) {
      const { data, error } = await supabaseServerClient
        .from("distribution_region_catalog_items")
        .select("catalog,scope,type")
        .eq("region_id", leafletRegionUpdate)
        .maybeSingle();

      if (error) {
        return NextResponse.json(
          { error: "Unable to validate leaflet_region_id." },
          { status: 500 }
        );
      }

      const catalog = String(data?.catalog ?? "");
      const scope = String(data?.scope ?? "");
      const type = String(data?.type ?? "");
      const isHungaryLeaflet =
        catalog === "hungaryRegions" && scope === "hungary" && (type === "spa" || type === "microregion");
      const isExtendedSpa =
        catalog === "hungaryExtendedRegions" && scope === "hungary_extended" && type === "spa";
      if (!isHungaryLeaflet && !isExtendedSpa) {
        return NextResponse.json(
          {
            error:
              "leaflet_region_id must reference a HU Natura SPA, HU microregion, or Hungary-extended SPA catalog item.",
          },
          { status: 400 }
        );
      }
    }
  }

  const requestedStatusRaw = asString(body?.status);
  const requestedStatus = requestedStatusRaw || undefined;
  const requestedPlaceType = asString(body?.place_type) || "";
  const requestedPlaceTypes = normalizePlaceTypes(body?.place_types);

  if (requestedStatus && !PLACE_STATUS_VALUES.includes(requestedStatus as PlaceStatus)) {
    return NextResponse.json(
      { error: `status must be one of: ${PLACE_STATUS_VALUES.join(", ")}` },
      { status: 400 }
    );
  }

  if (requestedPlaceType && !PLACE_TYPE_VALUES.includes(requestedPlaceType as PlaceType)) {
    return NextResponse.json(
      { error: `place_type must be one of: ${PLACE_TYPE_VALUES.join(", ")}` },
      { status: 400 }
    );
  }

  if (requestedPlaceTypes && requestedPlaceTypes.length === 0) {
    return NextResponse.json(
      { error: `place_types must contain valid values: ${PLACE_TYPE_VALUES.join(", ")}` },
      { status: 400 }
    );
  }

  if (existing.status === "published" && requestedStatus && requestedStatus !== "published") {
    return NextResponse.json(
      { error: "Published places cannot be moved back to an earlier status." },
      { status: 400 }
    );
  }

  if (requestedStatus === "published") {
    const missing: string[] = [];
    if (!asString(body?.name || existing.name)) missing.push("name");
    if (!asString(body?.slug || existing.slug)) missing.push("slug");
    if (!asString(body?.place_type || existing.place_type)) missing.push("place_type");
    if (!asString(body?.region_landscape || existing.region_landscape)) missing.push("region_landscape");
    if (!asString(body?.county || existing.county)) missing.push("county");
    if (!asString(body?.nearest_city || existing.nearest_city)) missing.push("nearest_city");

    const latestContent = await getLatestApprovedContentBlockForPlace(existing.id);
    if (!latestContent || latestContent.review_status !== "approved") {
      missing.push("approved_content_blocks");
    } else {
      const variants = latestContent.blocks_json?.variants ?? null;
      const seasonal = variants?.seasonal_snippet ?? null;
      if (!variants) {
        missing.push("content.short");
        missing.push("content.ethics_tip");
        missing.push("content.seasonal_snippet");
      } else {
        if (!asString(variants.short)) missing.push("content.short");
        if (!asString(variants.ethics_tip)) missing.push("content.ethics_tip");
      }
      if (
        !seasonal ||
        !asString(seasonal.spring) ||
        !asString(seasonal.summer) ||
        !asString(seasonal.autumn) ||
        !asString(seasonal.winter)
      ) {
        missing.push("content.seasonal_snippet");
      }
    }

    if (missing.length > 0) {
      return NextResponse.json(
        { error: "Place is not publish-ready.", missing },
        { status: 409 }
      );
    }

    const { data: heroImage, error: heroError } = await supabaseServerClient
      .from("images")
      .select("id")
      .eq("entity_type", "place")
      .eq("entity_id", existing.id)
      .eq("style_family", "scientific")
      .eq("variant", "place_hero_spring_v1")
      .eq("is_current", true)
      .eq("review_status", "approved")
      .maybeSingle();

    if (heroError) {
      return NextResponse.json({ error: "Unable to validate place hero image." }, { status: 500 });
    }

    if (!heroImage) {
      return NextResponse.json(
        { error: "Place is not publish-ready.", missing: ["image.place_hero_spring_v1"] },
        { status: 409 }
      );
    }
  }

  const nextRevision =
    requestedStatus === "published" ? (existing.published_revision ?? 0) + 1 : undefined;

  const updated = await updatePlace({
    id: existing.id,
    slug: typeof body?.slug === "string" ? body.slug : undefined,
    name: typeof body?.name === "string" ? body.name : undefined,
    place_type: requestedPlaceType ? (requestedPlaceType as PlaceType) : undefined,
    place_types:
      requestedPlaceTypes
        ? Array.from(
            new Set([
              ...(requestedPlaceTypes ?? []),
              (requestedPlaceType ? (requestedPlaceType as PlaceType) : existing.place_type),
            ])
          )
        : undefined,
    status: requestedStatus ? (requestedStatus as PlaceStatus) : undefined,
    region_landscape: typeof body?.region_landscape === "string" ? body.region_landscape : undefined,
    county: typeof body?.county === "string" ? body.county : undefined,
    district: typeof body?.district === "string" ? body.district : undefined,
    nearest_city: typeof body?.nearest_city === "string" ? body.nearest_city : undefined,
    distance_from_nearest_city_km:
      typeof body?.distance_from_nearest_city_km === "number" ? body.distance_from_nearest_city_km : undefined,
    settlement: typeof body?.settlement === "string" ? body.settlement : undefined,
    location_wkt: typeof body?.location_wkt === "string" ? body.location_wkt : body?.location_wkt === null ? null : undefined,
    location_precision: typeof body?.location_precision === "string" ? body.location_precision : undefined,
    sensitivity_level: typeof body?.sensitivity_level === "string" ? body.sensitivity_level : undefined,
    is_beginner_friendly: typeof body?.is_beginner_friendly === "boolean" ? body.is_beginner_friendly : undefined,
    access_note: typeof body?.access_note === "string" ? body.access_note : body?.access_note === null ? null : undefined,
    parking_note: typeof body?.parking_note === "string" ? body.parking_note : body?.parking_note === null ? null : undefined,
    best_visit_note: typeof body?.best_visit_note === "string" ? body.best_visit_note : body?.best_visit_note === null ? null : undefined,
    notable_units_json: hasNotableUnitsUpdate ? notableUnitsUpdate : undefined,
    generation_input: typeof body?.generation_input === "string" ? body.generation_input : body?.generation_input === null ? null : undefined,
    leaflet_region_id: hasLeafletRegionUpdate ? leafletRegionUpdate : undefined,
    published_at: requestedStatus === "published" ? new Date().toISOString() : undefined,
    published_revision: requestedStatus === "published" ? nextRevision : undefined,
  });

  return NextResponse.json({ data: { place: updated } });
}
