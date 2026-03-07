export type Bounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};

export type WorldRegionV2Code =
  | "northern_europe"
  | "western_europe"
  | "eastern_europe"
  | "southern_europe"
  | "northern_africa"
  | "sub_saharan_africa"
  | "western_asia"
  | "central_asia"
  | "southern_asia"
  | "eastern_asia"
  | "south_eastern_asia"
  | "north_america"
  | "central_america"
  | "caribbean"
  | "south_america"
  | "australia_nz"
  | "melanesia"
  | "micronesia"
  | "polynesia";

export type HungaryRegionCode =
  | "HU10"
  | "HU21"
  | "HU22"
  | "HU23"
  | "HU31"
  | "HU32"
  | "HU33";

export type RegionDef<TCode extends string> = {
  code: TCode;
  label: string;
  bounds: Bounds[];
};

export const WORLD_REGION_V2_DEFS: RegionDef<WorldRegionV2Code>[] = [
  { code: "northern_europe", label: "Northern Europe", bounds: [{ south: 54, west: -10, north: 72, east: 40 }] },
  { code: "western_europe", label: "Western Europe", bounds: [{ south: 42, west: -10, north: 55, east: 15 }] },
  { code: "eastern_europe", label: "Eastern Europe", bounds: [{ south: 43, west: 15, north: 60, east: 60 }] },
  { code: "southern_europe", label: "Southern Europe", bounds: [{ south: 34, west: -10, north: 46, east: 30 }] },
  { code: "northern_africa", label: "Northern Africa", bounds: [{ south: 15, west: -17, north: 37, east: 35 }] },
  { code: "sub_saharan_africa", label: "Sub-Saharan Africa", bounds: [{ south: -35, west: -20, north: 15, east: 52 }] },
  { code: "western_asia", label: "Western Asia", bounds: [{ south: 12, west: 30, north: 42, east: 60 }] },
  { code: "central_asia", label: "Central Asia", bounds: [{ south: 35, west: 50, north: 55, east: 90 }] },
  { code: "southern_asia", label: "Southern Asia", bounds: [{ south: 5, west: 60, north: 35, east: 90 }] },
  { code: "eastern_asia", label: "Eastern Asia", bounds: [{ south: 20, west: 90, north: 50, east: 140 }] },
  { code: "south_eastern_asia", label: "South-eastern Asia", bounds: [{ south: -10, west: 90, north: 25, east: 130 }] },
  { code: "north_america", label: "North America", bounds: [{ south: 15, west: -170, north: 72, east: -50 }] },
  { code: "central_america", label: "Central America", bounds: [{ south: 5, west: -118, north: 20, east: -75 }] },
  { code: "caribbean", label: "Caribbean", bounds: [{ south: 10, west: -90, north: 28, east: -60 }] },
  { code: "south_america", label: "South America", bounds: [{ south: -55, west: -82, north: 13, east: -34 }] },
  { code: "australia_nz", label: "Australia & New Zealand", bounds: [{ south: -48, west: 110, north: -10, east: 180 }] },
  { code: "melanesia", label: "Melanesia", bounds: [{ south: -12, west: 130, north: 0, east: 170 }] },
  { code: "micronesia", label: "Micronesia", bounds: [{ south: 0, west: 130, north: 20, east: 170 }] },
  {
    code: "polynesia",
    label: "Polynesia",
    bounds: [
      { south: -25, west: 160, north: 10, east: 180 },
      { south: -25, west: -180, north: 10, east: -120 },
    ],
  },
];

export const HUNGARY_REGION_V2_DEFS: RegionDef<HungaryRegionCode>[] = [
  { code: "HU10", label: "Közép-Magyarország", bounds: [{ south: 47.0, west: 18.6, north: 48.1, east: 19.9 }] },
  { code: "HU21", label: "Közép-Dunántúl", bounds: [{ south: 46.6, west: 17.6, north: 47.8, east: 18.8 }] },
  { code: "HU22", label: "Nyugat-Dunántúl", bounds: [{ south: 46.7, west: 16.0, north: 47.9, east: 17.8 }] },
  { code: "HU23", label: "Dél-Dunántúl", bounds: [{ south: 45.7, west: 16.8, north: 46.8, east: 18.8 }] },
  { code: "HU31", label: "Észak-Magyarország", bounds: [{ south: 47.7, west: 19.5, north: 48.6, east: 21.8 }] },
  { code: "HU32", label: "Észak-Alföld", bounds: [{ south: 47.0, west: 20.8, north: 48.4, east: 22.7 }] },
  { code: "HU33", label: "Dél-Alföld", bounds: [{ south: 46.0, west: 19.6, north: 47.4, east: 22.2 }] },
];

export function getWorldRegionV2Def(code: WorldRegionV2Code) {
  const found = WORLD_REGION_V2_DEFS.find((def) => def.code === code);
  if (!found) throw new Error(`Unknown world region v2 code: ${code}`);
  return found;
}

export function getHungaryRegionV2Def(code: HungaryRegionCode) {
  const found = HUNGARY_REGION_V2_DEFS.find((def) => def.code === code);
  if (!found) throw new Error(`Unknown Hungary region v2 code: ${code}`);
  return found;
}

