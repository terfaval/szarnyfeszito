import { NextRequest, NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { getBirdById, updateBird } from "@/lib/birdService";
import { getScienceDossierForBird, approveScienceDossier } from "@/lib/scienceDossierService";

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
      { error: "Science dossier can only be approved when bird.status is text_approved." },
      { status: 400 }
    );
  }

  try {
    const dossier = await getScienceDossierForBird(bird.id);
    if (!dossier) {
      return NextResponse.json(
        { error: "Science dossier not found. Save a draft first." },
        { status: 404 }
      );
    }

    const approved = await approveScienceDossier({
      bird_id: bird.id,
      approved_by: user.id,
    });

    const updatedBird = await updateBird({ id: bird.id, science_dossier_status: "approved" });
    return NextResponse.json({ data: { bird: updatedBird, dossier: approved } }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message ?? "Unable to approve science dossier." },
      { status: 400 }
    );
  }
}

