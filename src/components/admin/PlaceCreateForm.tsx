"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/ui/components/Button";
import { Card } from "@/ui/components/Card";
import { Input } from "@/ui/components/Input";
import { PLACE_TYPE_VALUES, type PlaceType } from "@/types/place";

const initialFormState = {
  name: "",
  place_type: "lake" as PlaceType,
  region_landscape: "",
  county: "",
  nearest_city: "",
  generation_input: "",
};

export default function PlaceCreateForm() {
  const router = useRouter();
  const [formValues, setFormValues] = useState(initialFormState);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const isDisabled = useMemo(() => {
    return (
      creating ||
      !formValues.name.trim() ||
      !formValues.place_type ||
      !formValues.region_landscape.trim() ||
      !formValues.county.trim() ||
      !formValues.nearest_city.trim() ||
      !formValues.generation_input.trim()
    );
  }, [creating, formValues]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreating(true);
    setError(null);
    setMessage(null);

    const payload = {
      name: formValues.name.trim(),
      place_type: formValues.place_type,
      region_landscape: formValues.region_landscape.trim(),
      county: formValues.county.trim(),
      nearest_city: formValues.nearest_city.trim(),
      generation_input: formValues.generation_input.trim(),
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
          Provide a real, named Hungarian birding destination. The system will generate a unique slug and draft UI variants.
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

        <label className="form-field">
          <span className="form-field__label">Place type</span>
          <div className="form-field__row">
            <select
              className="input"
              value={formValues.place_type}
              onChange={(event) =>
                setFormValues((p) => ({ ...p, place_type: event.target.value as PlaceType }))
              }
            >
              {PLACE_TYPE_VALUES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Region / landscape (required)"
            required
            value={formValues.region_landscape}
            onChange={(event) =>
              setFormValues((p) => ({ ...p, region_landscape: event.target.value }))
            }
            placeholder="Fertő–Hanság"
          />
          <Input
            label="County (required)"
            required
            value={formValues.county}
            onChange={(event) => setFormValues((p) => ({ ...p, county: event.target.value }))}
            placeholder="Győr-Moson-Sopron"
          />
        </div>

        <Input
          label="Nearest city (required)"
          required
          value={formValues.nearest_city}
          onChange={(event) =>
            setFormValues((p) => ({ ...p, nearest_city: event.target.value }))
          }
          placeholder="Sopron"
        />

        <Input
          label="Short admin description (required)"
          required
          value={formValues.generation_input}
          onChange={(event) =>
            setFormValues((p) => ({ ...p, generation_input: event.target.value }))
          }
          placeholder="Large fishpond system near Fertő lake, important migration stopover."
          helperText="Used as the AI prompt seed; keep it factual and public-safe."
        />

        <Button type="submit" disabled={isDisabled} variant="accent" className="w-full justify-center">
          {creating ? "Creating..." : "Create place + generate draft text"}
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

