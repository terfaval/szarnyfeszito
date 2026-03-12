"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styles from "./PublicPlacesGrid.module.css";
import type { PlaceType } from "@/types/place";

type PublicPlaceListItem = {
  id: string;
  slug: string;
  name: string;
  place_type: PlaceType;
  region_landscape: string | null;
  county: string | null;
  nearest_city: string | null;
  teaser: string;
  short: string;
  hero_image_src: string | null;
  habitat_key: string | null;
  habitat_src: string | null;
};

type PublicPlaceFilters = {
  place_types: string[];
  regions: string[];
};

const PLACE_TYPE_LABELS: Record<PlaceType, string> = {
  lake: "Tó",
  river: "Folyó",
  fishpond: "Halastó",
  reservoir: "Tározó",
  marsh: "Mocsár",
  reedbed: "Nádas",
  salt_lake: "Szikes tó",
  forest_edge: "Erdőszél",
  grassland: "Gyep/puszta",
  farmland: "Mezőgazdaság",
  mountain_area: "Hegység",
  urban_park: "Városi park",
  urban_waterfront: "Városi vízpart",
  protected_area: "Védett terület",
};

const PLACE_TYPE_CLASS: Partial<Record<PlaceType, string>> = {
  lake: "water",
  river: "water",
  fishpond: "water",
  reservoir: "water",
  marsh: "wetland",
  reedbed: "wetland",
  salt_lake: "wetland",
  forest_edge: "forest",
  grassland: "grass",
  farmland: "grass",
  mountain_area: "mountain",
  urban_park: "urban",
  urban_waterfront: "urban",
  protected_area: "protected",
};

export default function PublicPlacesGrid() {
  const [places, setPlaces] = useState<PublicPlaceListItem[]>([]);
  const [filters, setFilters] = useState<PublicPlaceFilters>({ place_types: [], regions: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [placeType, setPlaceType] = useState("");
  const [region, setRegion] = useState("");
  const [sortKey, setSortKey] = useState("name_asc");

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (placeType) params.set("place_type", placeType);
      if (region) params.set("region", region);
      const response = await fetch(`/api/public/places/list?${params.toString()}`);
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(payload?.error ?? "Nem sikerült betölteni a helyszíneket.");
        setLoading(false);
        return;
      }
      setPlaces((payload?.data?.places ?? []) as PublicPlaceListItem[]);
      setFilters((payload?.data?.filters ?? {}) as PublicPlaceFilters);
      setLoading(false);
    };
    run();
  }, [search, placeType, region]);

  const sortedPlaces = useMemo(() => {
    const copy = [...places];
    if (sortKey === "name_desc") {
      copy.sort((a, b) => b.name.localeCompare(a.name, "hu"));
      return copy;
    }
    if (sortKey === "region") {
      copy.sort((a, b) => (a.region_landscape ?? "").localeCompare(b.region_landscape ?? "", "hu"));
      return copy;
    }
    if (sortKey === "type") {
      copy.sort((a, b) => a.place_type.localeCompare(b.place_type, "hu"));
      return copy;
    }
    copy.sort((a, b) => a.name.localeCompare(b.name, "hu"));
    return copy;
  }, [places, sortKey]);

  return (
    <main className={styles.page}>
      <header className="admin-heading">
        <p className="admin-heading__label">Szárnyfeszítő</p>
        <h1 className="admin-heading__title admin-heading__title--large">Helyszínek</h1>
        <p className="admin-heading__description">
          Publikált helyszínek grides nézetben, élőhely ikonokkal és régió pillákkal.
        </p>
      </header>

      <section className={`${styles.filters} admin-card`}>
        <label className={styles.filterLabel}>
          Keresés
          <input
            className={styles.input}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Helyszín neve"
          />
        </label>
        <label className={styles.filterLabel}>
          Típus
          <select
            className={styles.select}
            value={placeType}
            onChange={(event) => setPlaceType(event.target.value)}
          >
            <option value="">Mindegy</option>
            {filters.place_types.map((value) => (
              <option key={value} value={value}>
                {PLACE_TYPE_LABELS[value as PlaceType] ?? value.replaceAll("_", " ")}
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
          Rendezés
          <select className={styles.select} value={sortKey} onChange={(event) => setSortKey(event.target.value)}>
            <option value="name_asc">Név (A–Z)</option>
            <option value="name_desc">Név (Z–A)</option>
            <option value="region">Régió</option>
            <option value="type">Típus</option>
          </select>
        </label>
      </section>

      {error ? <div className={`admin-message admin-message--error ${styles.notice}`}>{error}</div> : null}

      {loading ? (
        <div className={`admin-stat-card ${styles.notice}`}>Betöltés…</div>
      ) : sortedPlaces.length === 0 ? (
        <div className={`admin-stat-card ${styles.notice}`}>Nincs olyan helyszín, ami megfelel a szűrésnek.</div>
      ) : (
        <div className={styles.grid}>
          {sortedPlaces.map((place) => {
            const typeClass = PLACE_TYPE_CLASS[place.place_type] ?? "neutral";
            return (
              <Link
                key={place.id}
                href={`/places?place=${place.slug}`}
                className={`${styles.card} ${styles[typeClass]} admin-card`}
              >
                <div className={styles.hero}>
                  {place.hero_image_src ? (
                    <img src={place.hero_image_src} alt="" className={styles.heroImage} />
                  ) : (
                    <div className={styles.heroImage} aria-label="Nincs borítókép" />
                  )}
                  <div className={styles.heroOverlay}>
                    {place.habitat_src ? (
                      <img src={place.habitat_src} alt="" className={styles.habitatIcon} />
                    ) : null}
                    {place.region_landscape ? (
                      <span className={styles.regionPill}>{place.region_landscape}</span>
                    ) : null}
                  </div>
                </div>
                <div className={styles.body}>
                  <div className={styles.metaRow}>
                    <span className={`${styles.typePill} ${styles[typeClass]}`}>
                      {PLACE_TYPE_LABELS[place.place_type]}
                    </span>
                    {place.county ? <span className={styles.county}>{place.county}</span> : null}
                  </div>
                  <h3 className={styles.cardTitle}>{place.name}</h3>
                  <p className={styles.cardShort}>{place.short || place.teaser}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
