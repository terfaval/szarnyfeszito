"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/ui/components/Button";
import { Card } from "@/ui/components/Card";
import { Input } from "@/ui/components/Input";
import {
  PLACE_FREQUENCY_BANDS,
  type PlaceBirdLink,
  type PlaceBirdReviewStatus,
  type PlaceFrequencyBand,
} from "@/types/place";

type PlaceBirdsEditorProps = {
  placeId: string;
};

type PlaceBirdLinkRow = PlaceBirdLink & {
  bird?: { id: string; slug: string; name_hu: string } | null;
};

type DraftValues = Pick<
  PlaceBirdLinkRow,
  | "rank"
  | "frequency_band"
  | "is_iconic"
  | "visible_in_spring"
  | "visible_in_summer"
  | "visible_in_autumn"
  | "visible_in_winter"
  | "seasonality_note"
  | "review_status"
> & { link_bird_id_input: string };

type PublishedBirdListItem = {
  id: string;
  slug: string;
  name_hu: string;
};

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

async function runWithConcurrency<TInput, TResult>(options: {
  items: TInput[];
  concurrency: number;
  worker: (item: TInput) => Promise<TResult>;
}): Promise<Array<{ item: TInput; ok: true; result: TResult } | { item: TInput; ok: false; error: unknown }>> {
  const { items, concurrency, worker } = options;
  const results: Array<
    | { item: TInput; ok: true; result: TResult }
    | { item: TInput; ok: false; error: unknown }
  > = [];

  let cursor = 0;
  const runner = async () => {
    while (cursor < items.length) {
      const idx = cursor++;
      const item = items[idx]!;
      try {
        const result = await worker(item);
        results[idx] = { item, ok: true, result };
      } catch (error) {
        results[idx] = { item, ok: false, error };
      }
    }
  };

  const runners = Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, () => runner());
  await Promise.all(runners);
  return results;
}

export default function PlaceBirdsEditor({ placeId }: PlaceBirdsEditorProps) {
  const [placeName, setPlaceName] = useState("");
  const [links, setLinks] = useState<PlaceBirdLinkRow[]>([]);
  const [draftById, setDraftById] = useState<Record<string, DraftValues>>({});
  const [loading, setLoading] = useState(true);
  const [suggesting, setSuggesting] = useState(false);
  const [linkingPublished, setLinkingPublished] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<"rank" | "status" | "name">("rank");
  const [publishedBirdSearch, setPublishedBirdSearch] = useState("");
  const [publishedBirds, setPublishedBirds] = useState<PublishedBirdListItem[]>([]);
  const [publishedBirdsLoading, setPublishedBirdsLoading] = useState(false);
  const [selectedPublishedBirdIds, setSelectedPublishedBirdIds] = useState<string[]>([]);

  type CreateValues = {
    pending_bird_name_hu: string;
    bird_id: string;
    rank: string;
    review_status: PlaceBirdReviewStatus;
    frequency_band: string;
    is_iconic: boolean;
    visible_in_spring: boolean;
    visible_in_summer: boolean;
    visible_in_autumn: boolean;
    visible_in_winter: boolean;
    seasonality_note: string;
  };

  type SeasonKey = keyof Pick<
    CreateValues,
    "visible_in_spring" | "visible_in_summer" | "visible_in_autumn" | "visible_in_winter"
  >;

  type DraftSeasonKey = keyof Pick<
    DraftValues,
    "visible_in_spring" | "visible_in_summer" | "visible_in_autumn" | "visible_in_winter"
  >;

  const [createValues, setCreateValues] = useState<CreateValues>({
    pending_bird_name_hu: "",
    bird_id: "",
    rank: "0",
    review_status: "approved",
    frequency_band: "regular",
    is_iconic: false,
    visible_in_spring: false,
    visible_in_summer: false,
    visible_in_autumn: false,
    visible_in_winter: false,
    seasonality_note: "",
  });

  const canCreate = useMemo(() => {
    const hasPending = Boolean(createValues.pending_bird_name_hu.trim());
    const hasBirdId = Boolean(createValues.bird_id.trim());
    return (hasPending || hasBirdId) && !(hasPending && hasBirdId);
  }, [createValues]);

  const sortedLinks = useMemo(() => {
    const copy = [...links];
    if (sortMode === "name") {
      copy.sort((a, b) => {
        const an = a.bird?.name_hu ?? a.pending_bird_name_hu ?? "";
        const bn = b.bird?.name_hu ?? b.pending_bird_name_hu ?? "";
        return an.localeCompare(bn, "hu");
      });
      return copy;
    }
    if (sortMode === "status") {
      const weight = (s: PlaceBirdReviewStatus) => (s === "suggested" ? 0 : 1);
      copy.sort((a, b) => weight(a.review_status) - weight(b.review_status) || a.rank - b.rank);
      return copy;
    }
    copy.sort((a, b) => a.rank - b.rank);
    return copy;
  }, [links, sortMode]);

  const linkedBirdIdSet = useMemo(() => {
    const set = new Set<string>();
    links.forEach((link) => {
      if (link.bird_id) set.add(link.bird_id);
    });
    return set;
  }, [links]);

  const selectedPublishedBirdSet = useMemo(
    () => new Set(selectedPublishedBirdIds),
    [selectedPublishedBirdIds]
  );

  const suggestedUnlinkedNameSet = useMemo(() => {
    const set = new Set<string>();
    links.forEach((link) => {
      if (link.review_status !== "suggested") return;
      if (link.bird_id) return;
      const pending = typeof link.pending_bird_name_hu === "string" ? normalizeName(link.pending_bird_name_hu) : "";
      if (!pending) return;
      set.add(pending.toLowerCase());
    });
    return set;
  }, [links]);

  const visiblePublishedBirds = useMemo(() => {
    const unlinked = publishedBirds.filter((bird) => !linkedBirdIdSet.has(bird.id));
    if (suggestedUnlinkedNameSet.size === 0) return unlinked;
    return unlinked.filter((bird) => suggestedUnlinkedNameSet.has(normalizeName(bird.name_hu).toLowerCase()));
  }, [linkedBirdIdSet, publishedBirds, suggestedUnlinkedNameSet]);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    const response = await fetch(`/api/places/${placeId}/birds`, { method: "GET" });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error ?? "Unable to load place birds.");
      setLoading(false);
      return;
    }

    const nextLinks = (payload?.data?.links ?? []) as PlaceBirdLinkRow[];
    setLinks(nextLinks);
    setPlaceName(String(payload?.data?.place?.name ?? ""));
    setDraftById((prev) => {
      const next: Record<string, DraftValues> = { ...prev };
      nextLinks.forEach((link) => {
        if (!next[link.id]) {
          next[link.id] = {
            rank: link.rank,
            frequency_band: link.frequency_band,
            is_iconic: link.is_iconic,
            visible_in_spring: link.visible_in_spring,
            visible_in_summer: link.visible_in_summer,
            visible_in_autumn: link.visible_in_autumn,
            visible_in_winter: link.visible_in_winter,
            seasonality_note: link.seasonality_note,
            review_status: link.review_status,
            link_bird_id_input: "",
          };
        }
      });
      return next;
    });

    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeId]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      const params = new URLSearchParams();
      params.set("status", "published");
      if (publishedBirdSearch.trim()) params.set("search", publishedBirdSearch.trim());

      setPublishedBirdsLoading(true);
      try {
        const response = await fetch(`/api/birds?${params.toString()}`, { signal: controller.signal });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          setPublishedBirds([]);
          return;
        }
        const list = (payload?.data ?? []) as PublishedBirdListItem[];
        setPublishedBirds(
          list
            .filter((bird) => typeof bird?.id === "string" && typeof bird?.name_hu === "string")
            .map((bird) => ({ id: bird.id, slug: bird.slug, name_hu: bird.name_hu }))
        );
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
          setPublishedBirds([]);
        }
      } finally {
        setPublishedBirdsLoading(false);
      }
    }, 220);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [publishedBirdSearch]);

  const createLink = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const payload = {
      pending_bird_name_hu: createValues.pending_bird_name_hu.trim() || null,
      bird_id: createValues.bird_id.trim() || null,
      rank: Number(createValues.rank || 0),
      review_status: createValues.review_status,
      frequency_band: createValues.frequency_band,
      is_iconic: createValues.is_iconic,
      visible_in_spring: createValues.visible_in_spring,
      visible_in_summer: createValues.visible_in_summer,
      visible_in_autumn: createValues.visible_in_autumn,
      visible_in_winter: createValues.visible_in_winter,
      seasonality_note: createValues.seasonality_note.trim() || null,
    };

    const response = await fetch(`/api/places/${placeId}/birds`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setError(body?.error ?? "Unable to add bird link.");
      return;
    }

    setCreateValues({
      pending_bird_name_hu: "",
      bird_id: "",
      rank: "0",
      review_status: "approved",
      frequency_band: "regular",
      is_iconic: false,
      visible_in_spring: false,
      visible_in_summer: false,
      visible_in_autumn: false,
      visible_in_winter: false,
      seasonality_note: "",
    });

    await refresh();
  };

  const updateLink = async (linkId: string, patch: Partial<PlaceBirdLinkRow>) => {
    setError(null);
    setMessage(null);
    const response = await fetch(`/api/places/${placeId}/birds`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: linkId, ...patch }),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setError(body?.error ?? "Unable to update link.");
      return;
    }
    await refresh();
  };

  const deleteLink = async (linkId: string) => {
    setError(null);
    setMessage(null);
    const response = await fetch(`/api/places/${placeId}/birds?id=${encodeURIComponent(linkId)}`, {
      method: "DELETE",
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setError(body?.error ?? "Unable to delete link.");
      return;
    }
    await refresh();
  };

  const suggestBirds = async () => {
    setSuggesting(true);
    setError(null);
    setMessage(null);
    const response = await fetch(`/api/places/${placeId}/birds/suggest`, { method: "POST" });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setError(body?.error ?? "Unable to suggest birds for this place.");
      setSuggesting(false);
      return;
    }
    setMessage(
      typeof body?.data?.inserted_count === "number"
        ? `Inserted ${body.data.inserted_count} new suggestion(s).`
        : "Suggestions generated."
    );
    await refresh();
    setSuggesting(false);
  };

  const saveDraft = async (link: PlaceBirdLinkRow) => {
    const draft = draftById[link.id];
    if (!draft) return;
    await updateLink(link.id, {
      rank: draft.rank,
      review_status: draft.review_status,
      frequency_band: draft.frequency_band,
      is_iconic: draft.is_iconic,
      visible_in_spring: draft.visible_in_spring,
      visible_in_summer: draft.visible_in_summer,
      visible_in_autumn: draft.visible_in_autumn,
      visible_in_winter: draft.visible_in_winter,
      seasonality_note: draft.seasonality_note,
    });
  };

  const acceptSuggestion = async (link: PlaceBirdLinkRow) => updateLink(link.id, { review_status: "approved" });

  const linkToExistingBird = async (link: PlaceBirdLinkRow) => {
    const birdId = (draftById[link.id]?.link_bird_id_input ?? "").trim();
    if (!birdId) {
      setError("bird_id is required to link.");
      return;
    }
    await updateLink(link.id, { bird_id: birdId, pending_bird_name_hu: null });
  };

  const togglePublishedBirdSelection = (birdId: string) => {
    setSelectedPublishedBirdIds((prev) =>
      prev.includes(birdId) ? prev.filter((id) => id !== birdId) : [...prev, birdId]
    );
  };

  const selectAllPublishedBirdResults = () => {
    const ids = visiblePublishedBirds.map((bird) => bird.id);
    setSelectedPublishedBirdIds((prev) => Array.from(new Set([...prev, ...ids])));
  };

  const clearPublishedBirdSelection = () => setSelectedPublishedBirdIds([]);

  const linkSelectedPublishedBirds = async () => {
    const uniqueSelectedIds = Array.from(new Set(selectedPublishedBirdIds));
    const alreadyLinked = uniqueSelectedIds.filter((id) => linkedBirdIdSet.has(id));
    const toLink = uniqueSelectedIds.filter((id) => !linkedBirdIdSet.has(id));

    if (toLink.length === 0) {
      setMessage(alreadyLinked.length > 0 ? "All selected birds are already linked." : "No birds selected.");
      return;
    }

    setLinkingPublished(true);
    setError(null);
    setMessage(null);

    const maxRank = links.reduce((acc, link) => Math.max(acc, Number.isFinite(link.rank) ? link.rank : 0), 0);
    const startRank = links.length > 0 ? maxRank + 1 : 0;
    const jobs = toLink.map((birdId, index) => ({ birdId, rank: startRank + index }));

    const results = await runWithConcurrency({
      items: jobs,
      concurrency: 4,
      worker: async (job) => {
        const response = await fetch(`/api/places/${placeId}/birds`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bird_id: job.birdId, review_status: "approved", rank: job.rank }),
        });
        const body = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(body?.error ?? `Unable to link bird ${job.birdId}.`);
        }
        return body;
      },
    });

    const okCount = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok) as Array<{
      item: { birdId: string; rank: number };
      ok: false;
      error: unknown;
    }>;

    await refresh();
    setSelectedPublishedBirdIds((prev) => prev.filter((id) => !toLink.includes(id)));
    setLinkingPublished(false);

    if (failed.length > 0) {
      setError(
        `Linked ${okCount}/${toLink.length}. Failed: ${failed.length}. First error: ${
          failed[0]?.error instanceof Error ? failed[0].error.message : String(failed[0]?.error ?? "unknown")
        }`
      );
      return;
    }

    setMessage(
      `Linked ${okCount} bird(s).${alreadyLinked.length > 0 ? ` Skipped ${alreadyLinked.length} already linked.` : ""}`
    );
  };

  const renderLinkRow = (link: PlaceBirdLinkRow) => {
    const draft = draftById[link.id];
    const displayName = link.bird?.name_hu ?? link.pending_bird_name_hu ?? "(unnamed)";
    const isPending = !link.bird_id && Boolean(link.pending_bird_name_hu);

    return (
      <div key={link.id} className="admin-list-link">
        <div className="admin-list-details space-y-3">
          <div className="space-y-1">
            <p className="admin-list-title">{displayName}</p>
            <p className="admin-list-meta">
              {link.bird ? (
                <>
                  linked ·{" "}
                  <Link className="underline" href={`/admin/birds/${link.bird.id}`}>
                    {link.bird.slug}
                  </Link>
                </>
              ) : (
                "pending"
              )}{" "}
              · {link.frequency_band} · rank {link.rank} · {link.review_status}
            </p>
          </div>

          {draft ? (
            <>
              <div className="grid gap-3 md:grid-cols-3">
                <Input
                  label="Rank"
                  value={String(draft.rank)}
                  onChange={(e) =>
                    setDraftById((p) => ({
                      ...p,
                      [link.id]: { ...p[link.id], rank: Number(e.target.value || 0) },
                    }))
                  }
                />

                <label className="form-field">
                  <span className="form-field__label">Status</span>
                  <div className="form-field__row">
                    <select
                      className="input"
                      value={draft.review_status}
                      onChange={(e) =>
                        setDraftById((p) => ({
                          ...p,
                          [link.id]: {
                            ...p[link.id],
                            review_status: e.target.value as PlaceBirdReviewStatus,
                          },
                        }))
                      }
                    >
                      <option value="suggested">suggested</option>
                      <option value="approved">approved</option>
                    </select>
                  </div>
                </label>

                <label className="form-field">
                  <span className="form-field__label">Frequency</span>
                  <div className="form-field__row">
                    <select
                      className="input"
                      value={draft.frequency_band}
                      onChange={(e) =>
                        setDraftById((p) => ({
                          ...p,
                          [link.id]: {
                            ...p[link.id],
                            frequency_band: e.target.value as PlaceFrequencyBand,
                          },
                        }))
                      }
                    >
                      {PLACE_FREQUENCY_BANDS.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-6">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.is_iconic}
                    onChange={(e) =>
                      setDraftById((p) => ({
                        ...p,
                        [link.id]: { ...p[link.id], is_iconic: e.target.checked },
                      }))
                    }
                  />
                  Iconic
                </label>
                {(
                  [
                    ["visible_in_spring", "Spring"],
                    ["visible_in_summer", "Summer"],
                    ["visible_in_autumn", "Autumn"],
                    ["visible_in_winter", "Winter"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={draft[key as DraftSeasonKey]}
                      onChange={(e) =>
                        setDraftById((p) => ({
                          ...p,
                          [link.id]: { ...p[link.id], [key as DraftSeasonKey]: e.target.checked },
                        }))
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>

              <Input
                label="Seasonality note"
                value={draft.seasonality_note ?? ""}
                onChange={(e) =>
                  setDraftById((p) => ({
                    ...p,
                    [link.id]: { ...p[link.id], seasonality_note: e.target.value },
                  }))
                }
                placeholder="Mostly in late autumn..."
              />
            </>
          ) : null}
        </div>

        <div className="admin-inline-actions">
          {link.review_status === "suggested" ? (
            <Button type="button" variant="ghost" onClick={() => acceptSuggestion(link)}>
              Accept
            </Button>
          ) : null}

          <Button type="button" variant="ghost" onClick={() => saveDraft(link)}>
            Save
          </Button>

          {isPending && link.pending_bird_name_hu ? (
            <Link
              className="btn btn--accent"
              href={`/admin/birds?prefill_name_hu=${encodeURIComponent(
                link.pending_bird_name_hu
              )}&source=place_suggestion&place_name=${encodeURIComponent(placeName || "")}&link_place_id=${encodeURIComponent(
                placeId
              )}&link_place_bird_id=${encodeURIComponent(link.id)}`}
            >
              Quick-create bird
            </Link>
          ) : null}

          {isPending ? (
            <div className="flex flex-col items-end gap-2">
              <Input
                label="Link bird_id"
                value={draftById[link.id]?.link_bird_id_input ?? ""}
                onChange={(e) =>
                  setDraftById((p) => ({
                    ...p,
                    [link.id]: { ...p[link.id], link_bird_id_input: e.target.value },
                  }))
                }
                placeholder="uuid..."
              />
              <Button type="button" variant="ghost" onClick={() => linkToExistingBird(link)}>
                Link to existing bird
              </Button>
            </div>
          ) : null}

          <Button type="button" variant="ghost" onClick={() => deleteLink(link.id)}>
            Delete
          </Button>
        </div>
      </div>
    );
  };

  return (
    <section className="place-birds space-y-6">
      <header className="admin-heading">
        <p className="admin-heading__label">Place birds</p>
        <h2 className="admin-heading__title admin-heading__title--large">Bird links</h2>
        <p className="admin-heading__description">
          Suggestions are inserted as{" "}
          <code className="rounded bg-zinc-100 px-1 text-xs">review_status=suggested</code> and stay private until
          approved.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="accent" onClick={suggestBirds} disabled={suggesting}>
            {suggesting ? "Suggesting..." : "Suggest birds"}
          </Button>
          <Button type="button" variant="ghost" onClick={refresh} disabled={loading}>
            Refresh
          </Button>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-zinc-500">Sort</span>
            <select
              className="input"
              value={sortMode}
              onChange={(e) => {
                const next = e.target.value;
                if (next === "rank" || next === "status" || next === "name") {
                  setSortMode(next);
                }
              }}
            >
              <option value="rank">Rank</option>
              <option value="status">Status</option>
              <option value="name">Name</option>
            </select>
          </label>
          {placeName ? <span className="text-sm text-zinc-500">Place: {placeName}</span> : null}
        </div>
      </header>

      <Card className="place-birds stack">
        <p className="admin-subheading">Link published birds (multi)</p>
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Search (published only)"
            value={publishedBirdSearch}
            onChange={(event) => setPublishedBirdSearch(event.target.value)}
            placeholder="pl. széncinege"
            helperText="Uses /api/birds?status=published (max 100 results)."
          />
          <div className="flex flex-wrap items-end gap-2">
            <Button type="button" variant="ghost" onClick={selectAllPublishedBirdResults} disabled={publishedBirdsLoading}>
              Select all results
            </Button>
            <Button type="button" variant="ghost" onClick={clearPublishedBirdSelection} disabled={selectedPublishedBirdIds.length === 0}>
              Clear
            </Button>
            <Button
              type="button"
              variant="accent"
              onClick={linkSelectedPublishedBirds}
              disabled={linkingPublished || selectedPublishedBirdIds.length === 0}
            >
              {linkingPublished ? "Linking..." : `Link selected (${selectedPublishedBirdIds.length})`}
            </Button>
          </div>
        </div>

        {publishedBirdsLoading ? <p className="admin-note-small">Loading published birds…</p> : null}

        {suggestedUnlinkedNameSet.size > 0 ? (
          <p className="admin-note-small">
            Showing only unlinked published birds that match current suggested (pending) names.
          </p>
        ) : null}

        {visiblePublishedBirds.length === 0 && !publishedBirdsLoading ? (
          <p className="admin-note-small">No published birds found.</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {visiblePublishedBirds.slice(0, 40).map((bird) => {
              const selected = selectedPublishedBirdSet.has(bird.id);
              return (
                <label key={bird.id} className="admin-list-link flex items-center justify-between gap-3">
                  <div className="admin-list-details">
                    <p className="admin-list-title">{bird.name_hu}</p>
                    <p className="admin-list-meta">{bird.slug ? `${bird.slug} · ` : ""}published</p>
                  </div>
                  <div className="admin-list-action flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => togglePublishedBirdSelection(bird.id)}
                      aria-label={`Select ${bird.name_hu}`}
                    />
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="place-birds stack">
        <p className="admin-subheading">Add link</p>
        <form className="space-y-4" onSubmit={createLink}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Pending bird name (HU)"
              value={createValues.pending_bird_name_hu}
              onChange={(event) => setCreateValues((p) => ({ ...p, pending_bird_name_hu: event.target.value }))}
              placeholder="Daru"
              helperText="Use this when Bird record does not exist yet."
            />
            <Input
              label="Existing bird_id (uuid)"
              value={createValues.bird_id}
              onChange={(event) => setCreateValues((p) => ({ ...p, bird_id: event.target.value }))}
              placeholder="uuid..."
              helperText="Use this when Bird already exists."
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Input
              label="Rank"
              value={createValues.rank}
              onChange={(event) => setCreateValues((p) => ({ ...p, rank: event.target.value }))}
              placeholder="0"
            />

            <label className="form-field">
              <span className="form-field__label">Status</span>
              <div className="form-field__row">
                <select
                  className="input"
                  value={createValues.review_status}
                  onChange={(event) =>
                    setCreateValues((p) => ({ ...p, review_status: event.target.value as PlaceBirdReviewStatus }))
                  }
                >
                  <option value="approved">approved</option>
                  <option value="suggested">suggested</option>
                </select>
              </div>
            </label>

            <label className="form-field">
              <span className="form-field__label">Frequency</span>
              <div className="form-field__row">
                <select
                  className="input"
                  value={createValues.frequency_band}
                  onChange={(event) => setCreateValues((p) => ({ ...p, frequency_band: event.target.value }))}
                >
                  {PLACE_FREQUENCY_BANDS.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            {(
              [
                ["visible_in_spring", "Spring"],
                ["visible_in_summer", "Summer"],
                ["visible_in_autumn", "Autumn"],
                ["visible_in_winter", "Winter"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={createValues[key]}
                  onChange={(event) => setCreateValues((p) => ({ ...p, [key as SeasonKey]: event.target.checked }))}
                />
                {label}
              </label>
            ))}
          </div>

          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={createValues.is_iconic}
              onChange={(event) => setCreateValues((p) => ({ ...p, is_iconic: event.target.checked }))}
            />
            Iconic at this place
          </label>

          <Input
            label="Seasonality note"
            value={createValues.seasonality_note}
            onChange={(event) => setCreateValues((p) => ({ ...p, seasonality_note: event.target.value }))}
            placeholder="Mostly in late autumn..."
          />

          <Button type="submit" variant="accent" disabled={!canCreate}>
            Add bird link
          </Button>
        </form>
      </Card>

      <Card className="place-birds stack">
        <p className="admin-subheading">Current links</p>

        {loading ? (
          <p className="admin-note-small">Loading...</p>
        ) : sortedLinks.length === 0 ? (
          <p className="admin-note-small">No birds linked yet.</p>
        ) : (
          <div className="space-y-4">
            {sortedLinks.some((link) => link.review_status === "suggested" && !link.bird_id) ? (
              <div className="space-y-2">
                <p className="admin-subheading">Suggested (pending)</p>
                {sortedLinks
                  .filter((link) => link.review_status === "suggested" && !link.bird_id)
                  .map((link) => renderLinkRow(link))}
              </div>
            ) : null}

            {sortedLinks.some((link) => link.bird_id) ? (
              <div className="space-y-2">
                <p className="admin-subheading">Linked</p>
                {sortedLinks.filter((link) => link.bird_id).map((link) => renderLinkRow(link))}
              </div>
            ) : null}

            {sortedLinks.some((link) => link.review_status !== "suggested" && !link.bird_id) ? (
              <div className="space-y-2">
                <p className="admin-subheading">Unlinked (non-suggested)</p>
                {sortedLinks
                  .filter((link) => link.review_status !== "suggested" && !link.bird_id)
                  .map((link) => renderLinkRow(link))}
              </div>
            ) : null}
          </div>
        )}
      </Card>

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
