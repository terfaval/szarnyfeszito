import { NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { getLatestContentBlockForBird } from "@/lib/contentService";
import { getBirdById, updateBird } from "@/lib/birdService";
import { BirdColorTag } from "@/types/bird";

const BIRD_COLOR_TAGS: BirdColorTag[] = [
  "white",
  "black",
  "grey",
  "brown",
  "yellow",
  "orange",
  "red",
  "green",
  "blue",
];

function isBirdColorTag(value: unknown): value is BirdColorTag {
  return typeof value === "string" && BIRD_COLOR_TAGS.includes(value as BirdColorTag);
}

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

  if (Array.isArray(bird.color_tags) && bird.color_tags.length > 0) {
    return NextResponse.json({ data: { bird, changed: false, reason: "already_set" } });
  }

  const block = await getLatestContentBlockForBird(bird.id);

  if (!block?.blocks_json) {
    return NextResponse.json(
      { error: "No dossier found for this bird. Generate the dossier first." },
      { status: 400 }
    );
  }

  const nextTag = (block.blocks_json as { pill_meta?: { color_bg?: unknown } })?.pill_meta?.color_bg;

  if (!isBirdColorTag(nextTag)) {
    return NextResponse.json(
      { error: "Dossier is missing a valid pill_meta.color_bg for color_tags refill." },
      { status: 400 }
    );
  }

  const updated = await updateBird({
    id: bird.id,
    color_tags: [nextTag],
  });

  return NextResponse.json({ data: { bird: updated, changed: true, color_tag: nextTag } });
}

