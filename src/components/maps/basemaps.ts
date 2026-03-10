export type BasemapId = "bird" | "osm";

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
  const tile = args.isDark ? BIRD_TILE.dark : BIRD_TILE.light;
  return { url: tile.url, attribution: tile.attribution } as const;
}
