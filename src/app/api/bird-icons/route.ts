import { NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { isUuid } from "@/lib/birdService";
import { listLatestDossierBlocksForBirds } from "@/lib/contentService";
import { getSignedImageUrl, listCurrentIconicImagesForBirds } from "@/lib/imageService";

const habitatIconForClass = (habitatClass: unknown) => {
  if (typeof habitatClass !== "string") {
    return null;
  }

  switch (habitatClass.trim().toLowerCase()) {
    case "erdő":
      return "/BIRDS/ICONS/BACKGROUND/ICON_FOREST.svg";
    case "vízpart":
      return "/BIRDS/ICONS/BACKGROUND/ICON_WATER.svg";
    case "puszta":
      return "/BIRDS/ICONS/BACKGROUND/ICON_GRASSLAND.svg";
    case "hegy":
      return "/BIRDS/ICONS/BACKGROUND/ICON_MOUNTAIN.svg";
    case "város":
      return "/BIRDS/ICONS/BACKGROUND/ICON_CITY.svg";
    default:
      return null;
  }
};

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

  if (ids.length === 0) {
    return NextResponse.json({ data: {} });
  }

  const dossierByBirdId = await listLatestDossierBlocksForBirds(ids);
  const habitatSrcByBirdId: Record<string, string | null> = {};
  for (const birdId of ids) {
    const dossier = dossierByBirdId.get(birdId);
    habitatSrcByBirdId[birdId] = habitatIconForClass(dossier?.pill_meta?.habitat_class);
  }

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

