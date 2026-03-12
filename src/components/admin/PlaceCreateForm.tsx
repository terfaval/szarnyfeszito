"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/ui/components/Button";
import { Card } from "@/ui/components/Card";
import { Input } from "@/ui/components/Input";

type ExtendedSpaRegionOption = {
  region_id: string;
  name: string;
  country_code?: string | null;
  distance_to_hungary_km?: number | null;
  is_within_hungary?: boolean | null;
  is_within_hungary_buffer?: boolean | null;
};

type PlaceCreateFormProps = {
  missingSpaRegions: Array<{ region_id: string; name: string }>;
  missingExtendedSpaRegions: ExtendedSpaRegionOption[];
};

type SelectedRegion =
  | ({ source: "hungary" } & { region_id: string; name: string })
  | ({ source: "extended" } & ExtendedSpaRegionOption);

const initialFormState = {
  name: "",
  leaflet_region_id: "",
};

export default function PlaceCreateForm({
  missingSpaRegions,
  missingExtendedSpaRegions,
}: PlaceCreateFormProps) {
  const router = useRouter();
  const [formValues, setFormValues] = useState(initialFormState);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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

  const selectedRegion = useMemo(() => {
    const id = formValues.leaflet_region_id.trim();
    if (!id) return null;
    const hungaryMatch = missingSpaRegions.find((r) => r.region_id === id);
    if (hungaryMatch) {
      return { source: "hungary" as const, region_id: hungaryMatch.region_id, name: hungaryMatch.name };
    }
    const extendedMatch = missingExtendedSpaRegions.find((r) => r.region_id === id);
    if (extendedMatch) {
      return { source: "extended" as const, ...extendedMatch };
    }
    return null;
  }, [formValues.leaflet_region_id, missingSpaRegions, missingExtendedSpaRegions]);

  const selectedExtendedRegion =
    selectedRegion?.source === "extended" ? (selectedRegion as SelectedRegion & { source: "extended" }) : null;

  const extendedNameSuggestion = useMemo(() => {
    if (!selectedExtendedRegion) return null;
    const countryLabel = formatCountryName(selectedExtendedRegion.country_code);
    const baseParts = countryLabel ? [`${countryLabel}`, selectedExtendedRegion.name] : [selectedExtendedRegion.name];
    return baseParts.join(" – ");
  }, [selectedExtendedRegion]);

  const isDisabled = useMemo(() => {
    return creating || !formValues.name.trim();
  }, [creating, formValues]);

  const updateLeafletSelection = (regionId: string, suggestedName?: string) => {
    setFormValues((prev) => ({
      ...prev,
      leaflet_region_id: regionId,
      name: suggestedName ? suggestedName : prev.name,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreating(true);
    setError(null);
    setMessage(null);

    const payload = {
      name: formValues.name.trim(),
      leaflet_region_id: formValues.leaflet_region_id.trim() || undefined,
    };

    const response = await fetch("/api/places/quick-create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => null);

    if (!response.ok) {
      setError(body?.error ?? "Unable to create place.");
      setCreating(false);
      return;
    }

    const placeId = body?.data?.place?.id;
    setMessage(placeId ? "Place created. Redirecting to editor..." : "Place created.");
    setFormValues(initialFormState);

    if (placeId) {
      router.push(`/admin/places/${placeId}`);
      setCreating(false);
      return;
    }

    router.refresh();
    setCreating(false);
  };

  return (
    <Card className="place-create-form space-y-4 text-sm">
      <div className="space-y-2">
        <p className="admin-subheading">Quick create (named place)</p>
        <p className="admin-note-small">
          Provide a real, named Hungarian birding destination. The system will generate a unique slug, draft metadata
          (type/region/county/city), and draft UI variants.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="form-field">
          <span className="form-field__label">Natura 2000 SPA (optional)</span>
          <div className="form-field__row">
            <select
              value={formValues.leaflet_region_id}
              onChange={(event) => {
                const nextId = event.target.value;
                const nextName = missingSpaRegions.find((r) => r.region_id === nextId)?.name ?? null;
                updateLeafletSelection(nextId, nextName ?? undefined);
              }}
              className="input"
            >
              <option value="">
                {missingSpaRegions.length > 0
                  ? `Pick from ${missingSpaRegions.length} missing SPA regions...`
                  : "All SPA regions already have a Place (or catalog unavailable)."}
              </option>
              {missingSpaRegions.map((region) => (
                <option key={region.region_id} value={region.region_id}>
                  {region.name}
                </option>
              ))}
            </select>
          </div>
          <p className="admin-note-small">
            Optional helper for SPA-first bootstrapping: shows Natura 2000 SPA regions that don&apos;t yet appear as{" "}
            <code className="rounded bg-zinc-100 px-1 text-xs">places.leaflet_region_id</code>.
          </p>
          {selectedRegion && (
            <p className="admin-note-small">
              Selected SPA will be stored on the Place as{" "}
              <code className="rounded bg-zinc-100 px-1 text-xs">leaflet_region_id</code>: {selectedRegion.name}
            </p>
          )}
        </label>

        <label className="form-field">
          <span className="form-field__label">Hungary-extended SPA (optional)</span>
          <div className="form-field__row">
            <select
              value={formValues.leaflet_region_id}
              onChange={(event) => {
                const nextId = event.target.value;
                const nextRegion = missingExtendedSpaRegions.find((r) => r.region_id === nextId);
                const countryLabel = formatCountryName(nextRegion?.country_code ?? null);
                const suggestion = nextRegion
                  ? countryLabel
                    ? `${countryLabel} – ${nextRegion.name}`
                    : nextRegion.name
                  : undefined;
                updateLeafletSelection(nextId, suggestion);
              }}
              className="input"
            >
              <option value="">
                {missingExtendedSpaRegions.length > 0
                  ? `Pick from ${missingExtendedSpaRegions.length} Hungary-extended SPA regions...`
                  : "All Hungary-extended SPA regions already have a Place (or catalog unavailable)."}
              </option>
              {missingExtendedSpaRegions.map((region) => {
                const countryLabel = formatCountryName(region.country_code);
                const label = countryLabel ? `${region.name} · ${countryLabel}` : region.name;
                return (
                  <option key={region.region_id} value={region.region_id}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>
          <p className="admin-note-small">
            Extended Natura 2000 SPA regions from neighboring countries (scope{" "}
            <code className="rounded bg-zinc-100 px-1 text-xs">hungary_extended</code>) that sit within our coverage.
          </p>
          {selectedExtendedRegion && (
            <div className="space-y-1">
              <p className="admin-note-small">Nagyrégió: {selectedExtendedRegion.name}</p>
              <p className="admin-note-small">
                Ország:{" "}
                {formatCountryName(selectedExtendedRegion.country_code) ??
                  selectedExtendedRegion.country_code ??
                  "ismeretlen"}
              </p>
              {selectedExtendedRegion.distance_to_hungary_km != null && (
                <p className="admin-note-small">
                  Távolság Magyarországtól: {selectedExtendedRegion.distance_to_hungary_km.toFixed(1)} km
                </p>
              )}
              <p className="admin-note-small">
                Magyar névjavaslat:{" "}
                <code className="rounded bg-zinc-100 px-1 text-xs">
                  {extendedNameSuggestion ?? selectedExtendedRegion.name}
                </code>
              </p>
            </div>
          )}
        </label>

        <Input
          label="Place name (required)"
          required
          value={formValues.name}
          onChange={(event) => setFormValues((p) => ({ ...p, name: event.target.value }))}
          placeholder="Tatai Öreg-tó"
        />

        <Button type="submit" disabled={isDisabled} variant="accent" className="w-full justify-center">
          {creating ? "Creating..." : "Create place from name (AI draft)"}
        </Button>

        {error && (
          <p className="admin-message admin-message--error" aria-live="assertive">
            {error}
          </p>
        )}
        {message && (
          <p className="admin-message admin-message--success" aria-live="polite">
            {message}
          </p>
        )}
      </form>
    </Card>
  );
}
