"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import BirdCreateForm from "@/components/admin/BirdCreateForm";
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
  birds: Bird[];
};

const SIZE_ORDER: Record<BirdSizeCategory, number> = {
  very_small: 0,
  small: 1,
  medium: 2,
  large: 3,
};

const VISIBILITY_ORDER: Record<BirdVisibilityCategory, number> = {
  frequent: 0,
  seasonal: 1,
  rare: 2,
};

type SortKey =
  | "updated_desc"
  | "name_asc"
  | "size_asc"
  | "visibility_asc"
  | "missing_first";

export default function BirdListShell({ birds }: BirdListShellProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BirdStatus | "all">("all");
  const [sizeFilter, setSizeFilter] = useState<
    BirdSizeCategory | "all" | "missing"
  >("all");
  const [visibilityFilter, setVisibilityFilter] = useState<
    BirdVisibilityCategory | "all" | "missing"
  >("all");
  const [sortKey, setSortKey] = useState<SortKey>("updated_desc");

  const normalizedSearch = search.trim().toLowerCase();

  const missingClassificationCount = useMemo(() => {
    return birds.reduce((count, bird) => {
      return bird.size_category === null || bird.visibility_category === null
        ? count + 1
        : count;
    }, 0);
  }, [birds]);

  const filteredBirds = useMemo(() => {
    const filtered = birds.filter((bird) => {
      const matchesSearch =
        bird.name_hu.toLowerCase().includes(normalizedSearch) ||
        bird.slug.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" || bird.status === statusFilter;

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
    const initial = BIRD_STATUS_VALUES.reduce<Record<BirdStatus, number>>(
      (acc, status) => {
        acc[status] = 0;
        return acc;
      },
      {} as Record<BirdStatus, number>
    );

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
          {birds.length} birds tracked in the pipeline. Filter by status or
          search names and slugs to find the one you need.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link className="admin-nav-link" href="/admin/birds/sorting">
            Sorting / csoportosítás
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
            <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400 lg:w-40">
              Status filter
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    (event.target.value || "all") as BirdStatus | "all"
                  )
                }
                className="rounded-[14px] border border-zinc-800 bg-transparent px-4 py-2 text-sm text-white focus:border-white focus:outline-none"
              >
                <option value="all">All statuses</option>
                {BIRD_STATUS_VALUES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
                </select>
              </label>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
              Size
              <select
                value={sizeFilter}
                onChange={(event) =>
                  setSizeFilter(event.target.value as BirdSizeCategory | "all" | "missing")
                }
                className="rounded-[14px] border border-zinc-800 bg-transparent px-4 py-2 text-sm text-white focus:border-white focus:outline-none"
              >
                <option value="all">All sizes</option>
                <option value="missing">Missing size</option>
                <option value="very_small">Very small (&lt; 12 cm)</option>
                <option value="small">Small (12–20 cm)</option>
                <option value="medium">Medium (20–40 cm)</option>
                <option value="large">Large (&gt; 40 cm)</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
              Visibility
              <select
                value={visibilityFilter}
                onChange={(event) =>
                  setVisibilityFilter(
                    event.target.value as BirdVisibilityCategory | "all" | "missing"
                  )
                }
                className="rounded-[14px] border border-zinc-800 bg-transparent px-4 py-2 text-sm text-white focus:border-white focus:outline-none"
              >
                <option value="all">All visibility</option>
                <option value="missing">Missing visibility</option>
                <option value="frequent">Frequent</option>
                <option value="seasonal">Seasonal</option>
                <option value="rare">Rare</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
              Sort
              <select
                value={sortKey}
                onChange={(event) => setSortKey(event.target.value as SortKey)}
                className="rounded-[14px] border border-zinc-800 bg-transparent px-4 py-2 text-sm text-white focus:border-white focus:outline-none"
              >
                <option value="updated_desc">Recently updated</option>
                <option value="name_asc">Name (A→Z)</option>
                <option value="size_asc">Size (small→large)</option>
                <option value="visibility_asc">Visibility (frequent→rare)</option>
                <option value="missing_first">Missing first</option>
              </select>
            </label>
          </div>

          <div className="admin-stat-grid">
            {BIRD_STATUS_VALUES.map((status) => (
              <article key={status} className="admin-stat-card">
                <p className="text-[10px] uppercase tracking-[0.35em] text-zinc-500">
                  {status}
                </p>
                <p className="text-2xl font-semibold text-white">
                  {statusCounts[status] ?? 0}
                </p>
              </article>
            ))}
            <article className="admin-stat-card admin-stat-card--note">
              Bird list is limited to 100 latest records.
            </article>
          </div>
        </Card>

        <div className="space-y-4">
          <BirdCreateForm />
          <Card className="space-y-3 text-sm">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.4em] text-zinc-400">
                Sorting panel
              </p>
              <p className="text-xs text-zinc-500">
                Group birds by size + visibility. Missing items go to a dedicated
                queue with AI suggestions and manual approval.
              </p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-white">
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
            No birds match the current filters. Adjust the search or status to
            continue.
          </Card>
        ) : (
          filteredBirds.map((bird) => (
            <Link
              key={bird.id}
              href={`/admin/birds/${bird.id}`}
              className="admin-list-link"
            >
              <div className="admin-list-details">
                <p className="text-lg font-semibold text-white">{bird.name_hu}</p>
                <p className="admin-list-meta">{bird.slug}</p>
                <p className="text-xs text-zinc-500">
                  {bird.name_latin ?? "No Latin name yet"}
                </p>
                <p className="admin-list-date">
                  Updated{" "}
                  {new Intl.DateTimeFormat(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(bird.updated_at))}
                </p>
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
