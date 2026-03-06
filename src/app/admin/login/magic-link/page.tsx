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
    const accessToken = params.get("access_token") ?? queryParams.get("access_token");
    const redirectParam = params.get("redirect") ?? queryParams.get("redirect") ?? null;
    const redirectTo = sanitizeRedirectTarget(redirectParam);

    if (!accessToken) {
      setStatus("error");
      setErrorMessage("The magic link did not return a valid access token.");
      return;
    }

    const refreshToken = params.get("refresh_token") ?? queryParams.get("refresh_token");

    if (!refreshToken) {
      setStatus("error");
      setErrorMessage("The magic link did not return a valid refresh token.");
      return;
    }

    const expiresInValue = params.get("expires_in") ?? queryParams.get("expires_in");
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
    <main className="admin-shell-canvas page-backdrop">
      <div className="admin-shell">
        <section className="admin-shell__panel stack">
          <header className="admin-heading">
            <p className="admin-heading__label">Magic link</p>
            {status === "verifying" ? (
              <>
                <h1 className="admin-heading__title admin-heading__title--large">
                  Verifying the magic link…
                </h1>
                <p className="admin-heading__description">
                  Hold tight while we confirm the link and redirect you to the admin dashboard.
                </p>
              </>
            ) : (
              <>
                <h1 className="admin-heading__title admin-heading__title--large">
                  Unable to sign in
                </h1>
                <p className="admin-heading__description">
                  {errorMessage ??
                    "An unexpected error occurred while processing your link."}
                </p>
              </>
            )}
          </header>

          {status === "error" && (
            <div className="space-y-3">
              <p className="admin-message admin-message--error" aria-live="assertive">
                {errorMessage ??
                  "An unexpected error occurred while processing your link."}
              </p>
              <Link className="btn btn--ghost w-full justify-center" href="/admin/login">
                Return to login
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

