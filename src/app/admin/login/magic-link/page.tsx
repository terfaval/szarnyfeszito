"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { sanitizeRedirectTarget } from "@/lib/redirect";

export default function MagicLinkCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"verifying" | "error">("verifying");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const hash = window.location.hash.replace(/^#/, "");
    const params = new URLSearchParams(hash);
    const queryParams = new URLSearchParams(window.location.search);
    const accessToken =
      params.get("access_token") ?? queryParams.get("access_token");
    const redirectParam =
      params.get("redirect") ?? queryParams.get("redirect") ?? null;
    const redirectTo = sanitizeRedirectTarget(redirectParam);

    if (!accessToken) {
      setStatus("error");
      setErrorMessage("The magic link did not return a valid access token.");
      return;
    }

    const refreshToken =
      params.get("refresh_token") ?? queryParams.get("refresh_token");

    if (!refreshToken) {
      setStatus("error");
      setErrorMessage("The magic link did not return a valid refresh token.");
      return;
    }

    const expiresInValue =
      params.get("expires_in") ?? queryParams.get("expires_in");
    const expiresIn = Number(expiresInValue ?? 0) || 60 * 60;

    const confirmSession = async () => {
      try {
        const response = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_in: expiresIn,
          }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error ?? "Unable to establish an admin session.");
        }

        router.replace(redirectTo);
      } catch (fetchError) {
        setStatus("error");
        setErrorMessage(
          fetchError instanceof Error
            ? fetchError.message
            : "Unable to complete the magic link flow."
        );
      }
    };

    confirmSession();
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <section className="mx-auto flex w-full max-w-lg flex-col gap-6 rounded-3xl border border-white/10 bg-zinc-900/80 p-10 text-center shadow-2xl shadow-black/60">
        <p className="text-xs uppercase tracking-[0.4em] text-zinc-500">Magic link</p>
        {status === "verifying" && (
          <>
            <h1 className="text-2xl font-semibold text-white">Verifying the magic link…</h1>
            <p className="text-sm text-zinc-400">
              Hold tight while we confirm the link and redirect you to the admin dashboard.
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <h1 className="text-2xl font-semibold text-white">Unable to sign in</h1>
            <p className="text-sm text-zinc-400">
              {errorMessage ?? "An unexpected error occurred while processing your link."}
            </p>
            <Link
              className="mx-auto mt-4 inline-flex rounded-2xl border border-zinc-100 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-white/10"
              href="/admin/login"
            >
              Return to login
            </Link>
          </>
        )}
      </section>
    </main>
  );
}
