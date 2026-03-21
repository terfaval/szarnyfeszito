import { NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { isUuid } from "@/lib/birdService";
import { getSignedImageUrl, listCurrentIconicImagesForBirds } from "@/lib/imageService";

const MAX_IDS = 40;

function parseIds(url: URL) {
  const raw = [
    ...url.searchParams.getAll("id"),
    ...(url.searchParams.get("ids")?.split(",") ?? []),
  ]
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value) => isUuid(value));

  return Array.from(new Set(raw)).slice(0, MAX_IDS);
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

  try {
    const images = await listCurrentIconicImagesForBirds(ids);
    const storagePathByBirdId = new Map(images.map((row) => [row.entity_id, row.storage_path]));
    const data: Record<string, string | null> = {};

    await Promise.all(
      ids.map(async (id) => {
        const storagePath = storagePathByBirdId.get(id);
        if (typeof storagePath !== "string" || !storagePath) {
          data[id] = null;
          return;
        }
        const signedUrl = await getSignedImageUrl(storagePath);
        data[id] = signedUrl ?? null;
      })
    );

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message ?? "Unable to load iconic previews." },
      { status: 400 }
    );
  }
}
