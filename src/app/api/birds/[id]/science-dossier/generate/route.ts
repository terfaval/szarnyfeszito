import { NextRequest, NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { getBirdById, updateBird } from "@/lib/birdService";
import { getLatestContentBlockForBird } from "@/lib/contentService";
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

  if (bird.status !== "text_approved") {
    return NextResponse.json(
      { error: "Science dossier can only be generated when bird.status is text_approved." },
      { status: 400 }
    );
  }

  const contentBlock = await getLatestContentBlockForBird(bird.id);
  const dossier = contentBlock?.blocks_json;
  const keyMarks =
    dossier?.identification?.key_features
      ?.map((feature) => `${feature.title} — ${feature.description}`.trim())
      .filter(Boolean)
      .slice(0, 8) ?? [];

  const adultText =
    dossier?.identification?.identification_paragraph?.trim() ||
    dossier?.header?.short_summary?.trim() ||
    "Draft: please add key identification details.";

  const payload = scienceDossierSchemaV1.parse({
    species_identity: {
      name_hu: bird.name_hu,
      name_latin: bird.name_latin ?? bird.name_hu,
    },
    confusion_set: [],
    key_field_marks: keyMarks.map((mark) => ({ mark })),
    proportions: {
      neck: "medium",
      legs: "medium",
      body: "average",
      beak: { length: "medium", shape: "straight" },
    },
    plumage_variants: {
      adult: adultText,
      juvenile: "not_applicable",
      breeding: "not_applicable",
      non_breeding: "not_applicable",
    },
    must_not_include: ["wrong species", "fantasy colors", "extra limbs"],
    confidence: {
      per_section: dossier ? "medium" : "low",
      notes: "Generated draft. Please review.",
    },
  });

  try {
    const saved = await upsertScienceDossierDraft({
      bird_id: bird.id,
      schema_version: "v1",
      payload,
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

