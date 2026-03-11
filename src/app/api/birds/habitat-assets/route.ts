import { NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { getSignedImageUrl } from "@/lib/imageService";
import {
  listCurrentHabitatStockAssetImages,
  listHabitatStockAssets,
} from "@/lib/habitatStockAssetService";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAdminUserFromCookies();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const assets = await listHabitatStockAssets();
    const images = await listCurrentHabitatStockAssetImages(assets.map((a) => a.id));
    const imageByAssetId = new Map<string, (typeof images)[number]>();
    images.forEach((img) => {
      imageByAssetId.set(img.entity_id, img);
    });

    const data = await Promise.all(
      assets.map(async (asset) => {
        const image = imageByAssetId.get(asset.id) ?? null;
        const signedUrl = image ? await getSignedImageUrl(image.storage_path) : null;

        return {
          asset: {
            id: asset.id,
            key: asset.key,
            label_hu: asset.label_hu,
            place_types: asset.place_types ?? [],
            sort: asset.sort ?? 0,
          },
          currentImage: image
            ? {
                id: image.id,
                review_status: image.review_status,
                storage_path: image.storage_path,
                signedUrl,
                updated_at: image.updated_at,
              }
            : null,
        };
      })
    );

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message ?? "Unable to load habitat assets." },
      { status: 400 }
    );
  }
}
