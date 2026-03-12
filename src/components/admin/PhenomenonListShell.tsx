"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/ui/components/Button";
import { Card } from "@/ui/components/Card";
import { Input } from "@/ui/components/Input";
import { StatusPill } from "@/ui/components/StatusPill";
import type { Phenomenon, PhenomenonSeason, SpaRegionOption } from "@/types/phenomenon";

type PhenomenonListShellProps = {
  phenomena: Phenomenon[];
  spaRegions: SpaRegionOption[];
};

export default function PhenomenonListShell({ phenomena, spaRegions }: PhenomenonListShellProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [ensuring, setEnsuring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [createSeason, setCreateSeason] = useState<PhenomenonSeason>("autumn");
  const [createRegionId, setCreateRegionId] = useState<string>(spaRegions[0]?.region_id ?? "");
  const [createGenerationInput, setCreateGenerationInput] = useState<string>("");
  const countryNames = useMemo(() => {
    if (typeof Intl === "undefined" || typeof Intl.DisplayNames === "undefined") {
      return null;
    }
    try {
      return new Intl.DisplayNames(["hu-HU"], { type: "region" });
    } catch {
      return null;
    }
  }, []);
  const formatCountryName = (code?: string | null) => {
    if (!code) return null;
    const normalized = code.trim().toUpperCase();
    if (!normalized) return null;
    return countryNames?.of(normalized) ?? normalized;
  };
  const displayRegions = useMemo(() => {
    return spaRegions.map((region) => {
      if (region.scope === "hungary_extended") {
        const countryLabel = formatCountryName(region.country_code);
        const countryPart = countryLabel ?? region.country_code ?? "ismeretlen";
        return { ...region, displayName: `${region.name} · ${countryPart}` };
      }
      return { ...region, displayName: region.name };
    });
  }, [spaRegions, countryNames]);

  const normalizedSearch = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!normalizedSearch) return phenomena;
    return phenomena.filter((item) => {
      const title = item.title?.toLowerCase?.() ?? "";
      const slug = item.slug?.toLowerCase?.() ?? "";
      const regionId = item.region_id?.toLowerCase?.() ?? "";
      return (
        title.includes(normalizedSearch) ||
        slug.includes(normalizedSearch) ||
        regionId.includes(normalizedSearch)
      );
    });
  }, [normalizedSearch, phenomena]);

  const ensureSpaAutumnPeaks = async () => {
    setEnsuring(true);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/phenomena/ensure-spa-peaks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limit: 500, dry_run: false }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error ?? "Unable to ensure SPA phenomena.");
      setEnsuring(false);
      return;
    }

    const createdCount = Number(payload?.data?.created_count ?? 0);
    setMessage(createdCount > 0 ? `Created ${createdCount} autumn phenomena.` : "All SPA autumn phenomena already exist.");
    router.refresh();
    setEnsuring(false);
  };

  const createPhenomenon = async (event: FormEvent) => {
    event.preventDefault();
    if (!createRegionId.trim()) return;

    setCreating(true);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/phenomena", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        region_id: createRegionId,
        season: createSeason,
        generation_input: createGenerationInput.trim() ? createGenerationInput.trim() : null,
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error ?? "Unable to create phenomenon.");
      setCreating(false);
      return;
    }

    const id = String(payload?.data?.phenomenon?.id ?? "");
    if (id) {
      router.push(`/admin/phenomena/${id}`);
      return;
    }

    setMessage("Phenomenon created. Refreshing…");
    router.refresh();
    setCreating(false);
  };

  return (
    <section className="space-y-6">
      <header className="admin-header-row">
        <div className="admin-heading">
          <p className="admin-heading__label">Phenomena registry</p>
          <h1 className="admin-heading__title">Phenomena list</h1>
          <p className="admin-heading__description">
            SPA-scoped migration peak events with review-gated text + bird links.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="ghost" onClick={ensureSpaAutumnPeaks} disabled={ensuring}>
            {ensuring ? "Ensuring…" : "Ensure SPA autumn peaks"}
          </Button>
        </div>
      </header>

      <Card className="stack">
        <p className="admin-subheading">Create</p>
        <form className="grid gap-3 md:grid-cols-3" onSubmit={createPhenomenon}>
          <label className="form-field">
            <span className="form-field__label">SPA region</span>
            <div className="form-field__row">
              <select
                className="input"
                value={createRegionId}
                onChange={(event) => setCreateRegionId(event.target.value)}
              >
                {displayRegions.map((r) => (
                  <option key={r.region_id} value={r.region_id}>
                    {r.displayName}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <label className="form-field">
            <span className="form-field__label">Season</span>
            <div className="form-field__row">
              <select
                className="input"
                value={createSeason}
                onChange={(event) => setCreateSeason(event.target.value as PhenomenonSeason)}
              >
                <option value="autumn">autumn</option>
                <option value="spring">spring</option>
              </select>
            </div>
          </label>

          <label className="form-field md:col-span-3">
            <span className="form-field__label">generation_input (optional)</span>
            <div className="form-field__row">
              <Input
                value={createGenerationInput}
                onChange={(event) => setCreateGenerationInput(event.target.value)}
                placeholder="Short editorial hint…"
              />
            </div>
          </label>

          <div className="md:col-span-3 flex items-center justify-end gap-3">
            <Button type="submit" variant="primary" disabled={creating || spaRegions.length === 0}>
              {creating ? "Creating…" : "Create phenomenon"}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="stack">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="admin-subheading">Items</p>
          <div className="w-full max-w-sm">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title / slug / region_id…"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="admin-note-small">No phenomena match the current filters.</p>
        ) : (
          <ul className="divide-y divide-zinc-200/70">
            {filtered.map((item) => (
              <li key={item.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <Link className="admin-nav-link" href={`/admin/phenomena/${item.id}`}>
                    {item.title}
                  </Link>
                  <p className="text-xs text-zinc-500">
                    <span className="font-medium">{item.season}</span> · {item.phenomenon_type} · region {item.region_id}
                    {item.typical_start_mmdd && item.typical_end_mmdd
                      ? ` · ${item.typical_start_mmdd} → ${item.typical_end_mmdd}`
                      : ""}
                  </p>
                </div>
                <StatusPill status={item.status} />
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
