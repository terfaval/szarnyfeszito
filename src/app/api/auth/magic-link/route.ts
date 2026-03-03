import { NextRequest, NextResponse } from "next/server";
import { supabaseServerClient } from "@/lib/supabaseServerClient";
import { isAllowedAdminEmail } from "@/lib/auth";
import { APP_URL } from "@/lib/config";
import {
  DEFAULT_ADMIN_REDIRECT,
  sanitizeRedirectTarget,
} from "@/lib/redirect";

function getMagicLinkRedirectTo(redirectTo?: string) {
  const safeRedirect = sanitizeRedirectTarget(redirectTo ?? null);

  try {
    const url = new URL("/admin/login/magic-link", APP_URL);
    if (safeRedirect !== DEFAULT_ADMIN_REDIRECT) {
      url.searchParams.set("redirect", safeRedirect);
    }
    return url.toString();
  } catch {
    const base = APP_URL.replace(/\/$/, "");
    const query =
      safeRedirect !== DEFAULT_ADMIN_REDIRECT
        ? `?redirect=${encodeURIComponent(safeRedirect)}`
        : "";
    return `${base}/admin/login/magic-link${query}`;
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const redirectTo = typeof body?.redirectTo === "string" ? body.redirectTo : undefined;

  if (!email) {
    return NextResponse.json(
      { error: "A valid email address is required." },
      { status: 400 }
    );
  }

  if (!isAllowedAdminEmail(email)) {
    return NextResponse.json(
      { error: "This email address is not allowed to access the admin." },
      { status: 403 }
    );
  }

  const { error } = await supabaseServerClient.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: getMagicLinkRedirectTo(redirectTo),
      shouldCreateUser: false,
    },
  });

  if (error) {
    return NextResponse.json(
      { error: error.message ?? "Unable to send the magic link." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
