"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type AdminLoginFormProps = {
  allowedEmail: string;
};

export default function AdminLoginForm({ allowedEmail }: AdminLoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState(allowedEmail);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [magicState, setMagicState] = useState<"idle" | "sending" | "sent">("idle");
  const [magicError, setMagicError] = useState<string | null>(null);
  const isMagicSending = magicState === "sending";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.error ?? "Unable to authenticate.");
      setLoading(false);
      return;
    }

    router.replace("/admin");
  };

  const handleMagicLink = async () => {
    if (isMagicSending) {
      return;
    }

    setMagicError(null);
    setMagicState("sending");

    try {
      const response = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Unable to send magic link.");
      }

      setMagicState("sent");
    } catch (fetchError) {
      setMagicState("idle");
      setMagicError(
        fetchError instanceof Error
          ? fetchError.message
          : "Unable to send the magic link."
      );
    }
  };

  return (
    <div className="w-full max-w-sm space-y-6">
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl bg-white/80 p-6 shadow-xl backdrop-blur"
      >
        <div>
          <label className="text-sm font-semibold uppercase tracking-wide text-zinc-600">
            Admin email
          </label>
          <input
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <p className="mt-1 text-xs text-zinc-500">
            Only the allow-listed admin email (<span className="font-semibold">{allowedEmail}</span>) is accepted.
          </p>
        </div>

        <div>
          <label className="text-sm font-semibold uppercase tracking-wide text-zinc-600">
            Password
          </label>
          <input
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>

        {error && (
          <p className="text-xs font-medium text-rose-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in as admin"}
        </button>
      </form>

      <div className="space-y-3 rounded-2xl border border-zinc-200/60 bg-white/80 p-6 shadow-xl text-center">
        <p className="text-xs uppercase tracking-[0.4em] text-zinc-500">Magic link</p>
        <p className="text-sm text-zinc-500">
          Send a single-use link to{" "}
          <span className="font-semibold">{allowedEmail}</span> and return straight to the admin dashboard.
        </p>

        {magicError && (
          <p className="text-xs font-medium text-rose-600">{magicError}</p>
        )}

        {magicState === "sent" && (
          <p className="text-xs text-emerald-600">
            Check your inbox; the magic link will expire in a few minutes.
          </p>
        )}

        <button
          type="button"
          onClick={handleMagicLink}
          disabled={isMagicSending}
          className="w-full rounded-2xl border border-zinc-900 bg-white px-4 py-2 text-sm font-semibold uppercase tracking-wide text-zinc-900 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isMagicSending ? "Sending magic link…" : "Send magic link"}
        </button>
      </div>
    </div>
  );
}
