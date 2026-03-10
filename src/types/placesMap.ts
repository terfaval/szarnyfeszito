import type { FeatureCollection } from "geojson";

export type PlacesMapLayersV1 = {
  schema_version: "places_map_layers_v1";
  country_borders: FeatureCollection;
  regions: FeatureCollection;
};

