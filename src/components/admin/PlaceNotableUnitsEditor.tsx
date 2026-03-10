"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/ui/components/Button";
import { Card } from "@/ui/components/Card";
import { ReviewStatusPill } from "@/ui/components/ReviewStatusPill";
import type { Place } from "@/types/place";
import type { PlaceContentBlockRecord } from "@/lib/placeContentService";
import type { ReviewStatus } from "@/types/content";

type PlaceNotableUnitsEditorProps = {
  place: Place;
  latest: PlaceContentBlockRecord | null;
  latestApproved: PlaceContentBlockRecord | null;
};

function prettyJson(value: unknown) {
  if (value === null || value === undefined) return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "";
  }
}

function parseJsonOrError(input: string): { ok: true; value: unknown } | { ok: false; error: string } {
  const trimmed = input.trim();
  if (!trimmed) return { ok: true, value: null };
  try {
    return { ok: true, value: JSON.parse(trimmed) };
  } catch {
    return { ok: false, error: "Must be valid JSON." };
  }
}

export default function PlaceNotableUnitsEditor({ place, latest, latestApproved }: PlaceNotableUnitsEditorProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [reviewComment, setReviewComment] = useState(
    typeof latest?.generation_meta?.review_comment === "string" ? latest.generation_meta.review_comment : ""
  );

  const [publicJson, setPublicJson] = useState(() =>
    prettyJson(latest?.blocks_json?.variants?.notable_units ?? [])
  );

  const [internalJson, setInternalJson] = useState(() => prettyJson(place.notable_units_json ?? null));

  const latestStatus = (latest?.review_status ?? "draft") as ReviewStatus;
  const latestApprovedAt = latestApproved?.created_at ?? null;

  const savePublic = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    const parsed = parseJsonOrError(publicJson);
    if (!parsed.ok) {
      setError(parsed.error);
      setSaving(false);
      return;
    }

    const notableUnits = parsed.value === null ? [] : parsed.value;
    if (!Array.isArray(notableUnits)) {
      setError("notable_units must be a JSON array (or empty).");
      setSaving(false);
      return;
    }

    const response = await fetch(`/api/places/${place.id}/content`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variants: { notable_units: notableUnits } }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error ?? "Unable to save notable units.");
      setSaving(false);
      return;
    }

    setMessage("Saved notable units. Refreshing…");
    router.refresh();
    setSaving(false);
  };

  const saveInternal = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    const parsed = parseJsonOrError(internalJson);
    if (!parsed.ok) {
      setError(parsed.error);
      setSaving(false);
      return;
    }

    const response = await fetch(`/api/places/${place.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notable_units_json: parsed.value }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error ?? "Unable to save internal notable units.");
      setSaving(false);
      return;
    }

    setMessage("Saved internal notable units. Refreshing…");
    router.refresh();
    setSaving(false);
  };

  const requestFix = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);

    const response = await fetch(`/api/places/${place.id}/content/request-fix`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ review_comment: reviewComment.trim() }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error ?? "Unable to save review note.");
      setSaving(false);
      return;
    }

    setMessage("Review note saved. Regenerate to apply it.");
    router.refresh();
    setSaving(false);
  };

  const regenerate = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);

    const response = await fetch(`/api/places/${place.id}/content/generate`, { method: "POST" });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error ?? "Unable to regenerate place content.");
      setSaving(false);
      return;
    }

    setMessage("Generated new draft content. Refreshing…");
    router.refresh();
    setSaving(false);
  };

  const approve = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);

    const response = await fetch(`/api/places/${place.id}/content/approve`, { method: "POST" });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error ?? "Unable to approve content.");
      setSaving(false);
      return;
    }

    setMessage("Approved latest content. Refreshing…");
    router.refresh();
    setSaving(false);
  };

  return (
    <section className="space-y-6">
      <header className="admin-heading">
        <p className="admin-heading__label">Place content</p>
        <h2 className="admin-heading__title admin-heading__title--large">Notable units</h2>
        <p className="admin-heading__description">
          Public panel content is stored in{" "}
          <code className="rounded bg-zinc-100 px-1 text-xs">content_blocks.blocks_json.variants.notable_units</code>.
          Optional internal JSON lives on the Place record.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <ReviewStatusPill status={latestStatus} />
          {latestApprovedAt ? (
            <span className="text-sm text-zinc-500">Latest approved at: {String(latestApprovedAt)}</span>
          ) : (
            <span className="text-sm text-zinc-500">No approved content yet.</span>
          )}
        </div>
      </header>

      <Card className="place-content stack">
        <p className="admin-subheading">Public notable units (Explorer contract)</p>
        <p className="admin-note-small">
          JSON array of <code className="rounded bg-zinc-100 px-1 text-xs">{"{ name, type?, note }"}</code> objects.
          Empty array is OK.
        </p>

        <form className="space-y-4" onSubmit={savePublic}>
          <label className="form-field">
            <span className="form-field__label">variants.notable_units</span>
            <div className="form-field__row">
              <textarea
                className="input min-h-[180px] font-mono text-xs"
                value={publicJson}
                onChange={(event) => setPublicJson(event.target.value)}
                placeholder='[{"name":"Nyirkai-Hany","type":"wetland","note":"Important restoration site."}]'
              />
            </div>
          </label>

          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="ghost" onClick={regenerate} disabled={saving}>
              Regenerate content
            </Button>
            <Button type="submit" variant="accent" disabled={saving}>
              Save notable units (draft)
            </Button>
            <Button type="button" variant="primary" onClick={approve} disabled={saving}>
              Approve latest content
            </Button>
          </div>
        </form>
      </Card>

      <Card className="place-content stack">
        <p className="admin-subheading">Review note (for regeneration)</p>
        <textarea
          className="input min-h-[90px] w-full"
          value={reviewComment}
          onChange={(event) => setReviewComment(event.target.value)}
          placeholder="Please add 3–5 notable sub-areas, keep them general and non-sensitive…"
        />
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="ghost" onClick={requestFix} disabled={saving || !reviewComment.trim()}>
            Save review note
          </Button>
        </div>
      </Card>

      <Card className="place-content stack">
        <p className="admin-subheading">Internal notable units (Place meta)</p>
        <p className="admin-note-small">
          Stored as <code className="rounded bg-zinc-100 px-1 text-xs">places.notable_units_json</code>. Not required for
          publishing.
        </p>

        <form className="space-y-4" onSubmit={saveInternal}>
          <label className="form-field">
            <span className="form-field__label">notable_units_json</span>
            <div className="form-field__row">
              <textarea
                className="input min-h-[160px] font-mono text-xs"
                value={internalJson}
                onChange={(event) => setInternalJson(event.target.value)}
                placeholder='[{"name":"Nyirkai-Hany","type":"wetland","note":"Important restoration site."}]'
              />
            </div>
          </label>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="accent" disabled={saving}>
              Save internal JSON
            </Button>
          </div>
        </form>
      </Card>

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
    </section>
  );
}
