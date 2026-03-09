"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/ui/components/Button";
import { Card } from "@/ui/components/Card";
import { Input } from "@/ui/components/Input";

const initialFormState = {
  name: "",
};

export default function PlaceCreateForm() {
  const router = useRouter();
  const [formValues, setFormValues] = useState(initialFormState);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const isDisabled = useMemo(() => {
    return creating || !formValues.name.trim();
  }, [creating, formValues]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreating(true);
    setError(null);
    setMessage(null);

    const payload = {
      name: formValues.name.trim(),
    };

    const response = await fetch("/api/places/quick-create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => null);

    if (!response.ok) {
      setError(body?.error ?? "Unable to create place.");
      setCreating(false);
      return;
    }

    const placeId = body?.data?.place?.id;
    setMessage(placeId ? "Place created. Redirecting to editor..." : "Place created.");
    setFormValues(initialFormState);

    if (placeId) {
      router.push(`/admin/places/${placeId}`);
      setCreating(false);
      return;
    }

    router.refresh();
    setCreating(false);
  };

  return (
    <Card className="place-create-form space-y-4 text-sm">
      <div className="space-y-2">
        <p className="admin-subheading">Quick create (named place)</p>
        <p className="admin-note-small">
          Provide a real, named Hungarian birding destination. The system will generate a unique slug, draft metadata (type/region/county/city), and draft UI variants.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input
          label="Place name (required)"
          required
          value={formValues.name}
          onChange={(event) => setFormValues((p) => ({ ...p, name: event.target.value }))}
          placeholder="Tatai Öreg-tó"
        />

        <Button type="submit" disabled={isDisabled} variant="accent" className="w-full justify-center">
          {creating ? "Creating..." : "Create place from name (AI draft)"}
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
