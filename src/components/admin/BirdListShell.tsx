"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BirdCreateForm from "@/components/admin/BirdCreateForm";
import BirdIcon from "@/components/admin/BirdIcon";
import { Button } from "@/ui/components/Button";
import { Card } from "@/ui/components/Card";
import { Input } from "@/ui/components/Input";
import { StatusPill } from "@/ui/components/StatusPill";
import {
  Bird,
  BirdStatus,
  BIRD_STATUS_VALUES,
  BirdSizeCategory,
  BirdVisibilityCategory,
} from "@/types/bird";

type BirdListShellProps = {
  birds: Array<
    Bird & {
      habitatIconSrc?: string | null;
      iconicPreviewUrl?: string | null;
    }
  >;
};

const SIZE_ORDER: Record<BirdSizeCategory, number> = {
  very_small: 0,
  small: 1,
  medium: 2,
  large: 3,
};

const VISIBILITY_ORDER: Record<BirdVisibilityCategory, number> = {
  common_hu: 0,
  localized_hu: 1,
  seasonal_hu: 2,
  rare_hu: 3,
  not_in_hu: 4,
};

type SortKey =
  | "updated_desc"
  | "name_asc"
  | "size_asc"
  | "visibility_asc"
  | "missing_first";

type SuggestedBirdQueueItem = {
  key: string;
  name_hu: string;
  suggested_count: number;
  latest: {
    place_id: string;
    place_bird_id: string;
    place_name: string | null;
    place_slug: string | null;
    updated_at: string;
  };
};

export default function BirdListShell({ birds }: BirdListShellProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BirdStatus | "all">("all");
  const [sizeFilter, setSizeFilter] = useState<BirdSizeCategory | "all" | "missing">("all");
  const [visibilityFilter, setVisibilityFilter] = useState<
    BirdVisibilityCategory | "all" | "missing"
  >("all");
  const [sortKey, setSortKey] = useState<SortKey>("updated_desc");
  const [suggestedQueue, setSuggestedQueue] = useState<SuggestedBirdQueueItem[]>([]);
  const [suggestedQueueLoading, setSuggestedQueueLoading] = useState(true);
  const [suggestedQueueError, setSuggestedQueueError] = useState<string | null>(null);
  const [suggestedQueueMessage, setSuggestedQueueMessage] = useState<string | null>(null);
  const [creatingQueueKey, setCreatingQueueKey] = useState<string | null>(null);

  const normalizedSearch = search.trim().toLowerCase();

  const refreshSuggestedQueue = async () => {
    setSuggestedQueueLoading(true);
    setSuggestedQueueError(null);

    const response = await fetch("/api/birds/suggested-queue", { method: "GET", cache: "no-store" });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setSuggestedQueue([]);
      setSuggestedQueueError(payload?.error ?? "Unable to load suggested bird queue.");
      setSuggestedQueueLoading(false);
      return;
    }

    const items = (payload?.data ?? []) as SuggestedBirdQueueItem[];
    setSuggestedQueue(
      items.filter(
        (item) => typeof item?.key === "string" && typeof item?.name_hu === "string" && typeof item?.suggested_count === "number"
      )
    );
    setSuggestedQueueLoading(false);
  };

  useEffect(() => {
    refreshSuggestedQueue();
  }, []);

  const quickCreateFromSuggestion = async (item: SuggestedBirdQueueItem) => {
    if (!item?.name_hu?.trim()) return;

    setCreatingQueueKey(item.key);
    setSuggestedQueueError(null);
    setSuggestedQueueMessage(null);

    try {
      const lookupResponse = await fetch("/api/birds/latin-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name_hu: item.name_hu }),
      });

      const lookupBody = await lookupResponse.json().catch(() => null);
      if (!lookupResponse.ok) {
        setSuggestedQueueError(lookupBody?.error ?? "Unable to look up Latin name.");
        return;
      }

      const nameLatin = lookupBody?.data?.name_latin;
      if (typeof nameLatin !== "string" || !nameLatin.trim()) {
        setSuggestedQueueError("Latin lookup returned an empty value.");
        return;
      }

      const createResponse = await fetch("/api/birds/quick-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name_hu: item.name_hu,
          name_latin: nameLatin.trim(),
          link_place_id: item.latest.place_id,
          link_place_bird_id: item.latest.place_bird_id,
        }),
      });

      const createBody = await createResponse.json().catch(() => null);
      if (!createResponse.ok) {
        setSuggestedQueueError(createBody?.error ?? "Unable to quick-create bird.");
        return;
      }

      const birdId = createBody?.data?.bird?.id;
      setSuggestedQueueMessage(
        createBody?.data?.slug
          ? `Bird "${createBody.data.slug}" created. Redirecting to editor...`
          : "Bird created. Redirecting to editor..."
      );

      await refreshSuggestedQueue();

      if (typeof birdId === "string" && birdId) {
        router.push(`/admin/birds/${birdId}`);
        return;
      }

      router.refresh();
    } finally {
      setCreatingQueueKey(null);
    }
  };

  const missingClassificationCount = useMemo(() => {
    return birds.reduce((count, bird) => {
      return bird.size_category === null || bird.visibility_category === null ? count + 1 : count;
    }, 0);
  }, [birds]);

  const filteredBirds = useMemo(() => {
    const filtered = birds.filter((bird) => {
      const matchesSearch =
        bird.name_hu.toLowerCase().includes(normalizedSearch) ||
        bird.slug.toLowerCase().includes(normalizedSearch);

      const matchesStatus = statusFilter === "all" || bird.status === statusFilter;

      const matchesSize =
        sizeFilter === "all"
          ? true
          : sizeFilter === "missing"
            ? bird.size_category === null
            : bird.size_category === sizeFilter;

      const matchesVisibility =
        visibilityFilter === "all"
          ? true
          : visibilityFilter === "missing"
            ? bird.visibility_category === null
            : bird.visibility_category === visibilityFilter;

      return matchesSearch && matchesStatus && matchesSize && matchesVisibility;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortKey === "name_asc") {
        return a.name_hu.localeCompare(b.name_hu, "hu");
      }

      if (sortKey === "size_asc") {
        const aRank =
          a.size_category === null ? Number.POSITIVE_INFINITY : SIZE_ORDER[a.size_category];
        const bRank =
          b.size_category === null ? Number.POSITIVE_INFINITY : SIZE_ORDER[b.size_category];
        if (aRank !== bRank) return aRank - bRank;
        return b.updated_at.localeCompare(a.updated_at);
      }

      if (sortKey === "visibility_asc") {
        const aRank =
          a.visibility_category === null
            ? Number.POSITIVE_INFINITY
            : VISIBILITY_ORDER[a.visibility_category];
        const bRank =
          b.visibility_category === null
            ? Number.POSITIVE_INFINITY
            : VISIBILITY_ORDER[b.visibility_category];
        if (aRank !== bRank) return aRank - bRank;
        return b.updated_at.localeCompare(a.updated_at);
      }

      if (sortKey === "missing_first") {
        const aMissing = Number(a.size_category === null || a.visibility_category === null);
        const bMissing = Number(b.size_category === null || b.visibility_category === null);
        if (aMissing !== bMissing) return bMissing - aMissing;
        return b.updated_at.localeCompare(a.updated_at);
      }

      return b.updated_at.localeCompare(a.updated_at);
    });

    return sorted;
  }, [birds, normalizedSearch, statusFilter, sizeFilter, visibilityFilter, sortKey]);

  const statusCounts = useMemo(() => {
    const initial = BIRD_STATUS_VALUES.reduce<Record<BirdStatus, number>>((acc, status) => {
      acc[status] = 0;
      return acc;
    }, {} as Record<BirdStatus, number>);

    return birds.reduce((counts, bird) => {
      counts[bird.status] = (counts[bird.status] ?? 0) + 1;
      return counts;
    }, initial);
  }, [birds]);

  return (
    <section className="space-y-6">
      <header className="admin-heading">
        <p className="admin-heading__label">Birds registry</p>
        <h1 className="admin-heading__title">Birds list</h1>
        <p className="admin-heading__description">
          {birds.length} birds tracked in the pipeline. Filter by status or search names and
          slugs to find the one you need.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link className="admin-nav-link" href="/admin/birds/sorting">
            Bird classification
          </Link>
          <Link className="admin-nav-link" href="/admin/birds/habitat-assets">
            Habitat assets
          </Link>
          <Link className="admin-nav-link" href="/admin/birds/distribution-maps">
            Distribution maps
          </Link>
          <Link className="admin-nav-link" href="/admin/birds/refill/sex-comparison">
            Refill: male vs female
          </Link>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-[1.5fr,1fr]">
        <Card className="space-y-4 text-sm">
          <div className="admin-filter-row">
            <Input
              label="Search birds"
              placeholder="Name or slug"
              value={search}
              className="flex-1"
              helperText="Search names or slugs"
              onChange={(event) => setSearch(event.target.value)}
            />
            <label className="form-field lg:w-40">
              <span className="form-field__label">Status filter</span>
              <div className="form-field__row">
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter((event.target.value || "all") as BirdStatus | "all")
                  }
                  className="input"
                >
                  <option value="all">All statuses</option>
                  {BIRD_STATUS_VALUES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="form-field">
              <span className="form-field__label">Size</span>
              <div className="form-field__row">
                <select
                  value={sizeFilter}
                  onChange={(event) =>
                    setSizeFilter(event.target.value as BirdSizeCategory | "all" | "missing")
                  }
                  className="input"
                >
                  <option value="all">All sizes</option>
                  <option value="missing">Missing size</option>
                  <option value="very_small">Very small (&lt; 12 cm)</option>
                  <option value="small">Small (12–20 cm)</option>
                  <option value="medium">Medium (20–40 cm)</option>
                  <option value="large">Large (&gt; 40 cm)</option>
                </select>
              </div>
            </label>

            <label className="form-field">
              <span className="form-field__label">Visibility</span>
              <div className="form-field__row">
                <select
                  value={visibilityFilter}
                  onChange={(event) =>
                    setVisibilityFilter(
                      event.target.value as BirdVisibilityCategory | "all" | "missing"
                    )
                  }
                  className="input"
                >
                  <option value="all">All visibility</option>
                  <option value="missing">Missing visibility</option>
                  <option value="common_hu">Common (HU)</option>
                  <option value="localized_hu">Localized (HU)</option>
                  <option value="seasonal_hu">Seasonal (HU)</option>
                  <option value="rare_hu">Rare (HU)</option>
                  <option value="not_in_hu">Not in HU</option>
                </select>
              </div>
            </label>

            <label className="form-field">
              <span className="form-field__label">Sort</span>
              <div className="form-field__row">
                <select
                  value={sortKey}
                  onChange={(event) => setSortKey(event.target.value as SortKey)}
                  className="input"
                >
                  <option value="updated_desc">Recently updated</option>
                  <option value="name_asc">Name (A→Z)</option>
                  <option value="size_asc">Size (small→large)</option>
                  <option value="visibility_asc">Visibility (common→not_in_hu)</option>
                  <option value="missing_first">Missing first</option>
                </select>
              </div>
            </label>
          </div>

          <div className="admin-stat-grid">
            {BIRD_STATUS_VALUES.map((status) => (
              <article key={status} className="admin-stat-card">
                <p className="admin-stat-label">{status}</p>
                <p className="admin-stat-count">{statusCounts[status] ?? 0}</p>
              </article>
            ))}
            <article className="admin-stat-card admin-stat-card--note">
              Bird list is limited to 100 latest records.
            </article>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="space-y-3 text-sm">
            <div className="space-y-1">
              <p className="admin-subheading">Place suggestions queue</p>
              <p className="admin-note-small">
                Unique pending bird names from Place → Bird suggestions (review_status=suggested, not linked yet).
              </p>
            </div>

            <div className="flex items-center justify-end">
              <Button
                type="button"
                variant="secondary"
                disabled={suggestedQueueLoading || Boolean(creatingQueueKey)}
                onClick={refreshSuggestedQueue}
              >
                {suggestedQueueLoading ? "Refreshing…" : "Refresh"}
              </Button>
            </div>

            {suggestedQueueLoading ? (
              <p className="admin-note-small">Loading queue…</p>
            ) : suggestedQueue.length === 0 ? (
              <p className="admin-note-small">No pending suggestions in queue.</p>
            ) : (
              <div className="space-y-2">
                {suggestedQueue.slice(0, 18).map((item) => (
                  <div key={item.key} className="flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <p className="font-semibold">{item.name_hu}</p>
                      <p className="admin-note-small">
                        Suggested in <span className="font-semibold">{item.suggested_count}</span>{" "}
                        {item.suggested_count === 1 ? "place" : "places"}
                        {item.latest.place_name ? (
                          <>
                            {" "}
                            · latest:{" "}
                            <Link className="admin-nav-link" href={`/admin/places/${item.latest.place_id}/birds`}>
                              {item.latest.place_name}
                            </Link>
                          </>
                        ) : null}
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="accent"
                      disabled={Boolean(creatingQueueKey) || suggestedQueueLoading}
                      onClick={() => quickCreateFromSuggestion(item)}
                    >
                      {creatingQueueKey === item.key ? "Creating…" : "Quick create (AI Latin)"}
                    </Button>
                  </div>
                ))}
                {suggestedQueue.length > 18 ? (
                  <p className="admin-note-small">Showing first 18 of {suggestedQueue.length}.</p>
                ) : null}
              </div>
            )}

            {suggestedQueueError ? (
              <p className="admin-message admin-message--error" aria-live="assertive">
                {suggestedQueueError}
              </p>
            ) : null}
            {suggestedQueueMessage ? (
              <p className="admin-message admin-message--success" aria-live="polite">
                {suggestedQueueMessage}
              </p>
            ) : null}
          </Card>
          <BirdCreateForm />
          <Card className="space-y-3 text-sm">
            <div className="space-y-1">
              <p className="admin-subheading">Sorting panel</p>
              <p className="admin-note-small">
                Group birds by size + visibility. Missing items go to a dedicated queue with AI
                suggestions and manual approval.
              </p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="admin-note-small">
                Missing classification:{" "}
                <span className="font-semibold">{missingClassificationCount}</span>
              </p>
              <Link className="admin-nav-link" href="/admin/birds/sorting">
                Open sorting
              </Link>
            </div>
          </Card>
        </div>
      </div>

      <div className="space-y-4">
        {filteredBirds.length === 0 ? (
          <Card className="admin-stat-card admin-stat-card--note">
            No birds match the current filters. Adjust the search or status to continue.
          </Card>
        ) : (
          filteredBirds.map((bird) => (
            <Link key={bird.id} href={`/admin/birds/${bird.id}`} className="admin-list-link">
              <div className="admin-list-details">
                <div className="admin-bird-list-grid">
                  <BirdIcon
                    habitatSrc={bird.habitatIconSrc}
                    iconicSrc={bird.iconicPreviewUrl}
                    showHabitatBackground
                    size={76}
                  />
                  <div className="admin-bird-text-cell">
                    <p className="admin-list-title">{bird.name_hu}</p>
                    <p className="admin-list-meta">{bird.slug}</p>
                    <p className="admin-list-date">
                      Updated{" "}
                      {new Intl.DateTimeFormat(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(bird.updated_at))}
                    </p>
                  </div>
                </div>
              </div>
              <div className="admin-inline-actions">
                <StatusPill status={bird.status} />
                <span className="admin-list-action">Open editor</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
