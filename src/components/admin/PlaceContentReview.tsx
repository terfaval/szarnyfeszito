"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/ui/components/Button";
import { Card } from "@/ui/components/Card";
import { ReviewStatusPill } from "@/ui/components/ReviewStatusPill";
import type { Place } from "@/types/place";
import type { PlaceContentBlockRecord } from "@/lib/placeContentService";
import type { PlaceUiVariantsV1 } from "@/lib/placeContentSchema";

type PlaceContentReviewProps = {
  place: Place;
  latest: PlaceContentBlockRecord | null;
  latestApproved: PlaceContentBlockRecord | null;
};

type PlaceVariants = PlaceUiVariantsV1["variants"];
type SeasonalSnippet = PlaceUiVariantsV1["variants"]["seasonal_snippet"];

function variantValue(block: PlaceContentBlockRecord | null, key: keyof PlaceVariants) {
  const variants = block?.blocks_json?.variants ?? null;
  if (!variants) return "";
  const value = variants[key];
  return typeof value === "string" ? value : "";
}

function seasonalValue(block: PlaceContentBlockRecord | null, key: keyof SeasonalSnippet) {
  const seasonal = block?.blocks_json?.variants?.seasonal_snippet ?? null;
  const value = seasonal ? seasonal[key] : "";
  return value ?? "";
}

export default function PlaceContentReview({ place, latest, latestApproved }: PlaceContentReviewProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [reviewComment, setReviewComment] = useState(
    typeof latest?.generation_meta?.review_comment === "string"
      ? latest?.generation_meta?.review_comment
      : ""
  );

  const [variants, setVariants] = useState(() => ({
    teaser: variantValue(latest, "teaser"),
    short: variantValue(latest, "short"),
    long: variantValue(latest, "long"),
    ethics_tip: variantValue(latest, "ethics_tip"),
    did_you_know: variantValue(latest, "did_you_know"),
    practical_tip: variantValue(latest, "practical_tip"),
    when_to_go: variantValue(latest, "when_to_go"),
    who_is_it_for: variantValue(latest, "who_is_it_for"),
    nearby_protection_context: variantValue(latest, "nearby_protection_context"),
    seasonal_snippet: {
      spring: seasonalValue(latest, "spring"),
      summer: seasonalValue(latest, "summer"),
      autumn: seasonalValue(latest, "autumn"),
      winter: seasonalValue(latest, "winter"),
    },
  }));

  const hasAnyContent = useMemo(() => {
    return Boolean(
      variants.short.trim() ||
        variants.long.trim() ||
        variants.teaser.trim() ||
        variants.ethics_tip.trim()
    );
  }, [variants]);

  const latestStatus = latest?.review_status ?? "draft";

  const saveManualEdits = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    const response = await fetch(`/api/places/${place.id}/content`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variants }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error ?? "Unable to save content.");
      setSaving(false);
      return;
    }

    setMessage("Saved draft content. Refreshing…");
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
      setError(payload?.error ?? "Unable to request fix.");
      setSaving(false);
      return;
    }

    setMessage("Review note saved. Regenerate to apply it.");
    router.refresh();
    setSaving(false);
  };

  const regenerate = async (options?: { regenerate_notable_units?: boolean }) => {
    setSaving(true);
    setError(null);
    setMessage(null);

    const includeUnits = options?.regenerate_notable_units === true;
    const response = await fetch(`/api/places/${place.id}/content/generate`, {
      method: "POST",
      headers: includeUnits ? { "Content-Type": "application/json" } : undefined,
      body: includeUnits ? JSON.stringify({ regenerate_notable_units: true }) : undefined,
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error ?? "Unable to regenerate content.");
      setSaving(false);
      return;
    }

    setMessage("Regenerated draft. Refreshing…");
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

    setMessage("Approved. Refreshing…");
    router.refresh();
    setSaving(false);
  };

  return (
    <section className="place-content space-y-6">
      <header className="admin-header-row">
        <div className="admin-heading">
          <p className="admin-heading__label">Place content</p>
          <h2 className="admin-heading__title admin-heading__title--large">UI variants</h2>
          <p className="admin-heading__description">
            Latest status: <span className="font-semibold">{latestStatus}</span>
            {latestApproved ? (
              <span className="text-zinc-500"> · Approved version exists</span>
            ) : (
              <span className="text-zinc-500"> · No approved version yet</span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ReviewStatusPill status={latestStatus} />
          <Button type="button" variant="ghost" onClick={() => regenerate()} disabled={saving}>
            Regenerate
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => regenerate({ regenerate_notable_units: true })}
            disabled={saving}
          >
            Regenerate + units
          </Button>
          <Button type="button" variant="primary" onClick={approve} disabled={saving || !hasAnyContent}>
            Approve
          </Button>
        </div>
      </header>

      <form className="space-y-6" onSubmit={saveManualEdits}>
        <Card className="place-content stack">
          <p className="admin-subheading">Panel copy</p>
          <label className="form-field">
            <span className="form-field__label">teaser</span>
            <div className="form-field__row">
              <textarea
                className="input min-h-[80px]"
                value={variants.teaser}
                onChange={(event) => setVariants((p) => ({ ...p, teaser: event.target.value }))}
              />
            </div>
          </label>

          <label className="form-field">
            <span className="form-field__label">short</span>
            <div className="form-field__row">
              <textarea
                className="input min-h-[120px]"
                value={variants.short}
                onChange={(event) => setVariants((p) => ({ ...p, short: event.target.value }))}
              />
            </div>
          </label>

          <label className="form-field">
            <span className="form-field__label">long</span>
            <div className="form-field__row">
              <textarea
                className="input min-h-[200px]"
                value={variants.long}
                onChange={(event) => setVariants((p) => ({ ...p, long: event.target.value }))}
              />
            </div>
          </label>
        </Card>

        <Card className="place-content stack">
          <p className="admin-subheading">Seasonal snippet</p>
          {(["spring", "summer", "autumn", "winter"] as const).map((season) => (
            <label key={season} className="form-field">
              <span className="form-field__label">{season}</span>
              <div className="form-field__row">
                <textarea
                  className="input min-h-[120px]"
                  value={variants.seasonal_snippet[season]}
                  onChange={(event) =>
                    setVariants((p) => ({
                      ...p,
                      seasonal_snippet: { ...p.seasonal_snippet, [season]: event.target.value },
                    }))
                  }
                />
              </div>
            </label>
          ))}
        </Card>

        <Card className="place-content stack">
          <p className="admin-subheading">Extras</p>
          {(
            [
              "ethics_tip",
              "did_you_know",
              "practical_tip",
              "when_to_go",
              "who_is_it_for",
              "nearby_protection_context",
            ] as const
          ).map((key) => (
            <label key={key} className="form-field">
              <span className="form-field__label">{key}</span>
              <div className="form-field__row">
                <textarea
                  className="input min-h-[100px]"
                  value={variants[key]}
                  onChange={(event) => setVariants((p) => ({ ...p, [key]: event.target.value }))}
                />
              </div>
            </label>
          ))}
        </Card>

        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex-1 space-y-2">
            <p className="admin-subheading">Review note (for regeneration)</p>
            <textarea
              className="input min-h-[90px] w-full"
              value={reviewComment}
              onChange={(event) => setReviewComment(event.target.value)}
              placeholder="Please be calmer, avoid jargon, add a clear ethics reminder…"
            />
            <p className="admin-note-small">
              Saves as <code className="rounded bg-zinc-100 px-1 text-xs">generation_meta.review_comment</code> on the latest draft.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="ghost" onClick={requestFix} disabled={saving || !reviewComment.trim()}>
              Save review note
            </Button>
            <Button type="submit" variant="accent" disabled={saving}>
              Save manual edits (new draft)
            </Button>
          </div>
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
    </section>
  );
}
