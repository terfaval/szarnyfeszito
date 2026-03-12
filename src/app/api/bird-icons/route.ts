import { NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { isUuid, listHabitatStockAssetKeysForBirds } from "@/lib/birdService";
import { listLatestDossierBlocksForBirds } from "@/lib/contentService";
import { habitatIconForClass } from "@/lib/habitatIcons";
import { getSignedImageUrl, listCurrentIconicImagesForBirds } from "@/lib/imageService";
import { getPlaceById } from "@/lib/placeService";
import {
  getSignedApprovedHabitatTileUrlsByAssetKeys,
  listHabitatStockAssets,
  resolveHabitatStockAssetKeyForPlaceType,
} from "@/lib/habitatStockAssetService";

function parseIds(url: URL) {
  const raw = [
    ...url.searchParams.getAll("id"),
    ...(url.searchParams.get("ids")?.split(",") ?? []),
  ]
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value) => isUuid(value));

  return Array.from(new Set(raw)).slice(0, 60);
}

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getAdminUserFromCookies();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const ids = parseIds(url);
  const placeId = url.searchParams.get("place_id")?.trim() ?? "";
  const explicitHabitatKey = url.searchParams.get("habitat_stock_asset_key")?.trim() ?? "";

  if (ids.length === 0) {
    return NextResponse.json({ data: {} });
  }

  const [assets, habitatKeysByBirdId] = await Promise.all([
    listHabitatStockAssets(),
    listHabitatStockAssetKeysForBirds(ids),
  ]);

  const placeHabitatKey = placeId
    ? (() => {
        return getPlaceById(placeId)
          .then((place) => {
            if (!place) return null;
            return resolveHabitatStockAssetKeyForPlaceType({
              placeType: place.place_type,
              assets,
            });
          })
          .catch(() => null);
      })()
    : Promise.resolve(null);

  const resolvedPlaceKey = await placeHabitatKey;

  const desiredKeyByBirdId = new Map<string, string | null>();
  ids.forEach((birdId) => {
    const birdKeys = habitatKeysByBirdId.get(birdId) ?? [];
    const fallbackKey = birdKeys[0] ?? null;
    desiredKeyByBirdId.set(
      birdId,
      explicitHabitatKey || resolvedPlaceKey || fallbackKey || null
    );
  });

  const keysToSign = Array.from(
    new Set(Array.from(desiredKeyByBirdId.values()).filter((k): k is string => typeof k === "string" && k.length > 0))
  );
  const tileUrlByKey = await getSignedApprovedHabitatTileUrlsByAssetKeys(keysToSign);

  const dossierByBirdId = await listLatestDossierBlocksForBirds(ids);
  const habitatSrcByBirdId: Record<string, string | null> = {};
  ids.forEach((birdId) => {
    const key = desiredKeyByBirdId.get(birdId) ?? null;
    const tile = key ? tileUrlByKey.get(key) ?? null : null;
    if (tile) {
      habitatSrcByBirdId[birdId] = tile;
      return;
    }

    const dossier = dossierByBirdId.get(birdId);
    habitatSrcByBirdId[birdId] = habitatIconForClass(dossier?.pill_meta?.habitat_class);
  });

  const iconicImages = await listCurrentIconicImagesForBirds(ids);
  const iconicSrcByBirdId: Record<string, string | null> = {};
  await Promise.all(
    iconicImages.map(async (image) => {
      const signedUrl = await getSignedImageUrl(image.storage_path);
      iconicSrcByBirdId[image.entity_id] = signedUrl ?? null;
    })
  );

  const data: Record<string, { habitatSrc: string | null; iconicSrc: string | null }> = {};
  ids.forEach((id) => {
    data[id] = {
      habitatSrc: habitatSrcByBirdId[id] ?? null,
      iconicSrc: iconicSrcByBirdId[id] ?? null,
    };
  });

  return NextResponse.json({ data });
}
