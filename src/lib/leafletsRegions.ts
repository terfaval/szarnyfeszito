export type WorldRegionDef = {
  code: "europe" | "africa" | "asia" | "north_america" | "south_america" | "oceania";
  label: string;
  center: { lat: number; lng: number };
};

export type HungaryRegionDef = {
  code: "HU10" | "HU21" | "HU22" | "HU23" | "HU31" | "HU32" | "HU33";
  label: string;
  center: { lat: number; lng: number };
};

export const WORLD_REGION_DEFS: WorldRegionDef[] = [
  { code: "europe", label: "Europe", center: { lat: 54, lng: 15 } },
  { code: "africa", label: "Africa", center: { lat: 2, lng: 20 } },
  { code: "asia", label: "Asia", center: { lat: 35, lng: 95 } },
  { code: "north_america", label: "North America", center: { lat: 45, lng: -100 } },
  { code: "south_america", label: "South America", center: { lat: -15, lng: -60 } },
  { code: "oceania", label: "Oceania", center: { lat: -25, lng: 135 } },
];

export const HUNGARY_REGION_DEFS: HungaryRegionDef[] = [
  { code: "HU10", label: "Közép-Magyarország", center: { lat: 47.5, lng: 19.1 } },
  { code: "HU21", label: "Közép-Dunántúl", center: { lat: 47.3, lng: 18.2 } },
  { code: "HU22", label: "Nyugat-Dunántúl", center: { lat: 47.1, lng: 16.8 } },
  { code: "HU23", label: "Dél-Dunántúl", center: { lat: 46.1, lng: 18.3 } },
  { code: "HU31", label: "Észak-Magyarország", center: { lat: 48.1, lng: 20.6 } },
  { code: "HU32", label: "Észak-Alföld", center: { lat: 47.6, lng: 21.4 } },
  { code: "HU33", label: "Dél-Alföld", center: { lat: 46.6, lng: 20.2 } },
];

export const WORLD_REGION_CODES = WORLD_REGION_DEFS.map((r) => r.code);
export const HUNGARY_REGION_CODES = HUNGARY_REGION_DEFS.map((r) => r.code);

export function getWorldRegionDef(code: WorldRegionDef["code"]): WorldRegionDef {
  const found = WORLD_REGION_DEFS.find((def) => def.code === code);
  if (!found) {
    throw new Error(`Unknown world region code: ${code}`);
  }
  return found;
}

export function getHungaryRegionDef(code: HungaryRegionDef["code"]): HungaryRegionDef {
  const found = HUNGARY_REGION_DEFS.find((def) => def.code === code);
  if (!found) {
    throw new Error(`Unknown Hungary region code: ${code}`);
  }
  return found;
}

