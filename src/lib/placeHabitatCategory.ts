import type { PlaceType } from "@/types/place";

export const HABITAT_CATEGORY_KEYS = [
  "water_lakes_v1",
  "water_rivers_v1",
  "wetlands_v1",
  "forest_edge_v1",
  "grassland_v1",
  "farmland_v1",
  "mountains_v1",
  "urban_park_v1",
  "urban_waterfront_v1",
] as const;

export type HabitatCategoryKey = (typeof HABITAT_CATEGORY_KEYS)[number];

export const HABITAT_CATEGORY_ORDER: HabitatCategoryKey[] = [...HABITAT_CATEGORY_KEYS];

export const PLACE_TYPE_TO_HABITAT_CATEGORY: Record<PlaceType, HabitatCategoryKey> = {
  lake: "water_lakes_v1",
  river: "water_rivers_v1",
  fishpond: "water_lakes_v1",
  reservoir: "water_lakes_v1",
  marsh: "wetlands_v1",
  reedbed: "wetlands_v1",
  salt_lake: "wetlands_v1",
  forest_edge: "forest_edge_v1",
  grassland: "grassland_v1",
  farmland: "farmland_v1",
  mountain_area: "mountains_v1",
  urban_park: "urban_park_v1",
  urban_waterfront: "urban_waterfront_v1",
  protected_area: "forest_edge_v1",
};

export type HabitatCategoryStyle = {
  color: string;
  fill: string;
  fillSelected: string;
};

export const HABITAT_CATEGORY_STYLE: Record<HabitatCategoryKey, HabitatCategoryStyle> = {
  water_lakes_v1: {
    color: "rgba(14, 165, 233, 0.95)",
    fill: "rgba(14, 165, 233, 0.62)",
    fillSelected: "rgba(14, 165, 233, 0.95)",
  },
  water_rivers_v1: {
    color: "rgba(6, 182, 212, 0.95)",
    fill: "rgba(6, 182, 212, 0.6)",
    fillSelected: "rgba(6, 182, 212, 0.92)",
  },
  wetlands_v1: {
    color: "rgba(16, 185, 129, 0.95)",
    fill: "rgba(16, 185, 129, 0.55)",
    fillSelected: "rgba(16, 185, 129, 0.9)",
  },
  forest_edge_v1: {
    color: "rgba(34, 197, 94, 0.95)",
    fill: "rgba(34, 197, 94, 0.6)",
    fillSelected: "rgba(34, 197, 94, 0.95)",
  },
  grassland_v1: {
    color: "rgba(234, 179, 8, 0.95)",
    fill: "rgba(234, 179, 8, 0.6)",
    fillSelected: "rgba(234, 179, 8, 0.95)",
  },
  farmland_v1: {
    color: "rgba(249, 115, 22, 0.95)",
    fill: "rgba(249, 115, 22, 0.6)",
    fillSelected: "rgba(249, 115, 22, 0.96)",
  },
  mountains_v1: {
    color: "rgba(244, 114, 182, 0.95)",
    fill: "rgba(244, 114, 182, 0.55)",
    fillSelected: "rgba(244, 114, 182, 0.9)",
  },
  urban_park_v1: {
    color: "rgba(148, 163, 184, 0.95)",
    fill: "rgba(148, 163, 184, 0.45)",
    fillSelected: "rgba(148, 163, 184, 0.8)",
  },
  urban_waterfront_v1: {
    color: "rgba(37, 99, 235, 0.95)",
    fill: "rgba(37, 99, 235, 0.6)",
    fillSelected: "rgba(37, 99, 235, 0.93)",
  },
};

export const HABITAT_CATEGORY_WATER: Set<HabitatCategoryKey> = new Set([
  "water_lakes_v1",
  "water_rivers_v1",
  "wetlands_v1",
]);

export function getHabitatCategoryForPlaceType(placeType: PlaceType): HabitatCategoryKey {
  return PLACE_TYPE_TO_HABITAT_CATEGORY[placeType] ?? "grassland_v1";
}
