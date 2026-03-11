"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/ui/components/Button";
import { Card } from "@/ui/components/Card";
import { Input } from "@/ui/components/Input";
import type { PhenomenonBirdLink, PhenomenonBirdReviewStatus } from "@/types/phenomenon";
import { PHENOMENON_BIRD_REVIEW_STATUS_VALUES } from "@/types/phenomenon";

type PhenomenonBirdsEditorProps = {
  phenomenonId: string;
};

type PhenomenonBirdLinkRow = PhenomenonBirdLink & {
  bird?: { id: string; slug: string; name_hu: string } | null;
};

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

export default function PhenomenonBirdsEditor({ phenomenonId }: PhenomenonBirdsEditorProps) {
  const router = useRouter();
  const [phenomenonTitle, setPhenomenonTitle] = useState("");
  const [links, setLinks] = useState<PhenomenonBirdLinkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggesting, setSuggesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [pendingName, setPendingName] = useState("");
  const [birdId, setBirdId] = useState("");
  const [rank, setRank] = useState("0");
  const [reviewStatus, setReviewStatus] = useState<PhenomenonBirdReviewStatus>("approved");

  const canCreate = useMemo(() => {
    const hasPending = Boolean(pendingName.trim());
    const hasBirdId = Boolean(birdId.trim());
    return (hasPending || hasBirdId) && !(hasPending && hasBirdId);
  }, [pendingName, birdId]);

  const sortedLinks = useMemo(() => {
    const copy = [...links];
    copy.sort((a, b) => a.rank - b.rank || a.updated_at.localeCompare(b.updated_at));
    return copy;
  }, [links]);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    const response = await fetch(`/api/phenomena/${phenomenonId}/birds`, { method: "GET" });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error ?? "Unable to load phenomenon birds.");
      setLoading(false);
      return;
    }

    setLinks((payload?.data?.links ?? []) as PhenomenonBirdLinkRow[]);
    setPhenomenonTitle(String(payload?.data?.phenomenon?.title ?? ""));
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phenomenonId]);

  const suggest = async () => {
    setSuggesting(true);
    setError(null);
    setMessage(null);

    const response = await fetch(`/api/phenomena/${phenomenonId}/birds/suggest`, { method: "POST" });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error ?? "Unable to suggest birds.");
      setSuggesting(false);
      return;
    }

    setMessage(
      `Suggested ${Number(payload?.data?.inserted_count ?? 0)} birds (replaced ${Number(payload?.data?.deleted_count ?? 0)}).`
    );
    router.refresh();
    await refresh();
    setSuggesting(false);
  };

  const createLink = async (event: FormEvent) => {
    event.preventDefault();
    if (!canCreate) return;

    setSaving(true);
    setError(null);
    setMessage(null);

    const response = await fetch(`/api/phenomena/${phenomenonId}/birds`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pending_bird_name_hu: pendingName.trim() ? normalizeName(pendingName) : null,
        bird_id: birdId.trim() ? birdId.trim() : null,
        rank: Number.isFinite(Number(rank)) ? Number(rank) : 0,
        review_status: reviewStatus,
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error ?? "Unable to create link.");
      setSaving(false);
      return;
    }

    setPendingName("");
    setBirdId("");
    setRank("0");
    setMessage("Link created.");
    router.refresh();
    await refresh();
    setSaving(false);
  };

  const updateLink = async (link: PhenomenonBirdLinkRow, updates: Partial<PhenomenonBirdLinkRow>) => {
    setSaving(true);
    setError(null);
    setMessage(null);

    const response = await fetch(`/api/phenomena/${phenomenonId}/birds`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: link.id,
        rank: typeof updates.rank === "number" ? updates.rank : undefined,
        review_status: typeof updates.review_status === "string" ? updates.review_status : undefined,
        bird_id: Object.prototype.hasOwnProperty.call(updates, "bird_id") ? updates.bird_id : undefined,
        pending_bird_name_hu: Object.prototype.hasOwnProperty.call(updates, "pending_bird_name_hu")
          ? updates.pending_bird_name_hu
          : undefined,
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error ?? "Unable to update link.");
      setSaving(false);
      return;
    }

    router.refresh();
    await refresh();
    setSaving(false);
  };

  const deleteLink = async (linkId: string) => {
    setSaving(true);
    setError(null);
    setMessage(null);

    const response = await fetch(`/api/phenomena/${phenomenonId}/birds?id=${encodeURIComponent(linkId)}`, {
      method: "DELETE",
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error ?? "Unable to delete link.");
      setSaving(false);
      return;
    }

    router.refresh();
    await refresh();
    setSaving(false);
  };

  return (
    <section className="space-y-6">
      <header className="admin-header-row">
        <div className="admin-heading">
          <p className="admin-heading__label">Phenomenon birds</p>
          <h2 className="admin-heading__title admin-heading__title--large">Linked birds</h2>
          <p className="admin-heading__description">{phenomenonTitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="ghost" onClick={suggest} disabled={suggesting || saving}>
            {suggesting ? "Suggesting…" : "Suggest birds"}
          </Button>
        </div>
      </header>

      <Card className="stack">
        <p className="admin-subheading">Add link</p>
        <form className="grid gap-3 md:grid-cols-4" onSubmit={createLink}>
          <label className="form-field md:col-span-2">
            <span className="form-field__label">pending_bird_name_hu (or leave empty)</span>
            <div className="form-field__row">
              <Input value={pendingName} onChange={(e) => setPendingName(e.target.value)} placeholder="e.g. daru" />
            </div>
          </label>
          <label className="form-field md:col-span-2">
            <span className="form-field__label">bird_id (or leave empty)</span>
            <div className="form-field__row">
              <Input value={birdId} onChange={(e) => setBirdId(e.target.value)} placeholder="uuid" />
            </div>
          </label>
          <label className="form-field">
            <span className="form-field__label">rank</span>
            <div className="form-field__row">
              <Input value={rank} onChange={(e) => setRank(e.target.value)} inputMode="numeric" />
            </div>
          </label>
          <label className="form-field">
            <span className="form-field__label">review_status</span>
            <div className="form-field__row">
              <select
                className="input"
                value={reviewStatus}
                onChange={(e) => setReviewStatus(e.target.value as PhenomenonBirdReviewStatus)}
              >
                {PHENOMENON_BIRD_REVIEW_STATUS_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          </label>
          <div className="md:col-span-4 flex justify-end">
            <Button type="submit" variant="primary" disabled={!canCreate || saving}>
              {saving ? "Saving…" : "Add"}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="stack">
        <p className="admin-subheading">Links</p>
        {loading ? (
          <p className="admin-note-small">Loading…</p>
        ) : sortedLinks.length === 0 ? (
          <p className="admin-note-small">No bird links yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-200/70">
            {sortedLinks.map((link) => (
              <li key={link.id} className="py-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    {link.bird ? (
                      <Link className="admin-nav-link" href={`/admin/birds/${link.bird.id}`}>
                        {link.bird.name_hu}
                      </Link>
                    ) : (
                      <p className="text-sm font-medium">{link.pending_bird_name_hu ?? "—"}</p>
                    )}
                    <p className="text-xs text-zinc-500">
                      rank {link.rank} · {link.review_status}
                      {link.bird_id ? ` · bird_id ${link.bird_id}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={saving}
                      onClick={() =>
                        updateLink(link, {
                          review_status: link.review_status === "approved" ? "suggested" : "approved",
                        })
                      }
                    >
                      Toggle approve
                    </Button>
                    <Button type="button" variant="ghost" disabled={saving} onClick={() => deleteLink(link.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {message ? <p className="admin-message admin-message--success">{message}</p> : null}
      {error ? (
        <p className="admin-message admin-message--error" aria-live="assertive">
          {error}
        </p>
      ) : null}
    </section>
  );
}

