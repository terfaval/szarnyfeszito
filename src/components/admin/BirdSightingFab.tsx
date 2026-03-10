"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import BirdIcon from "@/components/admin/BirdIcon";
import { Button } from "@/ui/components/Button";
import { Card } from "@/ui/components/Card";
import { Input } from "@/ui/components/Input";
import type { Bird, BirdColorTag, BirdSizeCategory, BirdVisibilityCategory } from "@/types/bird";
import styles from "./BirdSightingFab.module.css";

type PlaceListItem = {
  id: string;
  slug: string;
  name: string;
  place_type: string;
  status: string;
  county: string | null;
  nearest_city: string | null;
};

const COLOR_OPTIONS: Array<{ tag: BirdColorTag; label: string; swatch: string }> = [
  { tag: "white", label: "Fehér", swatch: "#f8fafc" },
  { tag: "black", label: "Fekete", swatch: "#1f2937" },
  { tag: "grey", label: "Szürke", swatch: "#eef2f7" },
  { tag: "brown", label: "Barna", swatch: "#f3ede7" },
  { tag: "yellow", label: "Sárga", swatch: "#fff3cc" },
  { tag: "orange", label: "Narancs", swatch: "#ffe7d6" },
  { tag: "red", label: "Piros", swatch: "#fdecef" },
  { tag: "green", label: "Zöld", swatch: "#e8f3ea" },
  { tag: "blue", label: "Kék", swatch: "#e8f2ff" },
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
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [placeSearch, setPlaceSearch] = useState("");
  const [placesLoading, setPlacesLoading] = useState(false);
  const [places, setPlaces] = useState<PlaceListItem[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceListItem | null>(null);

  const [birdSearch, setBirdSearch] = useState("");
  const [sizeCategory, setSizeCategory] = useState<BirdSizeCategory | "">("");
  const [visibilityCategory, setVisibilityCategory] = useState<BirdVisibilityCategory | "">("");
  const [colorTags, setColorTags] = useState<BirdColorTag[]>([]);

  const [birdsLoading, setBirdsLoading] = useState(false);
  const [birds, setBirds] = useState<Bird[]>([]);
  const [selectedBirdIds, setSelectedBirdIds] = useState<string[]>([]);

  const [placeRankByBirdId, setPlaceRankByBirdId] = useState<Map<string, number>>(new Map());

  const [iconsByBirdId, setIconsByBirdId] = useState<
    Record<string, { habitatSrc: string | null; iconicSrc: string | null }>
  >({});

  const [saving, setSaving] = useState(false);

  const placesAbortRef = useRef<AbortController | null>(null);
  const birdsAbortRef = useRef<AbortController | null>(null);
  const iconsAbortRef = useRef<AbortController | null>(null);

  const selectedBirdSet = useMemo(() => new Set(selectedBirdIds), [selectedBirdIds]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (selectedPlace) return;

    const timeout = setTimeout(async () => {
      placesAbortRef.current?.abort();
      const controller = new AbortController();
      placesAbortRef.current = controller;

      const params = new URLSearchParams();
      if (placeSearch.trim()) params.set("search", placeSearch.trim());

      setPlacesLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/places?${params.toString()}`, { signal: controller.signal });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          setError(payload?.error ?? "Nem sikerült betölteni a helyszíneket.");
          setPlaces([]);
          return;
        }
        setPlaces((payload?.data ?? []) as PlaceListItem[]);
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
          setError("Nem sikerült betölteni a helyszíneket.");
          setPlaces([]);
        }
      } finally {
        setPlacesLoading(false);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [open, selectedPlace, placeSearch]);

  useEffect(() => {
    if (!open) return;
    if (!selectedPlace) return;

    const timeout = setTimeout(async () => {
      birdsAbortRef.current?.abort();
      const controller = new AbortController();
      birdsAbortRef.current = controller;

      const params = new URLSearchParams();
      params.set("status", "published");
      if (birdSearch.trim()) params.set("search", birdSearch.trim());
      if (sizeCategory) params.set("size_category", sizeCategory);
      if (visibilityCategory) params.set("visibility_category", visibilityCategory);
      colorTags.forEach((tag) => params.append("color", tag));

      setBirdsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/birds?${params.toString()}`, { signal: controller.signal });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          setError(payload?.error ?? "Nem sikerült betölteni a madarakat.");
          setBirds([]);
          return;
        }
        setBirds((payload?.data ?? []) as Bird[]);
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
          setError("Nem sikerült betölteni a madarakat.");
          setBirds([]);
        }
      } finally {
        setBirdsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timeout);
  }, [open, selectedPlace, birdSearch, sizeCategory, visibilityCategory, colorTags]);

  useEffect(() => {
    if (!open) return;
    if (!selectedPlace) return;

    const controller = new AbortController();
    const load = async () => {
      try {
        const response = await fetch(`/api/places/${selectedPlace.id}/birds`, { signal: controller.signal });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          return;
        }

        const links = (payload?.data?.links ?? []) as Array<{
          review_status: string;
          rank: number;
          bird: { id: string } | null;
        }>;

        const next = new Map<string, number>();
        links.forEach((link) => {
          if (link.review_status !== "approved") return;
          if (!link.bird?.id) return;
          next.set(link.bird.id, typeof link.rank === "number" ? link.rank : 999);
        });
        setPlaceRankByBirdId(next);
      } catch {
        // ignore
      }
    };

    load();
    return () => controller.abort();
  }, [open, selectedPlace]);

  const sortedBirds = useMemo(() => {
    const copy = [...birds];
    copy.sort((a, b) => {
      const ar = placeRankByBirdId.get(a.id);
      const br = placeRankByBirdId.get(b.id);
      const aIsPlace = typeof ar === "number";
      const bIsPlace = typeof br === "number";
      if (aIsPlace !== bIsPlace) return aIsPlace ? -1 : 1;
      if (aIsPlace && bIsPlace) return (ar ?? 999) - (br ?? 999) || a.name_hu.localeCompare(b.name_hu, "hu");
      return a.name_hu.localeCompare(b.name_hu, "hu");
    });
    return copy;
  }, [birds, placeRankByBirdId]);

  useEffect(() => {
    if (!open) return;
    if (!selectedPlace) return;

    const ids = Array.from(
      new Set([...sortedBirds.slice(0, 40).map((b) => b.id), ...selectedBirdIds])
    );
    if (ids.length === 0) return;

    iconsAbortRef.current?.abort();
    const controller = new AbortController();
    iconsAbortRef.current = controller;

    const params = new URLSearchParams();
    params.set("ids", ids.join(","));

    const load = async () => {
      try {
        const response = await fetch(`/api/bird-icons?${params.toString()}`, { signal: controller.signal });
        const payload = await response.json().catch(() => null);
        if (!response.ok) return;
        const data = (payload?.data ?? {}) as Record<string, { habitatSrc: string | null; iconicSrc: string | null }>;
        setIconsByBirdId((prev) => ({ ...prev, ...data }));
      } catch {
        // ignore
      }
    };

    load();
    return () => controller.abort();
  }, [open, selectedPlace, sortedBirds, selectedBirdIds]);

  const selectedBirdIcons = useMemo(() => {
    return selectedBirdIds.map((id) => ({
      id,
      habitatSrc: iconsByBirdId[id]?.habitatSrc ?? null,
      iconicSrc: iconsByBirdId[id]?.iconicSrc ?? null,
    }));
  }, [iconsByBirdId, selectedBirdIds]);

  const canSave = Boolean(selectedPlace) && selectedBirdIds.length > 0 && !saving;

  const onSave = async () => {
    if (!selectedPlace) return;
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/bird-sightings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId: selectedPlace.id, birdIds: selectedBirdIds }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(payload?.error ?? "Nem sikerült rögzíteni.");
        return;
      }

      setMessage("Rögzítve.");
      setSelectedBirdIds([]);
      router.refresh();
    } catch {
      setError("Nem sikerült rögzíteni.");
    } finally {
      setSaving(false);
    }
  };

  const close = () => {
    setOpen(false);
    setError(null);
    setMessage(null);
  };

  const resetPlace = () => {
    setSelectedPlace(null);
    setPlaceRankByBirdId(new Map());
    setBirds([]);
    setSelectedBirdIds([]);
    setBirdSearch("");
    setSizeCategory("");
    setVisibilityCategory("");
    setColorTags([]);
    setIconsByBirdId({});
  };

  return (
    <div className={styles.fab}>
      {open ? (
        <div className="yoga-overlay birdwatch-overlay" role="dialog" aria-modal="true">
          <button type="button" className="yoga-overlay__backdrop" onClick={close} aria-label="Bezárás" />
          <div className="yoga-overlay__panel birdwatch-overlay__panel">
            <div className="yoga-overlay__header">
              <button
                type="button"
                className="btn btn--ghost yoga-overlay__back"
                onClick={selectedPlace ? resetPlace : close}
              >
                {selectedPlace ? "Helyszín" : "Bezár"}
              </button>
              <div className="yoga-overlay__title">
                <p className="yoga-overlay__label">Birdwatch</p>
                <p className="admin-heading__title admin-heading__title--large" style={{ margin: 0 }}>
                  {selectedPlace ? selectedPlace.name : "Helyszín kiválasztása"}
                </p>
              </div>
              <div className="yoga-overlay__actions">
                <button type="button" className="btn btn--ghost yoga-overlay__close" onClick={close}>
                  Close
                </button>
              </div>
            </div>

            {!selectedPlace ? (
              <div className="stack" style={{ gap: "1rem" }}>
                <Card className="stack">
                  <header className="admin-heading">
                    <p className="admin-heading__label admin-text-accent">1) Helyszín</p>
                    <p className="admin-heading__description">Először válassz egy Place-t, aztán ajánlunk madarakat.</p>
                  </header>
                  <Input
                    label="Keresés"
                    value={placeSearch}
                    onChange={(e) => setPlaceSearch(e.target.value)}
                    placeholder="pl. fertő, tata"
                  />
                </Card>

                <Card className="stack">
                  <p className="admin-subheading">Találatok</p>
                  {placesLoading ? <p className="admin-stat-note">Betöltés…</p> : null}
                  {error ? <p className="admin-message admin-message--error">{error}</p> : null}
                  {places.length === 0 && !placesLoading ? <p className="admin-stat-note">Nincs találat.</p> : null}
                  <div className="space-y-2">
                    {places.slice(0, 20).map((place) => (
                      <button
                        key={place.id}
                        type="button"
                        className="admin-list-link"
                        onClick={() => {
                          setSelectedPlace(place);
                          setError(null);
                          setMessage(null);
                        }}
                      >
                        <div className="admin-list-details">
                          <p className="admin-list-title">{place.name}</p>
                          <p className="admin-list-meta">
                            {place.county ? `${place.county} · ` : ""}
                            {place.nearest_city ?? place.slug}
                          </p>
                        </div>
                        <span className="admin-list-action">Select</span>
                      </button>
                    ))}
                  </div>
                </Card>
              </div>
            ) : (
              <div className="stack" style={{ gap: "1rem" }}>
                <Card className="stack">
                  <header className="admin-heading">
                    <p className="admin-heading__label admin-text-accent">2) Madarak</p>
                    <p className="admin-heading__description">
                      A listában előre kerülnek azok, amik a helyszínen honosak lehetnek (nem kizáró feltétel).
                    </p>
                  </header>

                  {selectedBirdIcons.length > 0 ? (
                    <div className={styles.selectedIcons}>
                      {selectedBirdIcons.map((icon) => (
                        <BirdIcon
                          key={icon.id}
                          habitatSrc={icon.habitatSrc}
                          iconicSrc={icon.iconicSrc}
                          showHabitatBackground
                          size={54}
                          className=""
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="admin-stat-note">Még nincs kijelölt madár.</p>
                  )}
                </Card>

                <Card className="stack">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Input
                      label="Keresés"
                      value={birdSearch}
                      onChange={(e) => setBirdSearch(e.target.value)}
                      placeholder="pl. széncinege"
                    />
                    <div className="grid gap-4 grid-cols-2">
                      <label className="form-field">
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
                      <label className="form-field">
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
                  </div>

                  <div>
                    <p className="form-field__label">Szín</p>
                    <div className={styles.swatches}>
                      {COLOR_OPTIONS.map((opt) => {
                        const active = colorTags.includes(opt.tag);
                        return (
                          <button
                            key={opt.tag}
                            type="button"
                            className={`${styles.swatch} ${active ? styles.swatchActive : ""}`}
                            onClick={() => setColorTags((prev) => toggleInList(prev, opt.tag))}
                            aria-pressed={active}
                            aria-label={opt.label}
                            title={opt.label}
                          >
                            <span className={styles.swatchInner} style={{ background: opt.swatch }} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </Card>

                <Card className="stack">
                  <div className="flex items-center justify-between gap-3">
                    <p className="admin-subheading">Ajánlott</p>
                    <p className="admin-note-small">{selectedBirdIds.length} kijelölve</p>
                  </div>

                  {birdsLoading ? <p className="admin-stat-note">Betöltés…</p> : null}
                  {error ? <p className="admin-message admin-message--error">{error}</p> : null}
                  {message ? <p className="admin-message admin-message--success">{message}</p> : null}

                  {sortedBirds.length === 0 && !birdsLoading ? <p className="admin-stat-note">Nincs találat.</p> : null}

                  <div className="space-y-2">
                    {sortedBirds.slice(0, 30).map((bird) => {
                      const icon = iconsByBirdId[bird.id];
                      const selected = selectedBirdSet.has(bird.id);
                      const isPlacePriority = placeRankByBirdId.has(bird.id);
                      return (
                        <button
                          key={bird.id}
                          type="button"
                          className="admin-list-link"
                          onClick={() =>
                            setSelectedBirdIds((prev) =>
                              prev.includes(bird.id) ? prev.filter((id) => id !== bird.id) : [...prev, bird.id]
                            )
                          }
                        >
                          <div className="admin-list-details">
                            <div className="admin-bird-list-grid" style={{ gridTemplateColumns: "auto 1fr" }}>
                              <BirdIcon
                                habitatSrc={icon?.habitatSrc ?? null}
                                iconicSrc={icon?.iconicSrc ?? null}
                                showHabitatBackground
                                size={64}
                              />
                              <div className="admin-bird-text-cell">
                                <p className="admin-list-title">{bird.name_hu}</p>
                                <p className="admin-list-meta">
                                  {isPlacePriority ? "Place-priority · " : ""}
                                  {bird.slug}
                                </p>
                              </div>
                            </div>
                          </div>
                          <span className="admin-list-action">{selected ? "Selected" : "Add"}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-end gap-3">
                    <Button type="button" variant="secondary" onClick={() => setSelectedBirdIds([])} disabled={saving}>
                      Clear
                    </Button>
                    <Button type="button" variant="primary" onClick={onSave} disabled={!canSave}>
                      {saving ? "Mentés…" : "Rögzítés"}
                    </Button>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <button
        type="button"
        className={styles.fabButton}
        aria-label="Birdwatch rögzítés megnyitása"
        onClick={() => setOpen(true)}
      >
        <Image src="/icon_birdwatch.svg" alt="" width={28} height={28} className={styles.fabIcon} />
      </button>
    </div>
  );
}
