import { NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { countStrengthLogs } from "@/lib/activityService";

export async function GET(request: Request) {
  const user = await getAdminUserFromCookies();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const workoutId = url.searchParams.get("workoutId");

  if (!workoutId) {
    return NextResponse.json({ error: "workoutId is required." }, { status: 400 });
  }

  const count = await countStrengthLogs({
    workoutId,
    userId: user.id,
    includeLegacy: true,
  });

  return NextResponse.json({ count });
}
