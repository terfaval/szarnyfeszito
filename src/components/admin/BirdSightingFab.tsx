"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Bird, BirdColorTag, BirdSizeCategory, BirdVisibilityCategory } from "@/types/bird";
import styles from "./BirdSightingFab.module.css";

const COLOR_OPTIONS: Array<{ tag: BirdColorTag; label: string }> = [
  { tag: "white", label: "Fehér" },
  { tag: "black", label: "Fekete" },
  { tag: "grey", label: "Szürke" },
  { tag: "brown", label: "Barna" },
  { tag: "yellow", label: "Sárga" },
  { tag: "orange", label: "Narancs" },
  { tag: "red", label: "Piros" },
  { tag: "green", label: "Zöld" },
  { tag: "blue", label: "Kék" },
];

const SIZE_OPTIONS: Array<{ value: BirdSizeCategory; label: string }> = [
  { value: "very_small", label: "Nagyon kicsi" },
  { value: "small", label: "Kicsi" },
  { value: "medium", label: "Közepes" },
  { value: "large", label: "Nagy" },
];

const VISIBILITY_OPTIONS: Array<{ value: BirdVisibilityCategory; label: string }> = [
  { value: "common_hu", label: "Gyakori (HU)" },
  { value: "localized_hu", label: "Helyi (HU)" },
  { value: "seasonal_hu", label: "Szezonális (HU)" },
  { value: "rare_hu", label: "Ritka (HU)" },
  { value: "not_in_hu", label: "Nem HU" },
];

function toggleInList<T extends string>(list: T[], value: T) {
  const next = new Set(list);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return Array.from(next);
}

export default function BirdSightingFab() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sizeCategory, setSizeCategory] = useState<BirdSizeCategory | "">("");
  const [visibilityCategory, setVisibilityCategory] = useState<BirdVisibilityCategory | "">("");
  const [colorTags, setColorTags] = useState<BirdColorTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [birds, setBirds] = useState<Bird[]>([]);
  const [selectedBirdIds, setSelectedBirdIds] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const selectedSet = useMemo(() => new Set(selectedBirdIds), [selectedBirdIds]);

  useEffect(() => {
    if (!open) return;

    const timeout = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const params = new URLSearchParams();
      params.set("status", "published");
      if (search.trim()) params.set("search", search.trim());
      if (sizeCategory) params.set("size_category", sizeCategory);
      if (visibilityCategory) params.set("visibility_category", visibilityCategory);
      colorTags.forEach((tag) => params.append("color", tag));

      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/birds?${params.toString()}`, { signal: controller.signal });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          setError(payload?.error ?? "Nem sikerült betölteni a madárlistát.");
          setBirds([]);
          return;
        }
        setBirds((payload?.data ?? []) as Bird[]);
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
          setError("Nem sikerült betölteni a madárlistát.");
          setBirds([]);
        }
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [open, search, sizeCategory, visibilityCategory, colorTags]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const selectedBirds = useMemo(() => {
    if (selectedBirdIds.length === 0) return [];
    const byId = new Map(birds.map((b) => [b.id, b] as const));
    return selectedBirdIds.map((id) => byId.get(id)).filter(Boolean) as Bird[];
  }, [birds, selectedBirdIds]);

  const canSave = selectedBirdIds.length > 0 && !saving;

  const onSave = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/bird-sightings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birdIds: selectedBirdIds }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(payload?.error ?? "Nem sikerült rögzíteni.");
        return;
      }

      setMessage("Rögzítve.");
      setSelectedBirdIds([]);
      setSearch("");
      setOpen(false);
      router.refresh();
    } catch {
      setError("Nem sikerült rögzíteni.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.fab} aria-live="polite">
      {open ? <div className={styles.overlay} onClick={() => setOpen(false)} /> : null}

      {open ? (
        <div className={styles.panel} role="dialog" aria-label="Birdwatch rögzítés">
          <div className={styles.panelHeader}>
            <div>
              <p className="admin-heading__label admin-text-accent">Birdwatch</p>
              <h2 className="admin-heading__title admin-heading__title--large">Madár rögzítés</h2>
              <p className="admin-heading__description">
                Válassz madarat (keresés + szűrők), majd rögzítsd hogy láttad.
              </p>
            </div>
            <button type="button" className={styles.closeButton} onClick={() => setOpen(false)}>
              Bezár
            </button>
          </div>

          <div className="stack" style={{ gap: "0.75rem", marginTop: "0.75rem" }}>
            <label className="form-field">
              <span className="form-field__label">Keresés</span>
              <div className="form-field__row">
                <input
                  className="input"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="pl. széncinege"
                />
              </div>
            </label>

            <div className={styles.filtersRow}>
              <label className="form-field" style={{ minWidth: 160 }}>
                <span className="form-field__label">Méret</span>
                <div className="form-field__row">
                  <select
                    className="input"
                    value={sizeCategory}
                    onChange={(e) => setSizeCategory(e.target.value as BirdSizeCategory | "")}
                  >
                    <option value="">Bármilyen</option>
                    {SIZE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </label>

              <label className="form-field" style={{ minWidth: 180 }}>
                <span className="form-field__label">Észlelhetőség</span>
                <div className="form-field__row">
                  <select
                    className="input"
                    value={visibilityCategory}
                    onChange={(e) => setVisibilityCategory(e.target.value as BirdVisibilityCategory | "")}
                  >
                    <option value="">Bármilyen</option>
                    {VISIBILITY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
            </div>

            <div>
              <p className="form-field__label">Színek</p>
              <div className={styles.colorPills}>
                {COLOR_OPTIONS.map((opt) => {
                  const active = colorTags.includes(opt.tag);
                  return (
                    <label key={opt.tag} className={styles.colorPill}>
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => setColorTags((prev) => toggleInList(prev, opt.tag))}
                      />
                      {opt.label}
                    </label>
                  );
                })}
              </div>
            </div>

            {selectedBirds.length > 0 ? (
              <div>
                <p className="admin-subheading">Kijelölve</p>
                <p className="admin-note-small" style={{ marginTop: "0.5rem" }}>
                  {selectedBirds.map((b) => b.name_hu).join(", ")}
                </p>
              </div>
            ) : null}
          </div>

          <div className={styles.results}>
            <p className="admin-subheading">Találatok</p>
            {loading ? <p className="admin-stat-note mt-2">Betöltés…</p> : null}
            {error ? <p className="admin-message admin-message--error mt-2">{error}</p> : null}
            {message ? <p className="admin-message admin-message--success mt-2">{message}</p> : null}

            <div style={{ marginTop: "0.5rem" }}>
              {!loading && birds.length === 0 ? (
                <p className="admin-stat-note">Nincs találat.</p>
              ) : null}

              {birds.slice(0, 30).map((bird) => (
                <div key={bird.id} className={styles.birdRow}>
                  <input
                    type="checkbox"
                    checked={selectedSet.has(bird.id)}
                    onChange={() =>
                      setSelectedBirdIds((prev) =>
                        prev.includes(bird.id)
                          ? prev.filter((id) => id !== bird.id)
                          : [...prev, bird.id]
                      )
                    }
                  />
                  <div className={styles.birdNames}>
                    <div style={{ fontWeight: 600 }}>{bird.name_hu}</div>
                    {bird.name_latin ? <div className="admin-text-muted">{bird.name_latin}</div> : null}
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.actionsRow}>
              <p className="admin-note-small">{selectedBirdIds.length} kijelölve</p>
              <button type="button" className={styles.saveButton} disabled={!canSave} onClick={onSave}>
                {saving ? "Mentés…" : "Rögzítés"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        className={styles.fabButton}
        aria-label="Birdwatch rögzítés megnyitása"
        onClick={() => setOpen((prev) => !prev)}
      >
        <Image
          src="/icon_birdwatch.svg"
          alt=""
          width={28}
          height={28}
          className={styles.fabIcon}
          priority={false}
        />
      </button>
    </div>
  );
}
