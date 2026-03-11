"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import PlaceCreateForm from "@/components/admin/PlaceCreateForm";
import PlaceBirdRefillBatchTool from "@/components/admin/PlaceBirdRefillBatchTool";
import { Card } from "@/ui/components/Card";
import { Input } from "@/ui/components/Input";
import { StatusPill } from "@/ui/components/StatusPill";
import {
  Place,
  PlaceStatus,
  PlaceType,
  PLACE_STATUS_VALUES,
  PLACE_TYPE_VALUES,
} from "@/types/place";

type PlaceListShellProps = {
  places: Place[];
};

type SortKey = "updated_desc" | "name_asc";

export default function PlaceListShell({ places }: PlaceListShellProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PlaceStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<PlaceType | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("updated_desc");

  const normalizedSearch = search.trim().toLowerCase();

  const filteredPlaces = useMemo(() => {
    const filtered = places.filter((place) => {
      const haystack = [
        place.name,
        place.slug,
        place.region_landscape ?? "",
        place.county ?? "",
        place.nearest_city ?? "",
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);
      const matchesStatus = statusFilter === "all" || place.status === statusFilter;
      const matchesType = typeFilter === "all" || place.place_type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortKey === "name_asc") {
        return a.name.localeCompare(b.name, "hu");
      }
      return b.updated_at.localeCompare(a.updated_at);
    });

    return sorted;
  }, [places, normalizedSearch, statusFilter, typeFilter, sortKey]);

  const statusCounts = useMemo(() => {
    const initial = PLACE_STATUS_VALUES.reduce<Record<PlaceStatus, number>>((acc, status) => {
      acc[status] = 0;
      return acc;
    }, {} as Record<PlaceStatus, number>);

    return places.reduce((counts, place) => {
      counts[place.status] = (counts[place.status] ?? 0) + 1;
      return counts;
    }, initial);
  }, [places]);

  return (
    <section className="place-list space-y-6">
      <header className="admin-heading">
        <p className="admin-heading__label">Places registry</p>
        <h1 className="admin-heading__title">Places list</h1>
        <p className="admin-heading__description">
          {places.length} places tracked. Filter by status/type or search across name/slug/region/county.
        </p>
      </header>

      <div className="grid gap-6">
        <Card className="space-y-4 text-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tatai Öreg-tó"
            />

            <label className="form-field">
              <span className="form-field__label">Status</span>
              <div className="form-field__row">
                <select
                  value={statusFilter}
                  onChange={(event) => {
                    const value = event.target.value;
                    setStatusFilter(
                      value === "all" ? "all" : (value as PlaceStatus)
                    );
                  }}
                  className="input"
                >
                  <option value="all">All statuses</option>
                  {PLACE_STATUS_VALUES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <label className="form-field">
              <span className="form-field__label">Type</span>
              <div className="form-field__row">
                <select
                  value={typeFilter}
                  onChange={(event) => {
                    const value = event.target.value;
                    setTypeFilter(value === "all" ? "all" : (value as PlaceType));
                  }}
                  className="input"
                >
                  <option value="all">All types</option>
                  {PLACE_TYPE_VALUES.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
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
                </select>
              </div>
            </label>
          </div>

          <div className="admin-stat-grid">
            {PLACE_STATUS_VALUES.map((status) => (
              <article key={status} className="admin-stat-card">
                <p className="admin-stat-label">{status}</p>
                <p className="admin-stat-count">{statusCounts[status] ?? 0}</p>
              </article>
            ))}
            <article className="admin-stat-card admin-stat-card--note">
              Place list is limited to 200 latest records.
            </article>
          </div>
        </Card>

        <div className="space-y-4">
          <PlaceCreateForm />
          <Card className="space-y-2 text-sm">
            <p className="admin-subheading">Public surface</p>
            <p className="admin-note-small">
              Published places appear on the read-only map panel at <code className="rounded bg-zinc-100 px-1 text-xs">/places</code>.
            </p>
            <Link className="admin-nav-link" href="/places" target="_blank" rel="noreferrer">
              Open public place map
            </Link>
          </Card>

          <Card className="space-y-3 text-sm">
            <p className="admin-subheading">Refill links</p>
            <p className="admin-note-small">
              Runs the Place→Bird suggestion engine for every <code className="rounded bg-zinc-100 px-1 text-xs">status=published</code>{" "}
              place, but only inserts links that match already-published Birds (no pending names). Inserted rows stay{" "}
              <code className="rounded bg-zinc-100 px-1 text-xs">review_status=suggested</code> unless you opt into auto-approve.
            </p>
            <PlaceBirdRefillBatchTool
              places={places.map((place) => ({ id: place.id, name: place.name, place_status: place.status }))}
            />
          </Card>
        </div>
      </div>

      <div className="space-y-4">
        {filteredPlaces.length === 0 ? (
          <Card className="admin-stat-card admin-stat-card--note">
            No places match the current filters.
          </Card>
        ) : (
          filteredPlaces.map((place) => (
            <Link key={place.id} href={`/admin/places/${place.id}`} className="admin-list-link">
              <div className="admin-list-details">
                <p className="admin-list-title">{place.name}</p>
                <p className="admin-list-meta">
                  {place.slug}
                  {place.county ? ` · ${place.county}` : ""}
                  {place.nearest_city ? ` · ${place.nearest_city}` : ""}
                </p>
                <p className="admin-list-date">
                  Updated{" "}
                  {new Intl.DateTimeFormat(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(place.updated_at))}
                </p>
              </div>
              <div className="admin-inline-actions">
                <StatusPill status={place.status} />
                <span className="admin-list-action">Open editor</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
