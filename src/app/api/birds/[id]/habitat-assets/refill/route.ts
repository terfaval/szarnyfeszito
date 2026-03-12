import { NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { getBirdById, updateBird } from "@/lib/birdService";
import { getLatestApprovedContentBlockForBird } from "@/lib/contentService";
import {
  computeHabitatStockAssetKeysForPlaceTypes,
  listApprovedPublishedPlaceTypesForBird,
  listHabitatStockAssets,
  listPublishedPlaceTypesByNames,
  resolveHabitatStockAssetKeyForHabitatClass,
} from "@/lib/habitatStockAssetService";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getAdminUserFromCookies();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "true";

  const params = await context.params;
  const bird = await getBirdById(params.id);

  if (!bird) {
    return NextResponse.json({ error: "Bird not found." }, { status: 404 });
  }

  const existingKeys = Array.isArray(bird.habitat_stock_asset_keys)
    ? bird.habitat_stock_asset_keys.filter(Boolean)
    : [];
  if (!force && existingKeys.length > 0) {
    return NextResponse.json({ data: { bird, changed: false, reason: "already_set" } });
  }

  const [assets, placeTypesFromLinks] = await Promise.all([
    listHabitatStockAssets(),
    listApprovedPublishedPlaceTypesForBird(bird.id),
  ]);

  let placeTypes = placeTypesFromLinks;
  let nextKeys = computeHabitatStockAssetKeysForPlaceTypes({
    placeTypes,
    assets,
  });

  if (nextKeys.length === 0) {
    const block = await getLatestApprovedContentBlockForBird(bird.id);
    const dossier = block?.blocks_json ?? null;
    const typicalPlaces = Array.isArray(dossier?.typical_places) ? dossier?.typical_places : [];
    const fallbackPlaceTypes = await listPublishedPlaceTypesByNames(typicalPlaces);
    if (fallbackPlaceTypes.length > 0) {
      placeTypes = fallbackPlaceTypes;
      nextKeys = computeHabitatStockAssetKeysForPlaceTypes({
        placeTypes,
        assets,
      });
    }

    if (nextKeys.length === 0) {
      const fallbackKey = resolveHabitatStockAssetKeyForHabitatClass({
        habitatClass: dossier?.pill_meta?.habitat_class ?? null,
        assets,
      });
      if (fallbackKey) {
        nextKeys = [fallbackKey];
      }
    }
  }

  if (nextKeys.length === 0) {
    return NextResponse.json(
      {
        error:
          "No habitat assets could be derived for this bird (no approved published place links, no matching typical places, and no habitat-class fallback).",
      },
      { status: 400 }
    );
  }

  if (existingKeys.length > 0 && existingKeys.join("|") === nextKeys.join("|")) {
    return NextResponse.json({
      data: { bird, changed: false, reason: "no_change", habitat_stock_asset_keys: existingKeys },
    });
  }

  const updated = await updateBird({
    id: bird.id,
    habitat_stock_asset_keys: nextKeys,
  });

  return NextResponse.json({ data: { bird: updated, changed: true, habitat_stock_asset_keys: nextKeys } });
}
