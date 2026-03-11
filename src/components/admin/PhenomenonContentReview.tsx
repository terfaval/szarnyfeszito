"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/ui/components/Button";
import { Card } from "@/ui/components/Card";
import { ReviewStatusPill } from "@/ui/components/ReviewStatusPill";
import type { Phenomenon } from "@/types/phenomenon";
import type { PhenomenonContentBlockRecord } from "@/lib/phenomenonContentService";
import type { PhenomenonUiVariantsV1 } from "@/lib/phenomenonContentSchema";

type PhenomenonContentReviewProps = {
  phenomenon: Phenomenon;
  latest: PhenomenonContentBlockRecord | null;
  latestApproved: PhenomenonContentBlockRecord | null;
};

type PhenomenonVariants = PhenomenonUiVariantsV1["variants"];

function variantValue(block: PhenomenonContentBlockRecord | null, key: keyof PhenomenonVariants) {
  const variants = block?.blocks_json?.variants ?? null;
  if (!variants) return "";
  const value = variants[key];
  return typeof value === "string" ? value : "";
}

export default function PhenomenonContentReview({
  phenomenon,
  latest,
  latestApproved,
}: PhenomenonContentReviewProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [variants, setVariants] = useState(() => ({
    teaser: variantValue(latest, "teaser"),
    short: variantValue(latest, "short"),
    long: variantValue(latest, "long"),
    spectacular_moment: variantValue(latest, "spectacular_moment"),
    timing: variantValue(latest, "timing"),
    how_to_watch: variantValue(latest, "how_to_watch"),
    what_to_look_for: variantValue(latest, "what_to_look_for"),
    ethics_tip: variantValue(latest, "ethics_tip"),
    did_you_know: variantValue(latest, "did_you_know"),
  }));

  const hasAnyContent = useMemo(() => {
    return Boolean(variants.short.trim() || variants.long.trim() || variants.teaser.trim());
  }, [variants]);

  const latestStatus = latest?.review_status ?? "draft";

  const saveManualEdits = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    const response = await fetch(`/api/phenomena/${phenomenon.id}/content`, {
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

  const regenerate = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);

    const response = await fetch(`/api/phenomena/${phenomenon.id}/content/generate`, { method: "POST" });
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

    const response = await fetch(`/api/phenomena/${phenomenon.id}/content/approve`, { method: "POST" });
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
          <p className="admin-heading__label">Phenomenon content</p>
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
          <Button type="button" variant="ghost" onClick={regenerate} disabled={saving}>
            Regenerate
          </Button>
          <Button type="button" variant="primary" onClick={approve} disabled={saving || !hasAnyContent}>
            Approve
          </Button>
        </div>
      </header>

      <form className="space-y-6" onSubmit={saveManualEdits}>
        <Card className="place-content stack">
          <p className="admin-subheading">Panel copy</p>

          {(
            [
              ["teaser", "teaser"],
              ["short", "short"],
              ["long", "long"],
              ["spectacular_moment", "spectacular_moment"],
              ["timing", "timing"],
              ["how_to_watch", "how_to_watch"],
              ["what_to_look_for", "what_to_look_for"],
              ["ethics_tip", "ethics_tip"],
              ["did_you_know", "did_you_know"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="form-field">
              <span className="form-field__label">{label}</span>
              <div className="form-field__row">
                <textarea
                  className={`input ${key === "teaser" || key === "did_you_know" || key === "ethics_tip" ? "min-h-[80px]" : "min-h-[140px]"}`}
                  value={variants[key]}
                  onChange={(event) => setVariants((p) => ({ ...p, [key]: event.target.value }))}
                />
              </div>
            </label>
          ))}
        </Card>

        <div className="flex justify-end">
          <Button type="submit" variant="ghost" disabled={saving}>
            {saving ? "Saving…" : "Save draft"}
          </Button>
        </div>
      </form>

      {message ? <p className="admin-message admin-message--success">{message}</p> : null}
      {error ? (
        <p className="admin-message admin-message--error" aria-live="assertive">
          {error}
        </p>
      ) : null}
    </section>
  );
}

