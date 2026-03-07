import { NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { getBirdById } from "@/lib/birdService";
import { getLatestContentBlockForBird, updateContentBlock } from "@/lib/contentService";
import { generateLeafletsV2 } from "@/lib/leafletsGeneration";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUserFromCookies();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await context.params;
  const bird = await getBirdById(params.id);

  if (!bird) {
    return NextResponse.json({ error: "Bird not found" }, { status: 404 });
  }

  const block = await getLatestContentBlockForBird(bird.id);

  if (!block?.blocks_json) {
    return NextResponse.json(
      { error: "No dossier found for this bird. Generate the dossier first." },
      { status: 400 }
    );
  }

  try {
    const result = await generateLeafletsV2({
      bird,
      dossier: block.blocks_json,
      source: "backfill",
    });

    const updated = await updateContentBlock(block.id, {
      blocks_json: {
        ...block.blocks_json,
        leaflets: result.leaflets,
      },
    });

    return NextResponse.json({ data: { content_block: updated } });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message ?? "Unable to backfill leaflets." },
      { status: 400 }
    );
  }
}
