export type BirdDossierHeader = {
  name_hu: string;
  name_latin: string;
  subtitle: string;
  short_summary: string;
};

export type BirdDossierSizeRange = {
  min: number | null;
  max: number | null;
};

export type HabitatClass = "erdő" | "vízpart" | "puszta" | "hegy" | "város";

export type BirdDossierPillMeta = {
  habitat_class: HabitatClass;
  region_teaser: string;
  size_cm: BirdDossierSizeRange;
  wingspan_cm: BirdDossierSizeRange;
  diet_short: string;
  lifespan_years: BirdDossierSizeRange;
};

export type BirdDossierIdentificationKeyFeature = {
  title: string;
  description: string;
};

export type BirdDossierIdentification = {
  key_features: BirdDossierIdentificationKeyFeature[];
  identification_paragraph: string;
};

export type BirdDossierTaxonomy = {
  order: string | null;
  family: string | null;
  genus: string | null;
  species: string | null;
};

export type BirdDossierDistribution = {
  taxonomy: BirdDossierTaxonomy;
  iucn_status: string | null;
  iucn_note?: string | null;
  distribution_regions: string[];
  distribution_note: string;
};

export type BirdDossierNesting = {
  nesting_type: string | null;
  nest_site: string | null;
  breeding_season: string | null;
  clutch_or_chicks_count: string | null;
  nesting_note: string;
};

export type BirdDossierMigration = {
  is_migratory: boolean | null;
  timing: string | null;
  route: string | null;
  migration_note: string;
};

export type LeafletsWorldRegionCode =
  | "europe"
  | "africa"
  | "asia"
  | "north_america"
  | "south_america"
  | "oceania";

export type LeafletsHungaryRegionCode =
  | "HU10" // Közép-Magyarország
  | "HU21" // Közép-Dunántúl
  | "HU22" // Nyugat-Dunántúl
  | "HU23" // Dél-Dunántúl
  | "HU31" // Észak-Magyarország
  | "HU32" // Észak-Alföld
  | "HU33"; // Dél-Alföld

export type BirdDossierLeafletRegion<TCode extends string> = {
  code: TCode;
  intensity: number; // 0..1
  rationale: string;
};

export type BirdDossierLeafletsV1 = {
  schema_version: "leaflets_v1";
  model?: string;
  generated_at?: string;
  source?: "with_text" | "backfill";
  world: {
    regions: BirdDossierLeafletRegion<LeafletsWorldRegionCode>[];
    note: string;
  };
  hungary: {
    regions: BirdDossierLeafletRegion<LeafletsHungaryRegionCode>[];
    note: string;
  };
};

export type BirdDossierV2 = {
  schema_version: "v2.2";
  signature_trait: string;
  header: BirdDossierHeader;
  pill_meta: BirdDossierPillMeta;
  short_options: [string, string, string];
  long_paragraphs: string[];
  identification: BirdDossierIdentification;
  distribution: BirdDossierDistribution;
  nesting: BirdDossierNesting;
  migration: BirdDossierMigration;
  fun_fact: string;
  did_you_know: string;
  ethics_tip: string;
  typical_places: string[];
  leaflets?: BirdDossierLeafletsV1;
};

export type BirdDossier = BirdDossierV2;

export type GenerationMeta = {
  model: string;
  prompt_hash: string;
  generated_at: string;
  review_comment?: string;
  review_requested_at?: string;
};
