import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getAdminUserFromCookies } from "@/lib/auth";
import { getBirdById, updateBird } from "@/lib/birdService";
import { scienceDossierSchemaV1 } from "@/lib/imageAccuracySchemas";
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

  if (bird.status !== "text_approved" && bird.status !== "images_generated") {
    return NextResponse.json(
      { error: "Science dossier can only be edited when bird.status is text_approved or images_generated." },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const schemaVersion = typeof body?.schema_version === "string" ? body.schema_version : "v1";

  try {
    const payload = scienceDossierSchemaV1.parse(body?.payload);
    const dossier = await upsertScienceDossierDraft({
      bird_id: bird.id,
      schema_version: schemaVersion,
      payload,
      created_by: "human",
    });

    await updateBird({ id: bird.id, science_dossier_status: "generated" });

    return NextResponse.json({ data: { dossier } }, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Science dossier validation failed", issues: error.issues },
        { status: 422 }
      );
    }
    return NextResponse.json(
      { error: (error as Error)?.message ?? "Unable to save science dossier." },
      { status: 400 }
    );
  }
}
