import { NextRequest, NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { getBirdById, updateBird } from "@/lib/birdService";
import { getLatestContentBlockForBird } from "@/lib/contentService";
import { generateScienceDossierV1 } from "@/lib/imageAccuracyGeneration";
import { upsertScienceDossierDraft } from "@/lib/scienceDossierService";

export async function POST(
  request: NextRequest,
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

  if (bird.status !== "text_approved") {
    return NextResponse.json(
      { error: "Science dossier can only be generated when bird.status is text_approved." },
      { status: 400 }
    );
  }

  const contentBlock = await getLatestContentBlockForBird(bird.id);
  const fieldGuideDossier = contentBlock?.blocks_json ?? null;

  try {
    const result = await generateScienceDossierV1({
      bird,
      dossier: fieldGuideDossier,
    });

    const saved = await upsertScienceDossierDraft({
      bird_id: bird.id,
      schema_version: "v1",
      payload: result.payload,
      created_by: "ai",
    });

    await updateBird({ id: bird.id, science_dossier_status: "generated" });

    return NextResponse.json({ data: { dossier: saved } }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message ?? "Unable to generate science dossier." },
      { status: 400 }
    );
  }
}
