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
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.4em] text-zinc-400">
          Birds registry
        </p>
        <h1 className="text-3xl font-semibold text-white">Birds list</h1>
        <p className="text-sm text-zinc-400">
          {birds.length} birds tracked in the pipeline. Filter by status or
          search names and slugs to find the one you need.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-[1.5fr,1fr]">
        <Card className="space-y-4 text-sm">
          <div className="flex flex-col gap-3 lg:flex-row">
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

          <div className="grid gap-3 md:grid-cols-3">
            {BIRD_STATUS_VALUES.map((status) => (
              <article
                key={status}
                className="rounded-[14px] border border-white/5 bg-zinc-950/60 p-4"
              >
                <p className="text-[10px] uppercase tracking-[0.35em] text-zinc-500">
                  {status}
                </p>
                <p className="text-2xl font-semibold text-white">
                  {statusCounts[status] ?? 0}
                </p>
              </article>
            ))}
            <article className="rounded-[14px] border border-dashed border-white/10 bg-transparent p-3 text-xs text-zinc-500">
              Bird list is limited to 100 latest records.
            </article>
          </div>
        </Card>

        <BirdCreateForm />
      </div>

      <div className="space-y-4">
        {filteredBirds.length === 0 ? (
          <Card className="rounded-[14px] border border-dashed border-white/10 bg-transparent p-4 text-sm text-zinc-400">
            No birds match the current filters. Adjust the search or status to
            continue.
          </Card>
        ) : (
          filteredBirds.map((bird) => (
            <Link
              key={bird.id}
              href={`/admin/birds/${bird.id}`}
              className="group block no-underline transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/70"
            >
              <Card className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-lg font-semibold text-white">
                      {bird.name_hu}
                    </p>
                    <p className="text-xs uppercase tracking-[0.4em] text-zinc-400">
                      {bird.slug}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {bird.name_latin ?? "No Latin name yet"}
                    </p>
                  </div>
                  <StatusPill status={bird.status} />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
                  <p>
                    Updated{" "}
                    {new Intl.DateTimeFormat(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(bird.updated_at))}
                  </p>
                  <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs uppercase tracking-[0.4em] text-white transition group-hover:border-white">
                    Open editor
                  </span>
                </div>
              </Card>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
