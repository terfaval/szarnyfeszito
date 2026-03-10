"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/ui/components/Button";
import { Input } from "@/ui/components/Input";
import { Bird, BirdColorTag, BIRD_STATUS_VALUES, BirdStatus } from "@/types/bird";

const COLOR_OPTIONS: Array<{ tag: BirdColorTag; label: string }> = [
  { tag: "white", label: "Fehér" },
  { tag: "black", label: "Fekete" },
  { tag: "grey", label: "Szürke" },
  { tag: "brown", label: "Barna" },
  { tag: "yellow", label: "Sárga" },
  { tag: "orange", label: "Narancs" },
  { tag: "red", label: "Piros" },
  { tag: "green", label: "Zöld" },
  { tag: "blue", label: "Kék" },
];

type BirdEditorFormProps = {
  bird: Bird;
};

export default function BirdEditorForm({ bird }: BirdEditorFormProps) {
  const router = useRouter();
  const [values, setValues] = useState({
    slug: bird.slug,
    name_hu: bird.name_hu,
    name_latin: bird.name_latin ?? "",
    status: bird.status,
    color_tags: bird.color_tags ?? [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/birds/${bird.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: values.slug.trim(),
          name_hu: values.name_hu.trim(),
          name_latin: values.name_latin.trim(),
          status: values.status,
          color_tags: values.color_tags,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setError(payload?.error ?? "Unable to save bird.");
        return;
      }

      setMessage("Bird updated. Refreshing data…");
      router.refresh();
    } catch {
      setError("Unable to save bird.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="Slug"
          value={values.slug}
          required
          onChange={(event) =>
            setValues((previous) => ({ ...previous, slug: event.target.value }))
          }
        />
        <Input
          label="Hungarian name"
          value={values.name_hu}
          required
          onChange={(event) =>
            setValues((previous) => ({
              ...previous,
              name_hu: event.target.value,
            }))
          }
        />
      </div>

      <Input
        label="Latin name"
        value={values.name_latin}
        onChange={(event) =>
          setValues((previous) => ({
            ...previous,
            name_latin: event.target.value,
          }))
        }
      />

      <label className="form-field">
        <span className="form-field__label">Status</span>
        <div className="form-field__row">
          <select
            className="input"
            value={values.status}
            onChange={(event) =>
              setValues((previous) => ({
                ...previous,
                status: event.target.value as BirdStatus,
              }))
            }
          >
            {BIRD_STATUS_VALUES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </label>

      <fieldset className="form-field">
        <legend className="form-field__label">Szín (szűréshez)</legend>
        <div className="form-field__row" style={{ flexWrap: "wrap", gap: "0.75rem" }}>
          {COLOR_OPTIONS.map((option) => {
            const checked = values.color_tags.includes(option.tag);
            return (
              <label key={option.tag} className="admin-note-small" style={{ display: "inline-flex", gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    setValues((previous) => {
                      const next = new Set(previous.color_tags);
                      if (next.has(option.tag)) next.delete(option.tag);
                      else next.add(option.tag);
                      return { ...previous, color_tags: Array.from(next) };
                    })
                  }
                />
                {option.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      <Button
        type="submit"
        disabled={saving}
        variant="primary"
        className="w-full justify-center"
      >
        {saving ? "Saving…" : "Save changes"}
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
  );
}
