import { NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { getBirdById, updateBird } from "@/lib/birdService";
import {
  computeHabitatStockAssetKeysForPlaceTypes,
  listApprovedPublishedPlaceTypesForBird,
  listHabitatStockAssets,
} from "@/lib/habitatStockAssetService";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getAdminUserFromCookies();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await context.params;
  const bird = await getBirdById(params.id);

  if (!bird) {
    return NextResponse.json({ error: "Bird not found." }, { status: 404 });
  }

  const existingKeys = Array.isArray(bird.habitat_stock_asset_keys)
    ? bird.habitat_stock_asset_keys.filter(Boolean)
    : [];
  if (existingKeys.length > 0) {
    return NextResponse.json({ data: { bird, changed: false, reason: "already_set" } });
  }

  const [assets, placeTypes] = await Promise.all([
    listHabitatStockAssets(),
    listApprovedPublishedPlaceTypesForBird(bird.id),
  ]);

  const nextKeys = computeHabitatStockAssetKeysForPlaceTypes({
    placeTypes,
    assets,
  });

  if (nextKeys.length === 0) {
    return NextResponse.json(
      {
        error:
          "No habitat assets could be derived for this bird (no approved published place links or no matching habitat groups).",
      },
      { status: 400 }
    );
  }

  const updated = await updateBird({
    id: bird.id,
    habitat_stock_asset_keys: nextKeys,
  });

  return NextResponse.json({ data: { bird: updated, changed: true, habitat_stock_asset_keys: nextKeys } });
}

