"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/ui/components/Card";
import { Button } from "@/ui/components/Button";
import type {
  Bird,
  BirdSizeCategory,
  BirdVisibilityCategory,
} from "@/types/bird";
import type { BirdClassificationRecord } from "@/lib/birdClassificationService";

const SIZE_OPTIONS: Array<{ label: string; value: BirdSizeCategory }> = [
  { label: "Nagyon kicsi (< 12 cm)", value: "very_small" },
  { label: "Kicsi (12–20 cm)", value: "small" },
  { label: "Közepes (20–40 cm)", value: "medium" },
  { label: "Nagy (> 40 cm)", value: "large" },
];

const VISIBILITY_OPTIONS: Array<{ label: string; value: BirdVisibilityCategory }> =
  [
    { label: "Gyakran látható", value: "frequent" },
    { label: "Időszakosan látható", value: "seasonal" },
    { label: "Ritkán látható", value: "rare" },
  ];

type BirdClassificationQueueProps = {
  birds: Bird[];
  classifications: BirdClassificationRecord[];
};

type DraftState = {
  size_category: BirdSizeCategory | null;
  visibility_category: BirdVisibilityCategory | null;
};

function toMap(classifications: BirdClassificationRecord[]) {
  return classifications.reduce<Record<string, BirdClassificationRecord>>(
    (acc, entry) => {
      acc[entry.bird_id] = entry;
      return acc;
    },
    {}
  );
}

function normalizeNullable<T extends string>(value: string): T | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed as T;
}

export default function BirdClassificationQueue({
  birds,
  classifications,
}: BirdClassificationQueueProps) {
  const router = useRouter();
  const byBirdId = useMemo(() => toMap(classifications), [classifications]);

  const initialDrafts = useMemo(() => {
    return birds.reduce<Record<string, DraftState>>((acc, bird) => {
      const existing = byBirdId[bird.id]?.payload;
      const suggestedSize = existing?.suggested?.size_category ?? null;
      const suggestedVisibility = existing?.suggested?.visibility_category ?? null;

      acc[bird.id] = {
        size_category: bird.size_category ?? suggestedSize,
        visibility_category: bird.visibility_category ?? suggestedVisibility,
      };
      return acc;
    }, {});
  }, [birds, byBirdId]);

  const [drafts, setDrafts] = useState<Record<string, DraftState>>(initialDrafts);
  const [busyBird, setBusyBird] = useState<string | null>(null);
  const [errorByBird, setErrorByBird] = useState<Record<string, string | null>>({});
  const [messageByBird, setMessageByBird] = useState<Record<string, string | null>>({});

  const updateDraft = (birdId: string, next: Partial<DraftState>) => {
    setDrafts((previous) => ({
      ...previous,
      [birdId]: { ...previous[birdId], ...next },
    }));
  };

  const generateSuggestion = async (birdId: string) => {
    setBusyBird(birdId);
    setErrorByBird((prev) => ({ ...prev, [birdId]: null }));
    setMessageByBird((prev) => ({ ...prev, [birdId]: "AI javaslat készül…" }));

    try {
      const response = await fetch(`/api/birds/${birdId}/classification/generate`, {
        method: "POST",
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setErrorByBird((prev) => ({
          ...prev,
          [birdId]: payload?.error ?? "Nem sikerült AI javaslatot generálni.",
        }));
        setMessageByBird((prev) => ({ ...prev, [birdId]: null }));
        return;
      }

      setMessageByBird((prev) => ({ ...prev, [birdId]: "AI javaslat elmentve." }));
      router.refresh();
    } catch {
      setErrorByBird((prev) => ({
        ...prev,
        [birdId]: "Nem sikerült AI javaslatot generálni.",
      }));
      setMessageByBird((prev) => ({ ...prev, [birdId]: null }));
    } finally {
      setBusyBird(null);
    }
  };

  const approve = async (birdId: string) => {
    setBusyBird(birdId);
    setErrorByBird((prev) => ({ ...prev, [birdId]: null }));
    setMessageByBird((prev) => ({ ...prev, [birdId]: "Mentés…" }));

    try {
      const draft = drafts[birdId];
      const response = await fetch(`/api/birds/${birdId}/classification/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          size_category: draft?.size_category ?? null,
          visibility_category: draft?.visibility_category ?? null,
          approved_source: byBirdId[birdId] ? "ai_suggestion" : "manual",
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setErrorByBird((prev) => ({
          ...prev,
          [birdId]: payload?.error ?? "Nem sikerült menteni.",
        }));
        setMessageByBird((prev) => ({ ...prev, [birdId]: null }));
        return;
      }

      setMessageByBird((prev) => ({ ...prev, [birdId]: "Mentve." }));
      router.refresh();
    } catch {
      setErrorByBird((prev) => ({ ...prev, [birdId]: "Nem sikerült menteni." }));
      setMessageByBird((prev) => ({ ...prev, [birdId]: null }));
    } finally {
      setBusyBird(null);
    }
  };

  return (
    <section className="space-y-4">
      {birds.map((bird) => {
        const classification = byBirdId[bird.id];
        const suggestion = classification?.payload?.suggested;
        const draft = drafts[bird.id];
        const busy = busyBird === bird.id;
        const error = errorByBird[bird.id];
        const message = messageByBird[bird.id];

        return (
          <Card key={bird.id} className="space-y-4">
            <div className="flex flex-col gap-1">
              <p className="admin-list-title">{bird.name_hu}</p>
              <p className="admin-list-meta">{bird.slug}</p>
              <p className="text-xs admin-text-muted">
                {bird.name_latin ?? "No Latin name yet"}
              </p>
            </div>

            {suggestion && (
              <div className="admin-message">
                <p className="admin-subheading">AI suggestion ({suggestion.confidence})</p>
                <p className="mt-1">{suggestion.rationale}</p>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <label className="form-field">
                <span className="form-field__label">Méret kategória</span>
                <div className="form-field__row">
                <select
                  className="input"
                  value={draft?.size_category ?? ""}
                  onChange={(event) =>
                    updateDraft(bird.id, {
                      size_category: normalizeNullable<BirdSizeCategory>(
                        event.target.value
                      ),
                    })
                  }
                  disabled={busy}
                >
                  <option value="">(nincs beállítva)</option>
                  {SIZE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                </div>
              </label>

              <label className="form-field">
                <span className="form-field__label">Láthatóság kategória</span>
                <div className="form-field__row">
                <select
                  className="input"
                  value={draft?.visibility_category ?? ""}
                  onChange={(event) =>
                    updateDraft(bird.id, {
                      visibility_category: normalizeNullable<BirdVisibilityCategory>(
                        event.target.value
                      ),
                    })
                  }
                  disabled={busy}
                >
                  <option value="">(nincs beállítva)</option>
                  {VISIBILITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                </div>
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() => generateSuggestion(bird.id)}
              >
                {busy ? "Dolgozom…" : "AI javaslat"}
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={busy}
                onClick={() => approve(bird.id)}
              >
                {busy ? "Mentés…" : "Jóváhagyás + mentés"}
              </Button>
            </div>

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
          </Card>
        );
      })}
    </section>
  );
}
