"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/ui/components/Button";
import { Card } from "@/ui/components/Card";
import { ReviewStatusPill } from "@/ui/components/ReviewStatusPill";
import {
  PLACE_NOTABLE_UNIT_TYPE_VALUES,
  type Place,
  type PlaceNotableUnit,
  type PlaceNotableUnitType,
} from "@/types/place";
import type { PlaceContentBlockRecord } from "@/lib/placeContentService";
import type { ReviewStatus } from "@/types/content";
import { normalizePlaceNotableUnits } from "@/lib/placeNotableUnits";

type PlaceNotableUnitsEditorProps = {
  place: Place;
  latest: PlaceContentBlockRecord | null;
  latestApproved: PlaceContentBlockRecord | null;
};

type EditableUnit = PlaceNotableUnit & { client_id: string };

function newClientId() {
  try {
    return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  } catch {
    return `${Date.now()}-${Math.random()}`;
  }
}

function withClientIds(units: PlaceNotableUnit[]): EditableUnit[] {
  return units.map((unit) => ({ ...unit, client_id: newClientId() }));
}

function normalizeForClient(units: EditableUnit[]): EditableUnit[] {
  const payload = units.map((unit) => ({
    name: unit.name,
    unit_type: unit.unit_type,
    distance_text: unit.distance_text,
    short_note: unit.short_note,
    order_index: unit.order_index,
  }));
  return withClientIds(normalizePlaceNotableUnits(payload));
}

function isMeaningfullyEdited(unit: EditableUnit): boolean {
  return Boolean(
    unit.name.trim() ||
      unit.unit_type ||
      (unit.distance_text ?? "").trim() ||
      unit.short_note.trim()
  );
}

function unitTypeLabel(value: PlaceNotableUnitType) {
  return value.replaceAll("_", " ");
}

function legacyUnitsFromBlock(block: PlaceContentBlockRecord | null): unknown[] | null {
  const rawBlocks = block?.blocks_json as unknown;
  if (!rawBlocks || typeof rawBlocks !== "object") return null;
  const variants = (rawBlocks as Record<string, unknown>).variants;
  if (!variants || typeof variants !== "object") return null;
  const notableUnits = (variants as Record<string, unknown>).notable_units;
  return Array.isArray(notableUnits) ? notableUnits : null;
}

export default function PlaceNotableUnitsEditor({
  place,
  latest,
  latestApproved,
}: PlaceNotableUnitsEditorProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const legacyNotableUnits = useMemo(() => {
    return legacyUnitsFromBlock(latest);
  }, [latest]);

  const [reviewNote, setReviewNote] = useState("");
  const [showDebugJson, setShowDebugJson] = useState(false);

  const [units, setUnits] = useState<EditableUnit[]>(() =>
    withClientIds(normalizePlaceNotableUnits(place.notable_units_json ?? []))
  );

  const latestStatus = (latest?.review_status ?? "draft") as ReviewStatus;
  const latestApprovedAt = latestApproved?.created_at ?? null;

  const saveUnits = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    const drafted = units
      .map((unit) => ({
        name: unit.name,
        unit_type: unit.unit_type,
        distance_text: unit.distance_text,
        short_note: unit.short_note,
        order_index: unit.order_index,
      }))
      .map((row) => ({
        ...row,
        name: row.name.trim(),
        distance_text: row.distance_text ? row.distance_text.trim() : null,
        short_note: row.short_note.trim(),
      }));

    for (const row of drafted) {
      const meaningful = Boolean(row.name || row.unit_type || row.distance_text || row.short_note);
      if (!meaningful) continue;

      if (!row.name) {
        setError("Each unit needs a name (or remove the row).");
        setSaving(false);
        return;
      }
      if (!row.short_note) {
        setError("Each unit needs a short note (or remove the row).");
        setSaving(false);
        return;
      }
      if (typeof row.order_index !== "number" || !Number.isFinite(row.order_index) || row.order_index < 1) {
        setError("order_index must be an integer starting at 1.");
        setSaving(false);
        return;
      }
    }

    const payloadUnits = normalizePlaceNotableUnits(drafted);

    const response = await fetch(`/api/places/${place.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notable_units_json: payloadUnits }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error ?? "Unable to save notable units.");
      setSaving(false);
      return;
    }

    setUnits((prev) => normalizeForClient(prev));
    setMessage("Saved notable units. Refreshing…");
    router.refresh();
    setSaving(false);
  };

  const regenerate = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);

    const response = await fetch(`/api/places/${place.id}/notable-units/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ review_note: reviewNote.trim() || null }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error ?? "Unable to regenerate notable units.");
      setSaving(false);
      return;
    }

    const nextUnits = normalizePlaceNotableUnits(payload?.data?.place?.notable_units_json ?? []);
    setUnits(withClientIds(nextUnits));
    setMessage("Regenerated notable units. Refreshing…");
    router.refresh();
    setSaving(false);
  };

  const addRow = () => {
    setUnits((prev) => [
      ...prev,
      {
        client_id: newClientId(),
        name: "",
        unit_type: null,
        distance_text: null,
        short_note: "",
        order_index: prev.length + 1,
      },
    ]);
  };

  const moveRow = (clientId: string, direction: -1 | 1) => {
    setUnits((prev) => {
      const index = prev.findIndex((row) => row.client_id === clientId);
      if (index < 0) return prev;
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(nextIndex, 0, item);
      return copy.map((row, idx) => ({ ...row, order_index: idx + 1 }));
    });
  };

  const removeRow = (clientId: string) => {
    setUnits((prev) =>
      prev.filter((row) => row.client_id !== clientId).map((row, idx) => ({ ...row, order_index: idx + 1 }))
    );
  };

  const debugJson = useMemo(() => {
    const payload = units.map((unit) => ({
      name: unit.name,
      unit_type: unit.unit_type,
      distance_text: unit.distance_text,
      short_note: unit.short_note,
      order_index: unit.order_index,
    }));
    try {
      return JSON.stringify(payload, null, 2);
    } catch {
      return "";
    }
  }, [units]);

  return (
    <section id="place-editor-notable-units" className="place-editor-notable-units space-y-5">
      <header className="admin-heading">
        <h2 className="admin-heading__title admin-heading__title--large">Notable units</h2>
        <p className="admin-heading__description">
          Structured list of internal sub-locations for the Place panel. Stored as{" "}
          <code className="rounded bg-zinc-100 px-1 text-xs">places.notable_units_json</code>.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <ReviewStatusPill status={latestStatus} />
          {latestApprovedAt ? (
            <span className="text-sm text-zinc-500">Latest approved at: {String(latestApprovedAt)}</span>
          ) : (
            <span className="text-sm text-zinc-500">No approved content yet.</span>
          )}
        </div>
        {legacyNotableUnits && legacyNotableUnits.length ? (
          <p className="admin-note-small">
            Note: this Place has legacy <code className="rounded bg-zinc-100 px-1 text-xs">variants.notable_units</code>{" "}
            data in content blocks. Canonical source is{" "}
            <code className="rounded bg-zinc-100 px-1 text-xs">places.notable_units_json</code>.
          </p>
        ) : null}
      </header>

      <Card className="place-content stack">
        <form className="space-y-4" onSubmit={saveUnits}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="admin-subheading">Units</p>
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="ghost" onClick={addRow} disabled={saving}>
                Add unit
              </Button>
              <Button type="button" variant="ghost" onClick={() => setUnits((p) => normalizeForClient(p))} disabled={saving}>
                Normalize
              </Button>
              <Button type="submit" variant="accent" disabled={saving}>
                Save notable units
              </Button>
            </div>
          </div>

          {units.length ? (
            <div className="space-y-4">
              {units.map((unit) => (
                <Card key={unit.client_id} className="place-editor-notable-units-row space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-zinc-900">
                      #{unit.order_index} {unit.name.trim() ? unit.name.trim() : "New unit"}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="ghost" onClick={() => moveRow(unit.client_id, -1)} disabled={saving}>
                        Up
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => moveRow(unit.client_id, 1)} disabled={saving}>
                        Down
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => removeRow(unit.client_id)} disabled={saving}>
                        Remove
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="form-field">
                      <span className="form-field__label">name</span>
                      <div className="form-field__row">
                        <input
                          className="input"
                          value={unit.name}
                          onChange={(event) =>
                            setUnits((prev) =>
                              prev.map((row) =>
                                row.client_id === unit.client_id ? { ...row, name: event.target.value } : row
                              )
                            )
                          }
                          placeholder="Nyirkai-Hany"
                        />
                      </div>
                    </label>

                    <label className="form-field">
                      <span className="form-field__label">unit_type</span>
                      <div className="form-field__row">
                        <select
                          className="input"
                          value={unit.unit_type ?? ""}
                          onChange={(event) =>
                            setUnits((prev) =>
                              prev.map((row) =>
                                row.client_id === unit.client_id
                                  ? {
                                      ...row,
                                      unit_type: event.target.value
                                        ? (event.target.value as PlaceNotableUnitType)
                                        : null,
                                    }
                                  : row
                              )
                            )
                          }
                        >
                          <option value="">(none)</option>
                          {PLACE_NOTABLE_UNIT_TYPE_VALUES.map((value) => (
                            <option key={value} value={value}>
                              {unitTypeLabel(value)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </label>

                    <label className="form-field">
                      <span className="form-field__label">distance_text</span>
                      <div className="form-field__row">
                        <input
                          className="input"
                          value={unit.distance_text ?? ""}
                          onChange={(event) =>
                            setUnits((prev) =>
                              prev.map((row) =>
                                row.client_id === unit.client_id ? { ...row, distance_text: event.target.value || null } : row
                              )
                            )
                          }
                          placeholder="kb. 5 km-re"
                        />
                      </div>
                    </label>

                    <label className="form-field">
                      <span className="form-field__label">order_index</span>
                      <div className="form-field__row">
                        <input
                          className="input"
                          type="number"
                          min={1}
                          value={unit.order_index}
                          onChange={(event) =>
                            setUnits((prev) =>
                              prev.map((row) =>
                                row.client_id === unit.client_id ? { ...row, order_index: Number(event.target.value) || 1 } : row
                              )
                            )
                          }
                        />
                      </div>
                    </label>
                  </div>

                  <label className="form-field">
                    <span className="form-field__label">short_note</span>
                    <div className="form-field__row">
                      <textarea
                        className="input min-h-[90px]"
                        value={unit.short_note}
                        onChange={(event) =>
                          setUnits((prev) =>
                            prev.map((row) =>
                              row.client_id === unit.client_id ? { ...row, short_note: event.target.value } : row
                            )
                          )
                        }
                        placeholder="1–2 sentences about why this sub-location is interesting."
                      />
                    </div>
                  </label>

                  {isMeaningfullyEdited(unit) && (!unit.name.trim() || !unit.short_note.trim()) ? (
                    <p className="admin-note-small text-red-600">Name + short note are required.</p>
                  ) : null}
                </Card>
              ))}
            </div>
          ) : (
            <p className="admin-note-small">No notable units yet. Add one or regenerate.</p>
          )}
        </form>
      </Card>

      <Card className="place-content stack">
        <p className="admin-subheading">Regenerate notable units</p>
        <p className="admin-note-small">
          Only updates <code className="rounded bg-zinc-100 px-1 text-xs">places.notable_units_json</code>. Does not regenerate the main place text.
        </p>
        <textarea
          className="input min-h-[90px] w-full"
          value={reviewNote}
          onChange={(event) => setReviewNote(event.target.value)}
          placeholder='Optional review note, e.g. "Adj több konkrét alegységet a halastórendszerhez"'
        />
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="ghost" onClick={regenerate} disabled={saving}>
            Regenerate notable units
          </Button>
        </div>
      </Card>

      <Card className="place-content stack">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="admin-subheading">Debug JSON</p>
          <Button type="button" variant="ghost" onClick={() => setShowDebugJson((p) => !p)} disabled={saving}>
            {showDebugJson ? "Hide" : "Show"}
          </Button>
        </div>
        {showDebugJson ? (
          <textarea className="input min-h-[160px] font-mono text-xs" readOnly value={debugJson} />
        ) : null}
      </Card>

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
    </section>
  );
}
