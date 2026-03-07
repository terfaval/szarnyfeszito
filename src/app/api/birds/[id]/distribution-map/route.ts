import { NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { getDistributionMapForBird } from "@/lib/distributionMapService";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUserFromCookies();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await context.params;

  try {
    const record = await getDistributionMapForBird(params.id);
    return NextResponse.json({ data: { distribution_map: record } });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message ?? "Unable to load distribution map." },
      { status: 400 }
    );
  }
}

