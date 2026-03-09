import { NextRequest, NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { regenerateBirdIdentificationForReview } from "@/lib/reviewService";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUserFromCookies();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await context.params;

  try {
    const contentBlock = await regenerateBirdIdentificationForReview(params.id);
    return NextResponse.json({ data: { content_block: contentBlock } });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message ?? "Unable to regenerate identification." },
      { status: 400 }
    );
  }
}

