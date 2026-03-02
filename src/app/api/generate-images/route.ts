import { NextRequest, NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { getBirdById } from "@/lib/birdService";
import { generateImagesForBird } from "@/lib/imageService";

export async function POST(request: NextRequest) {
  const admin = await getAdminUserFromCookies();

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const birdId = body?.bird_id;

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
    const result = await generateImagesForBird(bird);
    return NextResponse.json({ data: result });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message ?? "Unable to generate images." },
      { status: 400 }
    );
  }
}
