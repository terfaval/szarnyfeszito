import { NextRequest, NextResponse } from "next/server";
import { supabaseServerClient } from "@/lib/supabaseServerClient";
import { isAllowedAdminEmail } from "@/lib/auth";
import { APP_URL } from "@/lib/config";

function getMagicLinkRedirectTo() {
  try {
    return new URL("/admin/login/magic-link", APP_URL).toString();
  } catch {
    return `${APP_URL.replace(/\/$/, "")}/admin/login/magic-link`;
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";

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
      emailRedirectTo: getMagicLinkRedirectTo(),
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
