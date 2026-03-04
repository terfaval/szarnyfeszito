import { NextRequest, NextResponse } from "next/server";
import { supabaseServerClient } from "@/lib/supabaseServerClient";
import { isAllowedAdminEmail, setAdminSessionCookies } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  const email = body?.email;
  const password = body?.password;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 }
    );
  }

  if (!isAllowedAdminEmail(email)) {
    return NextResponse.json(
      { error: "This email address is not allowed to access the admin." },
      { status: 403 }
    );
  }

  const { data, error } = await supabaseServerClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    return NextResponse.json(
      { error: error?.message ?? "Unable to sign in with Supabase." },
      { status: 401 }
    );
  }

  const response = NextResponse.json({
    user: {
      id: data.user?.id,
      email: data.user?.email,
    },
  });

  const session = data.session;
  if (!session?.refresh_token || !session.access_token) {
    return NextResponse.json(
      { error: "Unable to establish a secure session." },
      { status: 500 }
    );
  }

  setAdminSessionCookies(
    response.cookies,
    session.access_token,
    session.refresh_token,
    session.expires_in ?? 60 * 60
  );

  return response;
}
