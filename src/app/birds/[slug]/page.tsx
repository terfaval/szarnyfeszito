import { notFound } from "next/navigation";
import BirdCard from "@/components/public/BirdCard";
import { getBirdById, getBirdBySlug, isUuid } from "@/lib/birdService";
import { getLatestApprovedContentBlockForBird } from "@/lib/contentService";
import {
  computeHabitatStockAssetKeysForPlaceTypes,
  getSignedApprovedHabitatTileUrlsByAssetKeys,
  listHabitatStockAssets,
} from "@/lib/habitatStockAssetService";
import { getSignedImageUrl, listApprovedCurrentIconicImagesForBirds } from "@/lib/imageService";
import { supabaseServerClient } from "@/lib/supabaseServerClient";
import type { PlaceType } from "@/types/place";
import PublicShell from "@/ui/components/PublicShell";
import styles from "./page.module.css";

type PlaceLinkRow = {
  place?: { place_type?: unknown; status?: unknown } | null;
};

export const metadata = {
  title: "Madár — Szárnyfeszítő",
};

export const dynamic = "force-dynamic";

export default async function BirdDetailPage({ params }: { params: { slug: string } }) {
  const key = params.slug;
  const bird = isUuid(key) ? await getBirdById(key) : await getBirdBySlug(key);
  if (!bird || bird.status !== "published") {
    notFound();
  }

  const content = await getLatestApprovedContentBlockForBird(bird.id);
  if (!content) {
    notFound();
  }

  const [iconicImages, habitatAssets] = await Promise.all([
    listApprovedCurrentIconicImagesForBirds([bird.id]),
    listHabitatStockAssets(),
  ]);

  const iconicImage = iconicImages[0] ?? null;
  const iconicSrc = iconicImage?.storage_path ? await getSignedImageUrl(iconicImage.storage_path) : null;

  const { data: placeLinkRows, error } = await supabaseServerClient
    .from("place_birds")
    .select("place:places!place_birds_place_id_fkey(place_type,status)")
    .eq("bird_id", bird.id)
    .eq("review_status", "approved")
    .limit(2000);

  if (error) {
    throw error;
  }

  const placeTypes: PlaceType[] = [];
  (placeLinkRows ?? []).forEach((row) => {
    const r = row as PlaceLinkRow;
    const place = r?.place ?? null;
    const status = typeof place?.status === "string" ? place.status : "";
    if (status !== "published") return;
    const placeType = typeof place?.place_type === "string" ? place.place_type : "";
    if (!placeType) return;
    placeTypes.push(placeType as PlaceType);
  });

  let habitatKey: string | null = null;
  if (placeTypes.length > 0) {
    const keys = computeHabitatStockAssetKeysForPlaceTypes({
      placeTypes: Array.from(new Set(placeTypes)),
      assets: habitatAssets,
    });
    habitatKey = keys[0] ?? null;
  }
  if (!habitatKey && Array.isArray(bird.habitat_stock_asset_keys)) {
    habitatKey = bird.habitat_stock_asset_keys[0] ?? null;
  }

  const habitatUrlByKey = habitatKey
    ? await getSignedApprovedHabitatTileUrlsByAssetKeys([habitatKey])
    : new Map<string, string | null>();
  const habitatSrc = habitatKey ? habitatUrlByKey.get(habitatKey) ?? null : null;

  return (
    <PublicShell>
      <main className={styles.page}>
        <BirdCard
          bird={{
            name_hu: bird.name_hu,
            name_latin: bird.name_latin ?? null,
            size_category: bird.size_category ?? null,
            visibility_category: bird.visibility_category ?? null,
            color_tags: bird.color_tags ?? null,
          }}
          content={{
            short: content.short ?? "",
            long: content.long ?? "",
            feature_block: content.feature_block ?? [],
            did_you_know: content.did_you_know ?? "",
            ethics_tip: content.ethics_tip ?? "",
          }}
          iconicSrc={iconicSrc}
          habitatSrc={habitatSrc}
        />
      </main>
    </PublicShell>
  );
}
