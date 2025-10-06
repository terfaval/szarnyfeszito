// /src/lib/types.ts
export type Location = {
  name: string;
  region: string;
  lat: number;
  lng: number;
  habitat_types: string[];
  access_info: string;
  visitor_rules: string;
  difficulty: string;
  best_time_hint: string;
  amenities: string[];
  is_featured: boolean;
};

export type Species = {
  scientific_name: string;
  common_name_hu: string;
  order: string;
  family: string;
  iucn: string;
  size_cm: number;
  wingspan_cm: number;
  dominant_colors: string[];
  icon_priority: number;
  is_featured: boolean;
};

export type LocationSeason = {
  location_name: string;
  season: 'spring' | 'autumn' | 'both';
  start_month: number;
  end_month: number;
  peak_weeks?: number[];
  notes?: string;
};

export type LocationSpecies = {
  location_name: string;
  species_sci: string;
  season: 'spring' | 'autumn' | 'both';
  likelihood: 'common' | 'likely' | 'occasional' | 'rare';
  count_scale: 'singles' | 'dozens' | 'hundreds' | 'thousands';
  best_time_of_day: 'dawn' | 'morning' | 'noon' | 'afternoon' | 'dusk' | 'night';
  observation_style: 'tower' | 'hide' | 'trail' | 'shore' | 'boat';
  notes?: string;
};

export type ScientificLocationNote = {
  location_name: string;
  season: 'spring' | 'autumn';
  phenology_md: string;
  conservation_md: string;
  management_md: string;
};

export type ScientificSpeciesDescription = {
  species_sci: string;
  id_markings_md: string;
  voice_md: string;
  habitat_md: string;
  diet_md: string;
  phenology_md: string;
  confusions_md: string;
};
