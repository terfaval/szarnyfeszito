import { NextRequest, NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { getBirdById } from "@/lib/birdService";
import { generateImagesForBird } from "@/lib/imageService";
import type { ImageVariant } from "@/types/image";

export async function POST(request: NextRequest) {
  const admin = await getAdminUserFromCookies();

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const birdId = body?.bird_id;
  const forceRegenerate =
    typeof body?.force_regenerate === "boolean" ? body.force_regenerate : false;
  const variant = typeof body?.variant === "string" ? (body.variant as ImageVariant) : null;

  if (!birdId || typeof birdId !== "string") {
    return NextResponse.json(
      { error: "bird_id is required as a string." },
      { status: 400 }
    );
  }

  const bird = await getBirdById(birdId);

  if (!bird) {
    return NextResponse.json({ error: "Bird not found" }, { status: 404 });
  }

  try {
    const result = await generateImagesForBird(bird, {
      forceRegenerate,
      onlyVariant: variant ?? undefined,
    });

    return NextResponse.json({
      ok: true,
      bird_id: bird.id,
      required_success: result.required_success,
      results: result.results,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message ?? "Unable to generate images." },
      { status: 400 }
    );
  }
}
