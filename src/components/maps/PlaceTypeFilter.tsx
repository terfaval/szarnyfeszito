"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/ui/icons/Icon";
import type { PlaceType } from "@/types/place";
import { PLACE_TYPE_LABELS, PLACE_TYPE_FILTER_ORDER, sortPlaceTypes } from "@/lib/placeTypeMeta";
import styles from "./PlaceTypeFilter.module.css";

type PlaceTypeFilterProps = {
  value: PlaceType | "all";
  onChange: (next: PlaceType | "all") => void;
  label?: string;
  className?: string;
  variant?: "select" | "menu" | "toolbar";
  availableTypes?: PlaceType[];
};

export default function PlaceTypeFilter({
  value,
  onChange,
  label = "Típus",
  className,
  variant = "select",
  availableTypes,
}: PlaceTypeFilterProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const options = useMemo(() => {
    if (availableTypes && availableTypes.length > 0) return sortPlaceTypes(availableTypes);
    return PLACE_TYPE_FILTER_ORDER;
  }, [availableTypes]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleSelect = (next: PlaceType | "all") => {
    onChange(next);
    setOpen(false);
  };

  if (variant === "menu" || variant === "toolbar") {
    return (
      <div className={[styles.menuRoot, className ?? ""].filter(Boolean).join(" ")} ref={containerRef}>
        <button
          type="button"
          className={[
            variant === "toolbar" ? styles.toolButton : styles.menuButton,
            variant === "toolbar" ? styles.toolbarButton : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-label={label}
          onClick={() => setOpen((prev) => !prev)}
        >
          <Icon name="filter" size={18} />
          {variant === "toolbar" ? null : <span className={styles.menuLabel}>{label}</span>}
        </button>
        {open ? (
          <div className={styles.menuList} role="menu">
            <button
              type="button"
              className={`${styles.menuItem} ${value === "all" ? styles.menuItemActive : ""}`}
              onClick={() => handleSelect("all")}
            >
              Mindegy
            </button>
            {options.map((type) => (
              <button
                key={type}
                type="button"
                className={`${styles.menuItem} ${value === type ? styles.menuItemActive : ""}`}
                onClick={() => handleSelect(type)}
              >
                {PLACE_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <label className={[styles.root, className ?? ""].filter(Boolean).join(" ")}>
      <span>{label}</span>
      <select
        className={styles.select}
        value={value}
        onChange={(event) => onChange(event.target.value === "all" ? "all" : (event.target.value as PlaceType))}
      >
        <option value="all">Mindegy</option>
        {options.map((type) => (
          <option key={type} value={type}>
            {PLACE_TYPE_LABELS[type]}
          </option>
        ))}
      </select>
    </label>
  );
}
