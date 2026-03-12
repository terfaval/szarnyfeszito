import { supabaseServerClient } from "@/lib/supabaseServerClient";
import type { ImageRecord } from "@/types/image";

const HABITAT_STOCK_ASSET_SEED_V1 = [
  {
    key: "water_lakes_v1",
    label_hu: "Tavak / tavak jellegű vizek",
    place_types: ["lake", "fishpond", "reservoir"],
    sort: 10,
  },
  {
    key: "water_rivers_v1",
    label_hu: "Folyók",
    place_types: ["river"],
    sort: 20,
  },
  {
    key: "wetlands_v1",
    label_hu: "Vizes élőhelyek (mocsár / nád / szikes)",
    place_types: ["marsh", "reedbed", "salt_lake"],
    sort: 30,
  },
  {
    key: "forest_edge_v1",
    label_hu: "Erdőszél",
    place_types: ["forest_edge"],
    sort: 40,
  },
  {
    key: "grassland_v1",
    label_hu: "Gyep / puszta",
    place_types: ["grassland"],
    sort: 50,
  },
  {
    key: "farmland_v1",
    label_hu: "Mezőgazdasági terület",
    place_types: ["farmland"],
    sort: 60,
  },
  {
    key: "mountains_v1",
    label_hu: "Hegység",
    place_types: ["mountain_area"],
    sort: 70,
  },
  {
    key: "urban_park_v1",
    label_hu: "Városi park",
    place_types: ["urban_park"],
    sort: 80,
  },
  {
    key: "urban_waterfront_v1",
    label_hu: "Városi vízpart",
    place_types: ["urban_waterfront"],
    sort: 90,
  },
] as const;

export type HabitatStockAsset = {
  id: string;
  key: string;
  label_hu: string;
  place_types: string[];
  sort: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

async function ensureHabitatStockAssetsSeededV1() {
  const { count, error } = await supabaseServerClient
    .from("habitat_stock_assets")
    .select("id", { count: "exact", head: true });

  if (error) throw error;
  if (count === null || count > 0) return;

  const { error: upsertError } = await supabaseServerClient
    .from("habitat_stock_assets")
    .upsert(
      HABITAT_STOCK_ASSET_SEED_V1.map((row) => ({
        key: row.key,
        label_hu: row.label_hu,
        place_types: [...row.place_types],
        sort: row.sort,
        is_active: true,
      })),
      { onConflict: "key" }
    );

  if (upsertError) throw upsertError;
}

export async function listHabitatStockAssets(): Promise<HabitatStockAsset[]> {
  await ensureHabitatStockAssetsSeededV1();
  const { data, error } = await supabaseServerClient
    .from("habitat_stock_assets")
    .select("*")
    .order("sort", { ascending: true })
    .order("label_hu", { ascending: true });

  if (error) throw error;
  return (data ?? []) as HabitatStockAsset[];
}

export async function getHabitatStockAssetByKey(key: string): Promise<HabitatStockAsset | null> {
  const normalized = key.trim();
  if (!normalized) return null;

  const { data, error } = await supabaseServerClient
    .from("habitat_stock_assets")
    .select("*")
    .eq("key", normalized)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as HabitatStockAsset | null;
}

export async function listCurrentHabitatStockAssetImages(
  assetIds: string[]
): Promise<ImageRecord[]> {
  const ids = Array.from(new Set(assetIds.filter(Boolean))).slice(0, 200);
  if (ids.length === 0) return [];

  const { data, error } = await supabaseServerClient
    .from("images")
    .select("*")
    .eq("entity_type", "habitat_stock_asset")
    .in("entity_id", ids)
    .eq("style_family", "iconic")
    .eq("variant", "habitat_square_v1")
    .eq("is_current", true);

  if (error) throw error;
  return (data ?? []) as ImageRecord[];
}
