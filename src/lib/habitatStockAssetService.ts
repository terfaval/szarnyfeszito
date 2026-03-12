import { supabaseServerClient } from "@/lib/supabaseServerClient";
import type { ImageRecord } from "@/types/image";
import { getSignedImageUrl } from "@/lib/imageSigning";
import type { PlaceType } from "@/types/place";

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

const HABITAT_CLASS_FALLBACK_KEYS: Record<string, string> = {
  "erdő": "forest_edge_v1",
  "vízpart": "wetlands_v1",
  "puszta": "grassland_v1",
  "hegy": "mountains_v1",
  "város": "urban_park_v1",
};

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

export async function listApprovedCurrentHabitatStockAssetImages(
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
    .eq("is_current", true)
    .eq("review_status", "approved");

  if (error) throw error;
  return (data ?? []) as ImageRecord[];
}

export function resolveHabitatStockAssetKeyForPlaceType(args: {
  placeType: PlaceType;
  assets: HabitatStockAsset[];
}): string | null {
  const { placeType, assets } = args;
  const matches = assets.filter((asset) => (asset.place_types ?? []).includes(placeType));
  if (matches.length === 0) return null;
  matches.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || a.key.localeCompare(b.key));
  return matches[0]?.key ?? null;
}

export function computeHabitatStockAssetKeysForPlaceTypes(args: {
  placeTypes: PlaceType[];
  assets: HabitatStockAsset[];
}): string[] {
  const placeTypes = Array.from(new Set(args.placeTypes)).filter(Boolean);
  if (placeTypes.length === 0) return [];

  const counts = new Map<string, number>();
  args.assets.forEach((asset) => {
    const assetPlaceTypes = asset.place_types ?? [];
    const hitCount = placeTypes.reduce(
      (acc, pt) => (assetPlaceTypes.includes(pt) ? acc + 1 : acc),
      0
    );
    if (hitCount > 0) {
      counts.set(asset.key, hitCount);
    }
  });

  const byKey = new Map<string, HabitatStockAsset>(args.assets.map((a) => [a.key, a]));
  return Array.from(counts.entries())
    .sort((a, b) => {
      const byCount = b[1] - a[1];
      if (byCount !== 0) return byCount;
      const aa = byKey.get(a[0]);
      const bb = byKey.get(b[0]);
      return (aa?.sort ?? 0) - (bb?.sort ?? 0) || a[0].localeCompare(b[0]);
    })
    .map(([key]) => key);
}

type PlaceBirdPlaceTypeRow = {
  place: { place_type?: unknown; status?: unknown } | { place_type?: unknown; status?: unknown }[] | null;
};

export async function listApprovedPublishedPlaceTypesForBird(birdId: string): Promise<PlaceType[]> {
  const { data, error } = await supabaseServerClient
    .from("place_birds")
    .select("place:places!place_birds_place_id_fkey(place_type,status)")
    .eq("bird_id", birdId)
    .eq("review_status", "approved")
    .limit(2000);

  if (error) throw error;

  const rows = (data ?? []) as PlaceBirdPlaceTypeRow[];
  const types: PlaceType[] = [];
  rows.forEach((row) => {
    const place = Array.isArray(row.place) ? (row.place[0] ?? null) : row.place;
    const status = typeof place?.status === "string" ? place.status : "";
    if (status !== "published") return;
    const placeType = typeof place?.place_type === "string" ? place.place_type : "";
    if (!placeType) return;
    types.push(placeType as PlaceType);
  });

  return Array.from(new Set(types));
}

export async function listPublishedPlaceTypesByNames(names: string[]): Promise<PlaceType[]> {
  const cleaned = Array.from(
    new Set(
      names
        .filter((name) => typeof name === "string")
        .map((name) => name.trim())
        .filter(Boolean)
    )
  ).slice(0, 50);

  if (cleaned.length === 0) return [];

  const clauses = cleaned.map((name) => `name.ilike.${name.replace(/,/g, " ")}`);
  const { data, error } = await supabaseServerClient
    .from("places")
    .select("name,place_type,status")
    .eq("status", "published")
    .or(clauses.join(","))
    .limit(500);

  if (error) throw error;

  const rows = (data ?? []) as Array<{ place_type?: unknown }>;
  const types: PlaceType[] = rows
    .map((row) => (typeof row?.place_type === "string" ? row.place_type : ""))
    .filter(Boolean) as PlaceType[];

  return Array.from(new Set(types));
}

export function resolveHabitatStockAssetKeyForHabitatClass(args: {
  habitatClass: string | null | undefined;
  assets: HabitatStockAsset[];
}): string | null {
  if (!args.habitatClass) return null;
  const normalized = args.habitatClass.trim().toLowerCase();
  const fallbackKey = HABITAT_CLASS_FALLBACK_KEYS[normalized] ?? null;
  if (!fallbackKey) return null;
  return args.assets.some((asset) => asset.key === fallbackKey) ? fallbackKey : null;
}

export async function getSignedApprovedHabitatTileUrlsByAssetKeys(keys: string[]) {
  const uniqueKeys = Array.from(new Set(keys.map((k) => k.trim()).filter(Boolean))).slice(0, 200);
  const out = new Map<string, string | null>();
  uniqueKeys.forEach((k) => out.set(k, null));
  if (uniqueKeys.length === 0) return out;

  const assets = await listHabitatStockAssets();
  const assetsByKey = new Map<string, HabitatStockAsset>(assets.map((a) => [a.key, a]));
  const ids = uniqueKeys.map((k) => assetsByKey.get(k)?.id ?? "").filter(Boolean);
  if (ids.length === 0) return out;

  const images = await listApprovedCurrentHabitatStockAssetImages(ids);
  const imageByAssetId = new Map<string, ImageRecord>();
  images.forEach((img) => {
    if (img?.entity_id && !imageByAssetId.has(img.entity_id)) {
      imageByAssetId.set(img.entity_id, img);
    }
  });

  await Promise.all(
    uniqueKeys.map(async (key) => {
      const asset = assetsByKey.get(key);
      const img = asset ? imageByAssetId.get(asset.id) ?? null : null;
      if (!img?.storage_path) {
        out.set(key, null);
        return;
      }
      const signed = await getSignedImageUrl(img.storage_path);
      out.set(key, signed ?? null);
    })
  );

  return out;
}
