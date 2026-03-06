"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/ui/components/Card";
import { Button } from "@/ui/components/Button";
import { Input } from "@/ui/components/Input";

type AdminLoginFormProps = {
  allowedEmail: string;
  redirectTo: string;
};

export default function AdminLoginForm({ allowedEmail, redirectTo }: AdminLoginFormProps) {
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

    router.replace(redirectTo);
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
        body: JSON.stringify({ email, redirectTo }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Unable to send magic link.");
      }

      setMagicState("sent");
    } catch (fetchError) {
      setMagicState("idle");
      setMagicError(
        fetchError instanceof Error ? fetchError.message : "Unable to send the magic link."
      );
    }
  };

  return (
    <section className="grid gap-6 md:grid-cols-2">
      <Card className="stack">
        <header className="admin-heading">
          <p className="admin-heading__label">Password</p>
          <h2 className="admin-heading__title">Admin sign-in</h2>
          <p className="admin-heading__description">
            Only the allow-listed admin email (<span className="font-semibold">{allowedEmail}</span>) is accepted.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="stack">
          <Input
            label="Admin email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {error && (
            <p className="admin-message admin-message--error" aria-live="assertive">
              {error}
            </p>
          )}

          <Button type="submit" disabled={loading} variant="primary" className="w-full justify-center">
            {loading ? "Signing in…" : "Sign in as admin"}
          </Button>
        </form>
      </Card>

      <Card className="stack">
        <header className="admin-heading">
          <p className="admin-heading__label">Magic link</p>
          <h2 className="admin-heading__title">One-time sign-in</h2>
          <p className="admin-heading__description">
            Send a single-use link to <span className="font-semibold">{allowedEmail}</span> and return straight to the
            dashboard.
          </p>
        </header>

        {magicError && (
          <p className="admin-message admin-message--error" aria-live="assertive">
            {magicError}
          </p>
        )}

        {magicState === "sent" && (
          <p className="admin-message admin-message--success" aria-live="polite">
            Check your inbox; the magic link will expire in a few minutes.
          </p>
        )}

        <Button
          type="button"
          onClick={handleMagicLink}
          disabled={isMagicSending}
          variant="secondary"
          className="w-full justify-center"
        >
          {isMagicSending ? "Sending magic link…" : "Send magic link"}
        </Button>
      </Card>
    </section>
  );
}

