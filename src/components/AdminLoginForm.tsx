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

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm space-y-4 rounded-2xl bg-white/80 p-6 shadow-xl backdrop-blur"
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
  );
}
