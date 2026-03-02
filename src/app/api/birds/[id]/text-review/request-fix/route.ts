import { NextRequest, NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { requestBirdTextReview } from "@/lib/reviewService";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUserFromCookies();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await context.params;
  const body = await request.json().catch(() => ({}));
  const comment =
    typeof body?.comment === "string" ? body.comment.trim() : "";

  try {
    const contentBlock = await requestBirdTextReview(params.id, comment);
    return NextResponse.json({ data: { content_block: contentBlock } });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message ?? "Unable to request review." },
      { status: 400 }
    );
  }
}
