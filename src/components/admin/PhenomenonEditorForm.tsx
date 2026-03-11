"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/ui/components/Button";
import { Card } from "@/ui/components/Card";
import { Input } from "@/ui/components/Input";
import type { Phenomenon, PhenomenonSeason } from "@/types/phenomenon";
import { PHENOMENON_SEASON_VALUES } from "@/types/phenomenon";

type SpaRegionOption = { region_id: string; name: string };

type PhenomenonEditorFormProps = {
  phenomenon: Phenomenon;
  spaRegions: SpaRegionOption[];
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export default function PhenomenonEditorForm({ phenomenon, spaRegions }: PhenomenonEditorFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [title, setTitle] = useState(phenomenon.title ?? "");
  const [slug, setSlug] = useState(phenomenon.slug ?? "");
  const [season, setSeason] = useState<PhenomenonSeason>(phenomenon.season);
  const [regionId, setRegionId] = useState(phenomenon.region_id ?? "");
  const [startMmdd, setStartMmdd] = useState(phenomenon.typical_start_mmdd ?? "");
  const [endMmdd, setEndMmdd] = useState(phenomenon.typical_end_mmdd ?? "");
  const [generationInput, setGenerationInput] = useState(phenomenon.generation_input ?? "");

  const selectedRegionName = useMemo(() => {
    const found = spaRegions.find((r) => r.region_id === regionId);
    return found?.name ?? "";
  }, [regionId, spaRegions]);

  const canSave = useMemo(() => Boolean(asString(title) && asString(slug) && asString(regionId)), [title, slug, regionId]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    const response = await fetch(`/api/phenomena/${phenomenon.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        slug,
        season,
        region_id: regionId,
        typical_start_mmdd: asString(startMmdd) ? asString(startMmdd) : null,
        typical_end_mmdd: asString(endMmdd) ? asString(endMmdd) : null,
        generation_input: asString(generationInput) ? asString(generationInput) : null,
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error ?? "Unable to save phenomenon.");
      setSaving(false);
      return;
    }

    setMessage("Saved. Refreshing…");
    router.refresh();
    setSaving(false);
  };

  const generateContent = async () => {
    setGenerating(true);
    setError(null);
    setMessage(null);

    const response = await fetch(`/api/phenomena/${phenomenon.id}/content/generate`, { method: "POST" });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error ?? "Unable to generate phenomenon content.");
      setGenerating(false);
      return;
    }

    setMessage("Generated draft content. Refreshing…");
    router.refresh();
    setGenerating(false);
  };

  return (
    <section className="space-y-6">
      <header className="admin-header-row">
        <div className="admin-heading">
          <p className="admin-heading__label">Phenomenon</p>
          <h2 className="admin-heading__title admin-heading__title--large">General</h2>
          <p className="admin-heading__description">
            SPA region: <span className="font-medium">{selectedRegionName || regionId}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="ghost" onClick={generateContent} disabled={generating || saving}>
            {generating ? "Generating…" : "Generate content"}
          </Button>
          <Button type="submit" form="phenomenon-general-form" variant="primary" disabled={saving || !canSave}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </header>

      <form id="phenomenon-general-form" className="space-y-6" onSubmit={save}>
        <Card className="stack">
          <label className="form-field">
            <span className="form-field__label">title</span>
            <div className="form-field__row">
              <Input value={title} onChange={(event) => setTitle(event.target.value)} />
            </div>
          </label>

          <label className="form-field">
            <span className="form-field__label">slug</span>
            <div className="form-field__row">
              <Input value={slug} onChange={(event) => setSlug(event.target.value)} />
            </div>
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="form-field">
              <span className="form-field__label">season</span>
              <div className="form-field__row">
                <select
                  className="input"
                  value={season}
                  onChange={(event) => setSeason(event.target.value as PhenomenonSeason)}
                >
                  {PHENOMENON_SEASON_VALUES.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <label className="form-field">
              <span className="form-field__label">region_id (SPA)</span>
              <div className="form-field__row">
                <select className="input" value={regionId} onChange={(event) => setRegionId(event.target.value)}>
                  {spaRegions.map((r) => (
                    <option key={r.region_id} value={r.region_id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="form-field">
              <span className="form-field__label">typical_start_mmdd</span>
              <div className="form-field__row">
                <Input value={startMmdd} onChange={(event) => setStartMmdd(event.target.value)} placeholder="MM-DD" />
              </div>
            </label>

            <label className="form-field">
              <span className="form-field__label">typical_end_mmdd</span>
              <div className="form-field__row">
                <Input value={endMmdd} onChange={(event) => setEndMmdd(event.target.value)} placeholder="MM-DD" />
              </div>
            </label>
          </div>

          <label className="form-field">
            <span className="form-field__label">generation_input</span>
            <div className="form-field__row">
              <Input value={generationInput} onChange={(event) => setGenerationInput(event.target.value)} />
            </div>
          </label>
        </Card>
      </form>

      {message ? <p className="admin-message admin-message--success">{message}</p> : null}
      {error ? (
        <p className="admin-message admin-message--error" aria-live="assertive">
          {error}
        </p>
      ) : null}
    </section>
  );
}

