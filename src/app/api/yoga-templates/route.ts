import { NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { listYogaTemplates } from "@/lib/activityService";

export async function GET(request: Request) {
  const user = await getAdminUserFromCookies();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const category = url.searchParams.get("category");

  const templates = await listYogaTemplates();
  const filtered =
    category === "relax" || category === "strong"
      ? templates.filter((template) => template.category === category)
      : templates;

  return NextResponse.json({ data: filtered });
}

