"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/ui/components/Button";
import { Card } from "@/ui/components/Card";
import ImageReviewStatusPill from "@/ui/components/ImageReviewStatusPill";

type HabitatStockAssetRow = {
  asset: {
    id: string;
    key: string;
    label_hu: string;
    place_types: string[];
    sort: number;
  };
  currentImage:
    | {
        id: string;
        review_status: "draft" | "reviewed" | "approved";
        storage_path: string;
        signedUrl: string | null;
        updated_at: string;
      }
    | null;
};

async function fetchJson(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error ?? `Request failed: ${response.status}`);
  }
  return payload;
}

export default function HabitatStockAssetsTool() {
  const [rows, setRows] = useState<HabitatStockAssetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const payload = await fetchJson("/api/birds/habitat-assets", { method: "GET" });
      setRows((payload?.data ?? []) as HabitatStockAssetRow[]);
    } catch (e) {
      setRows([]);
      setError((e as Error)?.message ?? "Unable to load habitat assets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => (a.asset.sort ?? 0) - (b.asset.sort ?? 0));
  }, [rows]);

  const generate = async (key: string, forceRegenerate: boolean) => {
    setBusyKey(key);
    setError(null);
    setMessage(null);
    try {
      await fetchJson("/api/birds/habitat-assets/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, force_regenerate: forceRegenerate }),
      });
      setMessage(forceRegenerate ? "Regenerated habitat tile." : "Generated habitat tile.");
      await load();
    } catch (e) {
      setError((e as Error)?.message ?? "Unable to generate.");
    } finally {
      setBusyKey(null);
    }
  };

  const setImageStatus = async (imageId: string, status: "draft" | "reviewed" | "approved") => {
    setBusyKey(imageId);
    setError(null);
    setMessage(null);
    try {
      await fetchJson(`/api/birds/habitat-assets/images/${imageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review_status: status }),
      });
      setMessage(`Updated status → ${status}.`);
      await load();
    } catch (e) {
      setError((e as Error)?.message ?? "Unable to update status.");
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <section className="space-y-6">
      <header className="admin-heading">
        <p className="admin-heading__label">Birds / Assets</p>
        <h1 className="admin-heading__title">Habitat stock assets</h1>
        <p className="admin-heading__description">
          Iconic, full-frame square habitat tiles derived from grouped place types. Studio only.
        </p>
      </header>

      {loading ? (
        <Card className="admin-stat-card admin-stat-card--note">Loading assets…</Card>
      ) : sortedRows.length === 0 ? (
        <Card className="admin-stat-card admin-stat-card--note">No habitat assets found.</Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sortedRows.map((row) => {
            const image = row.currentImage;
            const locked = image?.review_status === "approved";
            const isBusy = busyKey === row.asset.key || busyKey === image?.id;
            return (
              <Card key={row.asset.id} className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="font-semibold">{row.asset.label_hu}</p>
                    <p className="admin-note-small">
                      <span className="font-semibold">{row.asset.key}</span>
                      {row.asset.place_types?.length ? (
                        <> · {row.asset.place_types.join(", ")}</>
                      ) : null}
                    </p>
                  </div>
                  {image ? (
                    <ImageReviewStatusPill status={image.review_status} />
                  ) : (
                    <ImageReviewStatusPill status="draft" />
                  )}
                </div>

                <div className="grid gap-3 md:grid-cols-[160px,1fr]">
                  <div className="aspect-square w-full overflow-hidden rounded-md bg-slate-100">
                    {image?.signedUrl ? (
                      <img src={image.signedUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
                        No image
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="accent"
                        disabled={isBusy || Boolean(image) }
                        onClick={() => generate(row.asset.key, false)}
                      >
                        {busyKey === row.asset.key ? "Working…" : "Generate"}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={isBusy || !image || locked}
                        onClick={() => generate(row.asset.key, true)}
                      >
                        Regenerate
                      </Button>
                    </div>

                    {image ? (
                      <div className="flex flex-wrap gap-2">
                        {locked ? (
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={isBusy}
                            onClick={() => setImageStatus(image.id, "draft")}
                          >
                            Unapprove
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={isBusy || locked}
                          onClick={() => setImageStatus(image.id, "reviewed")}
                        >
                          Mark reviewed
                        </Button>
                        <Button
                          type="button"
                          variant="accent"
                          disabled={isBusy || locked}
                          onClick={() => setImageStatus(image.id, "approved")}
                        >
                          Approve
                        </Button>
                      </div>
                    ) : null}

                    {locked ? (
                      <p className="admin-note-small">
                        Approved images must be unapproved before regenerating.
                      </p>
                    ) : null}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {error ? (
        <p className="admin-message admin-message--error" aria-live="assertive">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="admin-message admin-message--success" aria-live="polite">
          {message}
        </p>
      ) : null}
    </section>
  );
}
