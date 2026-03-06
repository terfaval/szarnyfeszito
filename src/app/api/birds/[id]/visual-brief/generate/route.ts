import { NextRequest, NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { getBirdById, updateBird } from "@/lib/birdService";
import { getScienceDossierForBird } from "@/lib/scienceDossierService";
import { visualBriefSchemaV1 } from "@/lib/imageAccuracySchemas";
import { upsertVisualBriefDraft } from "@/lib/visualBriefService";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractMark(entry: unknown): string | null {
  if (!isRecord(entry)) {
    return null;
  }
  const mark = entry.mark;
  if (typeof mark !== "string") {
    return null;
  }
  const trimmed = mark.trim();
  return trimmed ? trimmed : null;
}

function pickFocusTraits(sciencePayload: unknown): string[] {
  if (!isRecord(sciencePayload)) {
    return [];
  }

  const keyFieldMarks = sciencePayload.key_field_marks;
  if (!Array.isArray(keyFieldMarks)) {
    return [];
  }

  const strings = keyFieldMarks.map(extractMark).filter((mark): mark is string => Boolean(mark));
  return strings.slice(0, 3);
}

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
      { error: "Visual brief can only be generated when bird.status is text_approved." },
      { status: 400 }
    );
  }

  if (bird.science_dossier_status !== "approved") {
    return NextResponse.json(
      { error: "Visual brief generation requires an approved science dossier first." },
      { status: 400 }
    );
  }

  const science = await getScienceDossierForBird(bird.id);
  if (!science) {
    return NextResponse.json(
      { error: "Science dossier not found. Generate and approve it first." },
      { status: 404 }
    );
  }

  const focus = pickFocusTraits(science.payload);
  const silhouetteFocus = focus.length >= 2 ? focus.slice(0, 3) : ["Head shape", "Beak", "Wing outline"];

  const payload = visualBriefSchemaV1.parse({
    scientific: {
      main_habitat: {
        pose: "Full-body side view, standing. Calm and identification-friendly.",
        composition_rules: ["Bird fills 70–80% of the frame", "Dominant side view"],
        habitat_hint_elements: ["Subtle vegetation hint", "Minimal ground line"],
        background_rules: ["Pale paper background", "No scene perspective", "No dramatic lighting"],
        must_not: ["No strong habitat scene", "No background animals", "No human objects"],
      },
    },
    iconic: {
      silhouette_focus: silhouetteFocus,
      simplify_features: ["Reduce micro-feather detail", "Keep key markers readable"],
      must_not: ["No habitat background", "No props"],
      background: "none",
    },
  });

  try {
    const saved = await upsertVisualBriefDraft({
      bird_id: bird.id,
      schema_version: "v1",
      payload,
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
