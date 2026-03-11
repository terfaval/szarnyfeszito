import { NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { listSuggestedBirdQueue } from "@/lib/placeBirdService";

export async function GET() {
  const user = await getAdminUserFromCookies();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await listSuggestedBirdQueue();
  return NextResponse.json({ data: items });
}

