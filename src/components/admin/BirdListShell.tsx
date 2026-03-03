"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import BirdCreateForm from "@/components/admin/BirdCreateForm";
import { Card } from "@/ui/components/Card";
import { Input } from "@/ui/components/Input";
import { StatusPill } from "@/ui/components/StatusPill";
import { Bird, BirdStatus, BIRD_STATUS_VALUES } from "@/types/bird";

type BirdListShellProps = {
  birds: Bird[];
};

export default function BirdListShell({ birds }: BirdListShellProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BirdStatus | "all">("all");

  const normalizedSearch = search.trim().toLowerCase();

  const filteredBirds = useMemo(() => {
    return birds.filter((bird) => {
      const matchesSearch =
        bird.name_hu.toLowerCase().includes(normalizedSearch) ||
        bird.slug.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" || bird.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [birds, normalizedSearch, statusFilter]);

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

        <BirdCreateForm />
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
