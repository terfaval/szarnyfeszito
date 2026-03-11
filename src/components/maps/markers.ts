"use client";

import L from "leaflet";

export type MapMarkerVariant = "default" | "secondary";
export type MapMarkerSize = "sm" | "md" | "lg";

export type CreateMapMarkerIconArgs = {
  variant?: MapMarkerVariant;
  selected?: boolean;
  disabled?: boolean;
  hover?: boolean;
  size?: MapMarkerSize;
  label?: string | number | null;
};

const SIZE_PX: Record<MapMarkerSize, number> = { sm: 14, md: 18, lg: 24 };

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (ch) => {
    if (ch === "&") return "&amp;";
    if (ch === "<") return "&lt;";
    if (ch === ">") return "&gt;";
    if (ch === '"') return "&quot;";
    return "&#39;";
  });
}

export function createMapMarkerIcon({
  variant = "default",
  selected = false,
  disabled = false,
  hover = false,
  size = "md",
  label = null,
}: CreateMapMarkerIconArgs) {
  const sizePx = SIZE_PX[size];

  const stateClasses = [
    variant === "secondary" ? "sf-map-marker--secondary" : "",
    selected ? "is-selected" : "",
    disabled ? "is-disabled" : "",
    hover ? "is-hover" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const safeLabel = label === null || label === undefined ? "" : escapeHtml(String(label));
  const html = `<div class="sf-map-marker ${stateClasses}"${safeLabel ? ` aria-label="${safeLabel}"` : ""}></div>`;

  return L.divIcon({
    className: "sf-map-marker-icon",
    html,
    iconSize: [sizePx, sizePx],
    iconAnchor: [Math.round(sizePx / 2), Math.round(sizePx / 2)],
  });
}

export function createMapClusterIcon(args: { count: number }) {
  const safe = escapeHtml(String(args.count));
  return L.divIcon({
    className: "sf-map-cluster-icon",
    html: `<div class="sf-map-cluster" aria-label="${safe} places">${safe}</div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

