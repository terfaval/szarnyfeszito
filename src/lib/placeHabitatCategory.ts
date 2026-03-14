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
    color: "rgba(14, 116, 205, 0.9)",
    fill: "rgba(14, 116, 205, 0.45)",
    fillSelected: "rgba(14, 116, 205, 0.85)",
  },
  water_rivers_v1: {
    color: "rgba(12, 120, 175, 0.95)",
    fill: "rgba(12, 120, 175, 0.55)",
    fillSelected: "rgba(12, 120, 175, 0.9)",
  },
  wetlands_v1: {
    color: "rgba(16, 143, 74, 0.95)",
    fill: "rgba(16, 143, 74, 0.55)",
    fillSelected: "rgba(16, 143, 74, 0.9)",
  },
  forest_edge_v1: {
    color: "rgba(22, 121, 52, 0.95)",
    fill: "rgba(22, 121, 52, 0.6)",
    fillSelected: "rgba(22, 121, 52, 0.95)",
  },
  grassland_v1: {
    color: "rgba(186, 159, 69, 0.95)",
    fill: "rgba(186, 159, 69, 0.5)",
    fillSelected: "rgba(186, 159, 69, 0.85)",
  },
  farmland_v1: {
    color: "rgba(146, 90, 36, 0.95)",
    fill: "rgba(146, 90, 36, 0.5)",
    fillSelected: "rgba(146, 90, 36, 0.85)",
  },
  mountains_v1: {
    color: "rgba(114, 74, 38, 0.95)",
    fill: "rgba(114, 74, 38, 0.55)",
    fillSelected: "rgba(114, 74, 38, 0.9)",
  },
  urban_park_v1: {
    color: "rgba(83, 96, 104, 0.95)",
    fill: "rgba(83, 96, 104, 0.45)",
    fillSelected: "rgba(83, 96, 104, 0.82)",
  },
  urban_waterfront_v1: {
    color: "rgba(28, 71, 91, 0.95)",
    fill: "rgba(28, 71, 91, 0.55)",
    fillSelected: "rgba(28, 71, 91, 0.88)",
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
