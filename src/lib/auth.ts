import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { supabaseServerClient } from "@/lib/supabaseServerClient";
import { ADMIN_EMAIL_LOWERCASE, IS_PRODUCTION } from "@/lib/config";

export const ADMIN_SESSION_COOKIE = "sf-admin-session";
export const ADMIN_REFRESH_COOKIE = "sf-admin-refresh";

const MIN_ACCESS_TOKEN_TTL_SECONDS = 60;
const ADMIN_REFRESH_COOKIE_TTL_SECONDS = 60 * 60 * 24 * 30;
type AdminResponseCookies = NextResponse["cookies"];

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

function setSessionCookie(
  cookiesTarget: AdminResponseCookies,
  name: string,
  value: string,
  maxAgeSeconds: number
) {
  cookiesTarget.set({
    name,
    value,
    httpOnly: true,
    secure: IS_PRODUCTION,
    path: "/",
    sameSite: "lax",
    maxAge: maxAgeSeconds,
  });
}

export function setAdminSessionCookies(
  cookiesTarget: AdminResponseCookies,
  accessToken: string,
  refreshToken: string,
  expiresInSeconds: number
) {
  const ttl = Math.max(MIN_ACCESS_TOKEN_TTL_SECONDS, Math.floor(expiresInSeconds));
  setSessionCookie(
    cookiesTarget,
    ADMIN_SESSION_COOKIE,
    accessToken,
    ttl
  );
  setSessionCookie(
    cookiesTarget,
    ADMIN_REFRESH_COOKIE,
    refreshToken,
    ADMIN_REFRESH_COOKIE_TTL_SECONDS
  );
}

export function clearAdminSessionCookies(cookiesTarget: AdminResponseCookies) {
  cookiesTarget.delete(ADMIN_SESSION_COOKIE);
  cookiesTarget.delete(ADMIN_REFRESH_COOKIE);
}

export async function refreshAdminSession(
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number } | null> {
  const { data, error } = await supabaseServerClient.auth.refreshSession({
    refresh_token: refreshToken,
  });

  const session = data?.session;
  if (error || !session) {
    return null;
  }

  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresIn: session.expires_in ?? 60 * 60,
  };
}
