import { NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { getBirdById } from "@/lib/birdService";
import { getLatestContentBlockForBird } from "@/lib/contentService";
import { generateBirdDistributionMapV1 } from "@/lib/distributionMapGeneration";
import { upsertDistributionMapForBird } from "@/lib/distributionMapService";

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
  const dossier = block?.blocks_json ?? null;

  try {
    const result = await generateBirdDistributionMapV1({ bird, dossier });
    const record = await upsertDistributionMapForBird({
      birdId: bird.id,
      payload: result.payload,
      generation_meta: {
        model: result.model,
        prompt_hash: result.prompt_hash,
        generated_at: result.generated_at,
      },
    });

    return NextResponse.json({ data: { distribution_map: record } });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message ?? "Unable to generate distribution map." },
      { status: 400 }
    );
  }
}

