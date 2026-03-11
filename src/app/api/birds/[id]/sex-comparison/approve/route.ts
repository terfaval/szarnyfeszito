import { NextRequest, NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { approveSexComparison } from "@/lib/sexComparisonService";

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

  try {
    const result = await approveSexComparison({
      birdId: params.id,
      summary: body?.summary,
      key_differences: body?.key_differences,
    });
    return NextResponse.json({ data: result });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message ?? "Unable to approve sex comparison." },
      { status: 400 }
    );
  }
}

