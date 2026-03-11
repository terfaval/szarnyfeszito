export type BasemapId = "bird" | "osm" | "brand";

export type MapThemeMode = "day" | "night";

export type BasemapPresetId = "paperLight" | "mutedContext" | "nightInk";
export type BasemapPresetKey = BasemapPresetId | "auto";

export const DEFAULT_BASEMAP_PRESET: BasemapPresetKey = "auto";

export const DEFAULT_BASEMAP: BasemapId = "bird";

const OSM_TILE = {
  url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
} as const;

const BIRD_TILE = {
  light: {
    url: "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
} as const;

export function getBasemapTileLayerArgs(args: { basemap: BasemapId; isDark: boolean }) {
  if (args.basemap === "osm") {
    return { url: OSM_TILE.url, attribution: OSM_TILE.attribution } as const;
  }
  if (args.basemap === "brand") {
    throw new Error('Basemap "brand" has no tile layer.');
  }
  const tile = args.isDark ? BIRD_TILE.dark : BIRD_TILE.light;
  return { url: tile.url, attribution: tile.attribution } as const;
}

export function getBasemapFallbackTileLayerArgs(args: { basemap: BasemapId; isDark: boolean }) {
  if (args.basemap === "bird") {
    return { url: OSM_TILE.url, attribution: OSM_TILE.attribution } as const;
  }
  return null;
}

export type ResolvedBasemapPreset = {
  preset: BasemapPresetId;
  basemap: BasemapId;
  isDark: boolean;
  mapClassName: string;
};

export function resolveBasemapPreset(args: { preset: BasemapPresetKey; theme: MapThemeMode }): ResolvedBasemapPreset {
  const resolvedPreset: BasemapPresetId =
    args.preset === "auto" ? (args.theme === "night" ? "nightInk" : "paperLight") : args.preset;

  if (resolvedPreset === "nightInk") {
    return { preset: resolvedPreset, basemap: "bird", isDark: true, mapClassName: "sf-map--preset-nightInk" };
  }
  if (resolvedPreset === "mutedContext") {
    return { preset: resolvedPreset, basemap: "bird", isDark: false, mapClassName: "sf-map--preset-mutedContext" };
  }
  return { preset: resolvedPreset, basemap: "bird", isDark: false, mapClassName: "sf-map--preset-paperLight" };
}
