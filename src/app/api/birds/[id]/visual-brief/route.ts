import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getAdminUserFromCookies } from "@/lib/auth";
import { getBirdById, updateBird } from "@/lib/birdService";
import { visualBriefSchemaV1 } from "@/lib/imageAccuracySchemas";
import { upsertVisualBriefDraft } from "@/lib/visualBriefService";

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
      { error: "Visual brief can only be edited when bird.status is text_approved." },
      { status: 400 }
    );
  }

  if (bird.science_dossier_status !== "approved") {
    return NextResponse.json(
      { error: "Visual brief requires an approved science dossier first." },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const schemaVersion = typeof body?.schema_version === "string" ? body.schema_version : "v1";

  try {
    const payload = visualBriefSchemaV1.parse(body?.payload);
    const brief = await upsertVisualBriefDraft({
      bird_id: bird.id,
      schema_version: schemaVersion,
      payload,
      created_by: "human",
    });

    await updateBird({ id: bird.id, visual_brief_status: "generated" });

    return NextResponse.json({ data: { brief } }, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Visual brief validation failed", issues: error.issues },
        { status: 422 }
      );
    }
    return NextResponse.json(
      { error: (error as Error)?.message ?? "Unable to save visual brief." },
      { status: 400 }
    );
  }
}

