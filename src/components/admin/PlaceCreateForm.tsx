"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/ui/components/Button";
import { Card } from "@/ui/components/Card";
import { Input } from "@/ui/components/Input";

type PlaceCreateFormProps = {
  missingSpaRegions: Array<{ region_id: string; name: string }>;
};

const initialFormState = {
  name: "",
  leaflet_region_id: "",
};

export default function PlaceCreateForm({ missingSpaRegions }: PlaceCreateFormProps) {
  const router = useRouter();
  const [formValues, setFormValues] = useState(initialFormState);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const selectedSpaName = useMemo(() => {
    const id = formValues.leaflet_region_id.trim();
    if (!id) return null;
    const match = missingSpaRegions.find((r) => r.region_id === id);
    return match?.name ?? null;
  }, [formValues.leaflet_region_id, missingSpaRegions]);

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
      leaflet_region_id: formValues.leaflet_region_id.trim() || undefined,
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
        <label className="form-field">
          <span className="form-field__label">Natura 2000 SPA (optional)</span>
          <div className="form-field__row">
            <select
              value={formValues.leaflet_region_id}
              onChange={(event) => {
                const nextId = event.target.value;
                const nextName = missingSpaRegions.find((r) => r.region_id === nextId)?.name ?? null;
                setFormValues((p) => ({
                  ...p,
                  leaflet_region_id: nextId,
                  name: nextName ? nextName : p.name,
                }));
              }}
              className="input"
            >
              <option value="">
                {missingSpaRegions.length > 0
                  ? `Pick from ${missingSpaRegions.length} missing SPA regions...`
                  : "All SPA regions already have a Place (or catalog unavailable)."}
              </option>
              {missingSpaRegions.map((region) => (
                <option key={region.region_id} value={region.region_id}>
                  {region.name}
                </option>
              ))}
            </select>
          </div>
          <p className="admin-note-small">
            Optional helper for SPA-first bootstrapping: shows Natura 2000 SPA regions that don&apos;t yet appear as{" "}
            <code className="rounded bg-zinc-100 px-1 text-xs">places.leaflet_region_id</code>.
          </p>
          {selectedSpaName && (
            <p className="admin-note-small">
              Selected SPA will be stored on the Place as{" "}
              <code className="rounded bg-zinc-100 px-1 text-xs">leaflet_region_id</code>: {selectedSpaName}
            </p>
          )}
        </label>

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
