import { NextRequest, NextResponse } from "next/server";
import { getAdminUserFromToken, setAdminSessionCookies } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const accessToken =
    typeof body?.access_token === "string" ? body.access_token.trim() : "";
  const expiresIn = Number(body?.expires_in ?? 0);
  const refreshToken =
    typeof body?.refresh_token === "string" ? body.refresh_token.trim() : "";

  if (!accessToken) {
    return NextResponse.json(
      { error: "Access token is required to establish a session." },
      { status: 400 }
    );
  }

  if (!refreshToken) {
    return NextResponse.json(
      { error: "Refresh token is required to establish a session." },
      { status: 400 }
    );
  }

  const user = await getAdminUserFromToken(accessToken);
  if (!user) {
    return NextResponse.json(
      { error: "Unable to verify the provided access token." },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ success: true, user });
  setAdminSessionCookies(
    response,
    accessToken,
    refreshToken,
    expiresIn || 60 * 60
  );

  return response;
}
