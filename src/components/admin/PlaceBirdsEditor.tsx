"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/ui/components/Button";
import { Card } from "@/ui/components/Card";
import { Input } from "@/ui/components/Input";
import { PLACE_FREQUENCY_BANDS, type PlaceBirdLink } from "@/types/place";

type PlaceBirdsEditorProps = {
  placeId: string;
};

type PlaceBirdLinkRow = PlaceBirdLink & {
  bird?: { id: string; slug: string; name_hu: string } | null;
};

export default function PlaceBirdsEditor({ placeId }: PlaceBirdsEditorProps) {
  const router = useRouter();
  const [links, setLinks] = useState<PlaceBirdLinkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  type CreateValues = {
    pending_bird_name_hu: string;
    bird_id: string;
    rank: string;
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

  const [createValues, setCreateValues] = useState<CreateValues>({
    pending_bird_name_hu: "",
    bird_id: "",
    rank: "0",
    frequency_band: "regular",
    is_iconic: false,
    visible_in_spring: false,
    visible_in_summer: false,
    visible_in_autumn: false,
    visible_in_winter: false,
    seasonality_note: "",
  });

  const [latinForPending, setLatinForPending] = useState<Record<string, string>>({});

  const refresh = async () => {
    setLoading(true);
    setError(null);
    const response = await fetch(`/api/places/${placeId}/birds`, { method: "GET" });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error ?? "Unable to load place birds.");
      setLoading(false);
      return;
    }
    setLinks((payload?.data?.links ?? []) as PlaceBirdLinkRow[]);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeId]);

  const canCreate = useMemo(() => {
    const hasPending = Boolean(createValues.pending_bird_name_hu.trim());
    const hasBirdId = Boolean(createValues.bird_id.trim());
    return (hasPending || hasBirdId) && !(hasPending && hasBirdId);
  }, [createValues]);

  const createLink = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const payload = {
      pending_bird_name_hu: createValues.pending_bird_name_hu.trim() || null,
      bird_id: createValues.bird_id.trim() || null,
      rank: Number(createValues.rank || 0),
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

  const deleteLink = async (id: string) => {
    setError(null);
    const response = await fetch(`/api/places/${placeId}/birds?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setError(body?.error ?? "Unable to delete link.");
      return;
    }
    await refresh();
  };

  const updateLink = async (link: PlaceBirdLinkRow, patch: Partial<PlaceBirdLinkRow>) => {
    setError(null);
    const response = await fetch(`/api/places/${placeId}/birds`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: link.id, ...patch }),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setError(body?.error ?? "Unable to update link.");
      return;
    }
    await refresh();
  };

  const createBirdAndLink = async (link: PlaceBirdLinkRow) => {
    const pending = link.pending_bird_name_hu?.trim() ?? "";
    const latin = (latinForPending[link.id] ?? "").trim();

    if (!pending || !latin) {
      setError("Both pending Hungarian name and Latin name are required to create a bird.");
      return;
    }

    setError(null);

    const response = await fetch("/api/birds/quick-create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name_latin: latin, name_hu: pending }),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setError(body?.error ?? "Unable to create bird from pending entry.");
      return;
    }

    const birdId = body?.data?.bird?.id;
    if (!birdId) {
      setError("Bird created but id missing from response.");
      return;
    }

    await updateLink(link, { bird_id: birdId, pending_bird_name_hu: null });
    router.refresh();
  };

  return (
    <section className="place-birds space-y-6">
      <header className="admin-heading">
        <p className="admin-heading__label">Place birds</p>
        <h2 className="admin-heading__title admin-heading__title--large">Bird links</h2>
        <p className="admin-heading__description">
          Link existing birds via <code className="rounded bg-zinc-100 px-1 text-xs">bird_id</code>, or stage a pending Hungarian name for later.
        </p>
      </header>

      <Card className="place-birds stack">
        <p className="admin-subheading">Add link</p>
        <form className="space-y-4" onSubmit={createLink}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Pending bird name (HU)"
              value={createValues.pending_bird_name_hu}
              onChange={(event) => setCreateValues((p) => ({ ...p, pending_bird_name_hu: event.target.value }))}
              placeholder="Darvak"
              helperText="Use this when Bird record does not exist yet."
            />
            <Input
              label="Existing bird_id (uuid)"
              value={createValues.bird_id}
              onChange={(event) => setCreateValues((p) => ({ ...p, bird_id: event.target.value }))}
              placeholder="uuid…"
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
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={createValues.is_iconic}
                onChange={(event) => setCreateValues((p) => ({ ...p, is_iconic: event.target.checked }))}
              />
              Iconic at this place
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
                  onChange={(event) =>
                    setCreateValues((p) => ({ ...p, [key as SeasonKey]: event.target.checked }))
                  }
                />
                {label}
              </label>
            ))}
          </div>

          <Input
            label="Seasonality note"
            value={createValues.seasonality_note}
            onChange={(event) => setCreateValues((p) => ({ ...p, seasonality_note: event.target.value }))}
            placeholder="Mostly in late autumn…"
          />

          <Button type="submit" variant="accent" disabled={!canCreate}>
            Add bird link
          </Button>
        </form>
      </Card>

      <Card className="place-birds stack">
        <p className="admin-subheading">Current links</p>
        {loading ? (
          <p className="admin-note-small">Loading…</p>
        ) : links.length === 0 ? (
          <p className="admin-note-small">No birds linked yet.</p>
        ) : (
          <div className="space-y-3">
            {links.map((link) => (
              <div key={link.id} className="admin-list-link">
                <div className="admin-list-details">
                  <p className="admin-list-title">
                    {link.bird?.name_hu ?? link.pending_bird_name_hu ?? "(unnamed)"}
                  </p>
                  <p className="admin-list-meta">
                    {link.bird ? `bird: ${link.bird.slug}` : "pending"} · {link.frequency_band} · rank {link.rank}
                  </p>
                  {link.seasonality_note ? (
                    <p className="admin-list-date">{link.seasonality_note}</p>
                  ) : null}
                </div>

                <div className="admin-inline-actions">
                  {!link.bird_id && link.pending_bird_name_hu ? (
                    <div className="flex flex-col items-end gap-2">
                      <Input
                        label="Latin name"
                        value={latinForPending[link.id] ?? ""}
                        onChange={(event) =>
                          setLatinForPending((p) => ({ ...p, [link.id]: event.target.value }))
                        }
                        placeholder="Grus grus"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => createBirdAndLink(link)}
                      >
                        Create bird + link
                      </Button>
                    </div>
                  ) : null}

                  <Button type="button" variant="ghost" onClick={() => deleteLink(link.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {error && (
        <p className="admin-message admin-message--error" aria-live="assertive">
          {error}
        </p>
      )}
    </section>
  );
}
