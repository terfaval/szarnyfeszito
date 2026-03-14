import type { PlaceType } from "@/types/place";
import { PLACE_TYPE_VALUES } from "@/types/place";

export const PLACE_TYPE_LABELS: Record<PlaceType, string> = {
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

export const PLACE_TYPE_FILTER_ORDER: PlaceType[] = [...PLACE_TYPE_VALUES];
