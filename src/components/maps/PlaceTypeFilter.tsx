"use client";

import type { PlaceType } from "@/types/place";
import { PLACE_TYPE_LABELS, PLACE_TYPE_FILTER_ORDER } from "@/lib/placeTypeMeta";
import styles from "./PlaceTypeFilter.module.css";

type PlaceTypeFilterProps = {
  value: PlaceType | "all";
  onChange: (next: PlaceType | "all") => void;
  label?: string;
  className?: string;
};

export default function PlaceTypeFilter({ value, onChange, label = "Típus", className }: PlaceTypeFilterProps) {
  return (
    <label className={[styles.root, className ?? ""].filter(Boolean).join(" ")}>
      <span>{label}</span>
      <select
        className={styles.select}
        value={value}
        onChange={(event) => onChange(event.target.value === "all" ? "all" : (event.target.value as PlaceType))}
      >
        <option value="all">Mindegy</option>
        {PLACE_TYPE_FILTER_ORDER.map((type) => (
          <option key={type} value={type}>
            {PLACE_TYPE_LABELS[type]}
          </option>
        ))}
      </select>
    </label>
  );
}
