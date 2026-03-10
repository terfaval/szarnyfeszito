"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/ui/components/Button";
import { Input } from "@/ui/components/Input";
import { Bird, BIRD_STATUS_VALUES, BirdStatus } from "@/types/bird";

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
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
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

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Delete bird “${bird.name_hu}”?\n\nThis removes the bird record and its admin-only artifacts (content blocks + image rows). This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/birds/${bird.id}`, {
        method: "DELETE",
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setError(payload?.error ?? "Unable to delete bird.");
        return;
      }

      setMessage("Bird deleted. Redirectingâ€¦");
      router.push("/admin/birds");
      router.refresh();
    } catch {
      setError("Unable to delete bird.");
    } finally {
      setDeleting(false);
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

      <Button
        type="submit"
        disabled={saving || deleting}
        variant="primary"
        className="w-full justify-center"
      >
        {saving ? "Saving…" : "Save changes"}
      </Button>

      <div className="space-y-3">
        <p className="admin-message admin-message--warning">
          Deleting a bird is intended for mistaken/unfinished entries. Published birds cannot be
          deleted.
        </p>
        <Button
          type="button"
          disabled={saving || deleting}
          variant="accent"
          className="w-full justify-center"
          onClick={handleDelete}
        >
          {deleting ? "Deletingâ€¦" : "Delete bird"}
        </Button>
      </div>

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
