import { NextRequest, NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { approveCurrentImagesForBird } from "@/lib/imageService";

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
  const scope = typeof body?.scope === "string" ? body.scope : "";

  if (scope !== "required" && scope !== "all") {
    return NextResponse.json(
      { error: "scope must be 'required' or 'all'." },
      { status: 400 }
    );
  }

  try {
    const result = await approveCurrentImagesForBird({
      birdId: params.id,
      scope,
    });
    return NextResponse.json({ data: result });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message ?? "Unable to approve images." },
      { status: 400 }
    );
  }
}

