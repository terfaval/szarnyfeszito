import { supabaseServerClient } from "@/lib/supabaseServerClient";
import type { ImageRecord } from "@/types/image";

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

export async function listHabitatStockAssets(): Promise<HabitatStockAsset[]> {
  const { data, error } = await supabaseServerClient
    .from("habitat_stock_assets")
    .select("*")
    .eq("is_active", true)
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

