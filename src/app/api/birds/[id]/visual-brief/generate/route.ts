import { NextRequest, NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { getBirdById, updateBird } from "@/lib/birdService";
import { getScienceDossierForBird } from "@/lib/scienceDossierService";
import { generateVisualBriefV1 } from "@/lib/imageAccuracyGeneration";
import { upsertVisualBriefDraft } from "@/lib/visualBriefService";
import { getLatestContentBlockForBird } from "@/lib/contentService";
import { scienceDossierSchemaV1 } from "@/lib/imageAccuracySchemas";

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

  if (bird.status !== "text_approved" && bird.status !== "images_generated") {
    return NextResponse.json(
      { error: "Visual brief can only be generated when bird.status is text_approved or images_generated." },
      { status: 400 }
    );
  }

  const science = await getScienceDossierForBird(bird.id);
  if (!science) {
    return NextResponse.json(
      { error: "Science dossier not found. Generate it first." },
      { status: 404 }
    );
  }

  const contentBlock = await getLatestContentBlockForBird(bird.id);
  const fieldGuideDossier = contentBlock?.blocks_json ?? null;

  try {
    const parsedScience = scienceDossierSchemaV1.parse(science.payload);
    const result = await generateVisualBriefV1({
      bird,
      dossier: fieldGuideDossier,
      scienceDossier: parsedScience,
    });

    const saved = await upsertVisualBriefDraft({
      bird_id: bird.id,
      schema_version: "v1",
      payload: result.payload,
      created_by: "ai",
    });

    await updateBird({ id: bird.id, visual_brief_status: "generated" });

    return NextResponse.json({ data: { brief: saved } }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message ?? "Unable to generate visual brief." },
      { status: 400 }
    );
  }
}
