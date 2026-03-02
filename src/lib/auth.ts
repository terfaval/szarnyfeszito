import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseServerClient } from "@/lib/supabaseServerClient";
import { ADMIN_EMAIL_LOWERCASE, IS_PRODUCTION } from "@/lib/config";

export const ADMIN_SESSION_COOKIE = "sf-admin-session";

export type AdminUser = {
  id: string;
  email: string;
};

function getAllowedAdminEmail() {
  if (!ADMIN_EMAIL_LOWERCASE) {
    return null;
  }
  return ADMIN_EMAIL_LOWERCASE;
}

export async function getAdminUserFromToken(token?: string): Promise<AdminUser | null> {
  if (!token) {
    return null;
  }

  const { data, error } = await supabaseServerClient.auth.getUser(token);
  const user = data?.user;

  if (error || !user || !user.email) {
    return null;
  }

  const allowedEmail = getAllowedAdminEmail();
  if (!allowedEmail || user.email.toLowerCase() !== allowedEmail) {
    return null;
  }

  return { id: user.id, email: user.email };
}

export async function getAdminUserFromCookies(): Promise<AdminUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  return getAdminUserFromToken(token ?? undefined);
}

export function isAllowedAdminEmail(email?: string) {
  if (!email) {
    return false;
  }

  const allowedEmail = getAllowedAdminEmail();
  if (!allowedEmail) {
    return false;
  }

  return email.toLowerCase() === allowedEmail;
}

export function setAdminSessionCookie(
  response: NextResponse,
  accessToken: string,
  maxAgeSeconds: number
) {
  const ttl = Math.max(60, Math.floor(maxAgeSeconds));
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: accessToken,
    httpOnly: true,
    secure: IS_PRODUCTION,
    path: "/",
    sameSite: "lax",
    maxAge: ttl,
  });
}

export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.delete(ADMIN_SESSION_COOKIE);
}
