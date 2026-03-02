import { NextRequest, NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { approveBirdText } from "@/lib/reviewService";

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
  const overrides = {
    short: body.short,
    long: body.long,
    feature_block: body.feature_block,
    did_you_know: body.did_you_know,
    ethics_tip: body.ethics_tip,
    version: body.version,
  };

  try {
    const result = await approveBirdText(params.id, overrides);
    return NextResponse.json({ data: result });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message ?? "Unable to approve text." },
      { status: 400 }
    );
  }
}
