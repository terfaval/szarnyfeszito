import { unstable_cache } from "next/cache";

import { getBirdById, getBirdBySlug, isUuid } from "@/lib/birdService";
import { getLatestApprovedContentBlockForBird } from "@/lib/contentService";
import {
  computeHabitatStockAssetKeysForPlaceTypes,
  getSignedApprovedHabitatTileUrlsByAssetKeys,
  listApprovedPublishedPlaceTypesForBird,
  listHabitatStockAssets,
} from "@/lib/habitatStockAssetService";
import { getSignedImageUrl } from "@/lib/imageService";
import { createUserClient } from "@/lib/supabaseServerClient";
import type { BirdDossier } from "@/types/dossier";
import { logPublicReadRegenerate, PUBLIC_READ_REVALIDATE_SECONDS } from "@/lib/publicRead/cache";

export type PublicBirdDossierV1 = {
  generatedAtIso: string;
  dossier: BirdDossier;
  habitats: Array<{
    key: string;
    label_hu: string;
    src: string | null;
  }>;
  images: {
    main_habitat: string | null;
    flight_clean: string | null;
    nesting_clean: string | null;
    main_habitat_pair_sexes_v1: string | null;
  };
  meta: {
    bird_id: string;
    slug: string;
  };
  review: {
    comment: string | null;
    requested_at: string | null;
  };
};

function isBirdDossier(value: unknown): value is BirdDossier {
  if (!value || typeof value !== "object") return false;
  const v = value as { schema_version?: unknown; header?: unknown };
  if (v.schema_version !== "v2.2" && v.schema_version !== "v2.3") return false;
  if (!v.header || typeof v.header !== "object") return false;
  return true;
}

async function buildPublicBirdDossierV1(key: string): Promise<PublicBirdDossierV1 | null> {
  const generatedAtIso = new Date().toISOString();
  const supabase = createUserClient({ route: "publicRead.birdDossierService" });

  const bird = isUuid(key) ? await getBirdById(key) : await getBirdBySlug(key);
  if (!bird || bird.status !== "published") return null;

  const latestApproved = await getLatestApprovedContentBlockForBird(bird.id);
  let dossier: unknown = latestApproved?.blocks_json ?? null;
  let generationMeta: unknown = latestApproved?.generation_meta ?? null;

  if (!isBirdDossier(dossier)) {
    const { data, error } = await supabase
      .from("content_blocks")
      .select("blocks_json,generation_meta")
      .eq("entity_type", "bird")
      .eq("entity_id", bird.id)
      .eq("review_status", "approved")
      .not("blocks_json", "is", null)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    const row = data as { blocks_json?: unknown; generation_meta?: unknown } | null;
    dossier = row?.blocks_json ?? null;
    generationMeta = row?.generation_meta ?? null;
  }

  if (!isBirdDossier(dossier)) return null;

  const [placeTypes, habitatAssets] = await Promise.all([
    listApprovedPublishedPlaceTypesForBird(bird.id),
    listHabitatStockAssets(),
  ]);
  const habitatKeys = computeHabitatStockAssetKeysForPlaceTypes({ placeTypes, assets: habitatAssets }).slice(0, 8);
  const tilesByKey = await getSignedApprovedHabitatTileUrlsByAssetKeys(habitatKeys);
  const assetByKey = new Map(habitatAssets.map((a) => [a.key, a] as const));
  const habitats = habitatKeys
    .map((key) => ({
      key,
      label_hu: assetByKey.get(key)?.label_hu ?? key,
      src: tilesByKey.get(key) ?? null,
    }))
    .filter((h) => Boolean(h.key));

  const variants = ["main_habitat", "flight_clean", "nesting_clean", "main_habitat_pair_sexes_v1"] as const;

  const { data, error } = await supabase
    .from("images")
    .select("variant,storage_path")
    .eq("entity_type", "bird")
    .eq("entity_id", bird.id)
    .eq("is_current", true)
    .eq("review_status", "approved")
    .in("variant", variants as unknown as string[])
    .limit(20);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as Array<{ variant?: unknown; storage_path?: unknown }>;
  const storagePathByVariant = new Map<string, string>();
  rows.forEach((row) => {
    const variant = typeof row.variant === "string" ? row.variant : "";
    const storagePath = typeof row.storage_path === "string" ? row.storage_path : "";
    if (variant && storagePath && !storagePathByVariant.has(variant)) {
      storagePathByVariant.set(variant, storagePath);
    }
  });

  const signedByVariantEntries = await Promise.all(
    variants.map(async (variant) => {
      const storagePath = storagePathByVariant.get(variant) ?? "";
      const signed = storagePath ? await getSignedImageUrl(storagePath) : null;
      return [variant, signed] as const;
    })
  );

  const signedByVariant = Object.fromEntries(signedByVariantEntries) as Record<(typeof variants)[number], string | null>;

  const out: PublicBirdDossierV1 = {
    generatedAtIso,
    dossier,
    habitats,
    images: {
      main_habitat: signedByVariant.main_habitat ?? null,
      flight_clean: signedByVariant.flight_clean ?? null,
      nesting_clean: signedByVariant.nesting_clean ?? null,
      main_habitat_pair_sexes_v1: signedByVariant.main_habitat_pair_sexes_v1 ?? null,
    },
    meta: {
      bird_id: bird.id,
      slug: bird.slug,
    },
    review: {
      comment: typeof (generationMeta as { review_comment?: unknown } | null)?.review_comment === "string"
        ? String((generationMeta as { review_comment?: unknown }).review_comment)
        : null,
      requested_at:
        typeof (generationMeta as { review_requested_at?: unknown } | null)?.review_requested_at === "string"
          ? String((generationMeta as { review_requested_at?: unknown }).review_requested_at)
          : null,
    },
  };

  logPublicReadRegenerate("birdDossierV1", {
    generatedAtIso,
    bird_id: bird.id,
    slug: bird.slug,
    schema_version: dossier.schema_version,
  });

  return out;
}

const getPublicBirdDossierV1Cached = unstable_cache(
  async (key: string) => buildPublicBirdDossierV1(key),
  ["public-bird-dossier-v1"],
  { revalidate: PUBLIC_READ_REVALIDATE_SECONDS }
);

export async function getPublicBirdDossierV1(key: string): Promise<PublicBirdDossierV1 | null> {
  const normalizedKey = typeof key === "string" ? key.trim() : "";
  if (!normalizedKey) return null;
  return getPublicBirdDossierV1Cached(normalizedKey);
}
