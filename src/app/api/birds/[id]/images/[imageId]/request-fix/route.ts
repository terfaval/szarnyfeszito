import { NextRequest, NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { requestImageReview } from "@/lib/imageService";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; imageId: string }> }
) {
  const user = await getAdminUserFromCookies();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await context.params;
  const body = await request.json().catch(() => ({}));
  const comment =
    typeof body?.comment === "string" ? body.comment.trim() : "";

  if (!comment) {
    return NextResponse.json(
      { error: "comment is required to request a review." },
      { status: 400 }
    );
  }

  try {
    const image = await requestImageReview(params.id, params.imageId, comment);
    return NextResponse.json({ data: { image } });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message ?? "Unable to request image review." },
      { status: 400 }
    );
  }
}
