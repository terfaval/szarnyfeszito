"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/ui/components/Button";
import { Card } from "@/ui/components/Card";
import { Input } from "@/ui/components/Input";

const initialFormState = {
  name_hu: "",
  name_latin: "",
};

export default function BirdCreateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillNameHu = searchParams.get("prefill_name_hu")?.trim() ?? "";
  const prefillSource = searchParams.get("source")?.trim() ?? "";
  const prefillPlaceName = searchParams.get("place_name")?.trim() ?? "";

  const [formValues, setFormValues] = useState(() => ({
    ...initialFormState,
    name_hu: prefillNameHu || initialFormState.name_hu,
  }));
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const isDisabled = useMemo(
    () => creating || !formValues.name_latin.trim(),
    [creating, formValues]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreating(true);
    setError(null);
    setMessage(null);

    const payload = {
      name_latin: formValues.name_latin.trim(),
      name_hu: formValues.name_hu.trim() || undefined,
    };

    const response = await fetch("/api/birds/quick-create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => null);

    if (!response.ok) {
      setError(body?.error ?? "Unable to create a new bird.");
      setCreating(false);
      return;
    }

    const birdId = body?.data?.bird?.id;
    setMessage(
      body?.data?.slug
        ? `Bird "${body.data.slug}" created. Redirecting to editor...`
        : "Bird created. Redirecting to editor..."
    );

    setFormValues(initialFormState);

    if (birdId) {
      router.push(`/admin/birds/${birdId}`);
      setCreating(false);
      return;
    }

    router.refresh();
    setCreating(false);
  };

  return (
    <Card className="space-y-4 text-sm">
      <div className="space-y-2">
        <p className="admin-subheading">Quick create</p>
        {prefillSource === "place_suggestion" && prefillNameHu ? (
          <p className="admin-note-small">
            Prefilled from Place suggestion{prefillPlaceName ? ` (“${prefillPlaceName}”)` : ""}.
          </p>
        ) : null}
        <p className="admin-note-small">
          Provide a Latin name (Hungarian optional) and we will generate the slug
          for you. Slugs stay lowercase, ASCII, and hyphenated; duplicates get a
          numeric suffix.
        </p>
      </div>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input
          label="Latin name (required)"
          required
          value={formValues.name_latin}
          onChange={(event) =>
            setFormValues((previous) => ({
              ...previous,
              name_latin: event.target.value,
            }))
          }
          placeholder="Aviarus fantastikus"
          helperText="This drives the slug generation."
        />
        <Input
          label="Hungarian name (optional)"
          value={formValues.name_hu}
          onChange={(event) =>
            setFormValues((previous) => ({
              ...previous,
              name_hu: event.target.value,
            }))
          }
          placeholder="Szarnyfeszito madar"
        />
        <Button
          type="submit"
          disabled={isDisabled}
          variant="accent"
          className="w-full justify-center"
        >
          {creating ? "Creating..." : "Create bird record"}
        </Button>
        {error && (
          <p className="admin-message admin-message--error" aria-live="assertive">
            {error}
          </p>
        )}
        {message && (
          <p className="admin-message admin-message--success" aria-live="polite">
            {message}
          </p>
        )}
      </form>
    </Card>
  );
}
