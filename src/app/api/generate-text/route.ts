import { NextRequest, NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { createContentBlockForBird } from "@/lib/contentService";
import { generateBirdContent, getTextModelName } from "@/lib/textGeneration";
import { getBirdById, updateBird } from "@/lib/birdService";
import { GeneratedContent } from "@/types/content";

export async function POST(request: NextRequest) {
  const adminUser = await getAdminUserFromCookies();
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const birdId = body?.bird_id;

  if (!birdId || typeof birdId !== "string") {
    return NextResponse.json(
      { error: "bird_id is required (string)" },
      { status: 400 }
    );
  }

  const bird = await getBirdById(birdId);

  if (!bird) {
    return NextResponse.json({ error: "Bird not found" }, { status: 404 });
  }

  let generatedContent: GeneratedContent;

  try {
    generatedContent = await generateBirdContent(bird);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          (error as Error)?.message ??
          "Failed to generate text for the selected bird.",
      },
      { status: 502 }
    );
  }

  const contentBlock = await createContentBlockForBird(
    bird.id,
    generatedContent
  );
  const updatedBird = await updateBird({
    id: bird.id,
    status: "text_generated",
  });

  return NextResponse.json({
    data: {
      bird: updatedBird,
      content_block: contentBlock,
      model: getTextModelName(),
    },
  });
}
