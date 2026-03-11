import { NextRequest, NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { generateSexComparisonDraft } from "@/lib/sexComparisonService";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUserFromCookies();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await context.params;

  try {
    const result = await generateSexComparisonDraft({ birdId: params.id });
    return NextResponse.json({ data: result });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message ?? "Unable to generate sex comparison." },
      { status: 400 }
    );
  }
}

