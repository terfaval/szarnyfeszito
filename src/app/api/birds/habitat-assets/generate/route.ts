import { NextRequest, NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { generateHabitatStockAssetTile } from "@/lib/imageService";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getAdminUserFromCookies();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const key = typeof body?.key === "string" ? body.key.trim() : "";
  const forceRegenerate = Boolean(body?.force_regenerate);

  if (!key) {
    return NextResponse.json({ error: "key is required." }, { status: 400 });
  }

  try {
    const data = await generateHabitatStockAssetTile({ key, forceRegenerate });
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message ?? "Unable to generate habitat tile." },
      { status: 400 }
    );
  }
}

