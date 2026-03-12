"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import BirdIcon from "@/components/admin/BirdIcon";
import type { BirdColorTag, BirdSizeCategory, BirdVisibilityCategory } from "@/types/bird";
import type { PlaceType } from "@/types/place";
import styles from "./PublicBirdsGrid.module.css";

type PublicBirdListItem = {
  id: string;
  slug: string;
  name_hu: string;
  name_latin: string | null;
  size_category: BirdSizeCategory | null;
  size_label_hu: string | null;
  visibility_category: BirdVisibilityCategory | null;
  visibility_label_hu: string;
  color_tags: BirdColorTag[];
  short: string;
  iconic_src: string | null;
  habitat_key: string | null;
  habitat_src: string | null;
  place_types: PlaceType[];
  regions: string[];
  places: Array<{ slug: string; name: string }>;
};

type PublicBirdFilters = {
  place_types: string[];
  regions: string[];
  places: Array<{ slug: string; name: string }>;
};

const SIZE_LABELS: Array<{ value: BirdSizeCategory; label: string }> = [
  { value: "very_small", label: "Nagyon kicsi" },
  { value: "small", label: "Kicsi" },
  { value: "medium", label: "Közepes" },
  { value: "large", label: "Nagy" },
];

const VISIBILITY_LABELS: Array<{ value: BirdVisibilityCategory; label: string }> = [
  { value: "common_hu", label: "Gyakori (HU)" },
  { value: "localized_hu", label: "Helyi (HU)" },
  { value: "seasonal_hu", label: "Szezonális (HU)" },
  { value: "rare_hu", label: "Ritka (HU)" },
  { value: "not_in_hu", label: "Nem HU" },
];

const COLOR_TAGS: Array<{ value: BirdColorTag; label: string }> = [
  { value: "white", label: "Fehér" },
  { value: "black", label: "Fekete" },
  { value: "grey", label: "Szürke" },
  { value: "brown", label: "Barna" },
  { value: "yellow", label: "Sárga" },
  { value: "orange", label: "Narancs" },
  { value: "red", label: "Vörös" },
  { value: "green", label: "Zöld" },
  { value: "blue", label: "Kék" },
];

const VISIBILITY_ORDER: Array<BirdVisibilityCategory | "unknown"> = [
  "common_hu",
  "localized_hu",
  "seasonal_hu",
  "rare_hu",
  "not_in_hu",
  "unknown",
];

export default function PublicBirdsGrid() {
  const [birds, setBirds] = useState<PublicBirdListItem[]>([]);
  const [filters, setFilters] = useState<PublicBirdFilters>({
    place_types: [],
    regions: [],
    places: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [sizeCategory, setSizeCategory] = useState("");
  const [visibilityCategory, setVisibilityCategory] = useState("");
  const [placeType, setPlaceType] = useState("");
  const [region, setRegion] = useState("");
  const [placeSlug, setPlaceSlug] = useState("");
  const [colorTags, setColorTags] = useState<BirdColorTag[]>([]);
  const [sortKey, setSortKey] = useState("name_asc");

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (sizeCategory) params.set("size_category", sizeCategory);
      if (visibilityCategory) params.set("visibility_category", visibilityCategory);
      if (placeType) params.set("place_type", placeType);
      if (region) params.set("region", region);
      if (placeSlug) params.set("place", placeSlug);
      if (colorTags.length) params.set("color_tags", colorTags.join(","));

      const response = await fetch(`/api/public/birds?${params.toString()}`);
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(payload?.error ?? "Nem sikerült betölteni a madarakat.");
        setLoading(false);
        return;
      }
      setBirds((payload?.data?.birds ?? []) as PublicBirdListItem[]);
      setFilters((payload?.data?.filters ?? {}) as PublicBirdFilters);
      setLoading(false);
    };
    run();
  }, [search, sizeCategory, visibilityCategory, placeType, region, placeSlug, colorTags]);

  const sortedBirds = useMemo(() => {
    const copy = [...birds];
    if (sortKey === "name_desc") {
      copy.sort((a, b) => b.name_hu.localeCompare(a.name_hu, "hu"));
      return copy;
    }
    if (sortKey === "size") {
      const order = new Map<BirdSizeCategory | "unknown", number>([
        ["very_small", 1],
        ["small", 2],
        ["medium", 3],
        ["large", 4],
        ["unknown", 5],
      ]);
      copy.sort(
        (a, b) =>
          (order.get(a.size_category ?? "unknown") ?? 9) -
          (order.get(b.size_category ?? "unknown") ?? 9)
      );
      return copy;
    }
    if (sortKey === "visibility") {
      const order = new Map<BirdVisibilityCategory | "unknown", number>(
        VISIBILITY_ORDER.map((value, idx) => [value, idx + 1])
      );
      copy.sort(
        (a, b) =>
          (order.get(a.visibility_category ?? "unknown") ?? 9) -
          (order.get(b.visibility_category ?? "unknown") ?? 9)
      );
      return copy;
    }
    copy.sort((a, b) => a.name_hu.localeCompare(b.name_hu, "hu"));
    return copy;
  }, [birds, sortKey]);

  const grouped = useMemo(() => {
    const map = new Map<string, PublicBirdListItem[]>();
    sortedBirds.forEach((bird) => {
      const key = bird.visibility_category ?? "unknown";
      const list = map.get(key) ?? [];
      list.push(bird);
      map.set(key, list);
    });
    return VISIBILITY_ORDER.map((key) => ({
      key,
      label:
        key === "unknown"
          ? "Ismeretlen megfigyelhetőség"
          : VISIBILITY_LABELS.find((item) => item.value === key)?.label ?? "Ismeretlen",
      birds: map.get(key) ?? [],
    })).filter((group) => group.birds.length > 0);
  }, [sortedBirds]);

  const toggleColorTag = (tag: BirdColorTag) => {
    setColorTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  return (
    <main className={styles.page}>
      <header className="admin-heading">
        <p className="admin-heading__label">Szárnyfeszítő</p>
        <h1 className="admin-heading__title admin-heading__title--large">Madarak</h1>
        <p className="admin-heading__description">
          Publikált fajok alapinformációkkal, élőhelyi háttérrel és megfigyelhetőség szerint rendezve.
        </p>
      </header>

      <section className={`${styles.filters} admin-card`}>
        <div className={styles.filterRow}>
          <label className={styles.filterLabel}>
            Keresés
            <input
              className={styles.input}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Madár vagy helyszín neve"
            />
          </label>
          <label className={styles.filterLabel}>
            Méret
            <select
              className={styles.select}
              value={sizeCategory}
              onChange={(event) => setSizeCategory(event.target.value)}
            >
              <option value="">Mindegy</option>
              {SIZE_LABELS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.filterLabel}>
            Megfigyelhetőség
            <select
              className={styles.select}
              value={visibilityCategory}
              onChange={(event) => setVisibilityCategory(event.target.value)}
            >
              <option value="">Mindegy</option>
              {VISIBILITY_LABELS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.filterLabel}>
            Helyszíntípus
            <select
              className={styles.select}
              value={placeType}
              onChange={(event) => setPlaceType(event.target.value)}
            >
              <option value="">Mindegy</option>
              {filters.place_types.map((value) => (
                <option key={value} value={value}>
                  {value.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.filterLabel}>
            Régió
            <select
              className={styles.select}
              value={region}
              onChange={(event) => setRegion(event.target.value)}
            >
              <option value="">Mindegy</option>
              {filters.regions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.filterLabel}>
            Helyszín
            <select
              className={styles.select}
              value={placeSlug}
              onChange={(event) => setPlaceSlug(event.target.value)}
            >
              <option value="">Mindegy</option>
              {filters.places.map((place) => (
                <option key={place.slug} value={place.slug}>
                  {place.name}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.filterLabel}>
            Rendezés
            <select
              className={styles.select}
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value)}
            >
              <option value="name_asc">Név (A–Z)</option>
              <option value="name_desc">Név (Z–A)</option>
              <option value="size">Méret</option>
              <option value="visibility">Megfigyelhetőség</option>
            </select>
          </label>
        </div>

        <div className={styles.colorFilter}>
          <p className={styles.colorLabel}>Színek</p>
          <div className={styles.colorTags}>
            {COLOR_TAGS.map((tag) => (
              <button
                key={tag.value}
                type="button"
                className={`${styles.colorTag} ${colorTags.includes(tag.value) ? styles.colorTagActive : ""}`}
                onClick={() => toggleColorTag(tag.value)}
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {error ? <div className={`admin-message admin-message--error ${styles.notice}`}>{error}</div> : null}

      {loading ? (
        <div className={`admin-stat-card ${styles.notice}`}>Betöltés…</div>
      ) : grouped.length === 0 ? (
        <div className={`admin-stat-card ${styles.notice}`}>Nincs olyan madár, ami megfelel a szűrésnek.</div>
      ) : (
        <div className={styles.groups}>
          {grouped.map((group) => (
            <section key={group.key} className={styles.group}>
              <div className={styles.groupHeader}>
                <h2 className={styles.groupTitle}>{group.label}</h2>
                <span className={styles.groupCount}>{group.birds.length} faj</span>
              </div>
              <div className={styles.grid}>
                {group.birds.map((bird) => (
                  <Link key={bird.id} href={`/birds/${bird.id}`} className={`${styles.card} admin-stat-card`}>
                    <BirdIcon
                      iconicSrc={bird.iconic_src}
                      habitatSrc={bird.habitat_src}
                      showHabitatBackground
                      size={86}
                      className={styles.cardIcon}
                    />
                    <div className={styles.cardBody}>
                      <h3 className={styles.cardTitle}>{bird.name_hu}</h3>
                      <p className={styles.cardMeta}>
                        {bird.visibility_label_hu}
                        {bird.size_label_hu ? ` · ${bird.size_label_hu}` : ""}
                      </p>
                      <p className={styles.cardShort}>{bird.short}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
