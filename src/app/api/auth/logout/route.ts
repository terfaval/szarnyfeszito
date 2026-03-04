import { NextResponse } from "next/server";
import { clearAdminSessionCookies } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ success: true });
  clearAdminSessionCookies(response.cookies);
  return response;
}
