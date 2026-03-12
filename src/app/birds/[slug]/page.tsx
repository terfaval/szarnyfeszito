import Link from "next/link";
import { notFound } from "next/navigation";
import BirdIcon from "@/components/admin/BirdIcon";
import { getBirdBySlug } from "@/lib/birdService";
import { getLatestApprovedContentBlockForBird } from "@/lib/contentService";
import {
  computeHabitatStockAssetKeysForPlaceTypes,
  getSignedApprovedHabitatTileUrlsByAssetKeys,
  listHabitatStockAssets,
} from "@/lib/habitatStockAssetService";
import { getSignedImageUrl, listApprovedCurrentIconicImagesForBirds } from "@/lib/imageService";
import { supabaseServerClient } from "@/lib/supabaseServerClient";
import type { BirdSizeCategory, BirdVisibilityCategory } from "@/types/bird";
import type { PlaceType } from "@/types/place";
import PublicShell from "@/ui/components/PublicShell";
import styles from "./page.module.css";

const SIZE_LABELS: Record<BirdSizeCategory, string> = {
  very_small: "Nagyon kicsi",
  small: "Kicsi",
  medium: "Közepes",
  large: "Nagy",
};

const VISIBILITY_LABELS: Record<BirdVisibilityCategory, string> = {
  common_hu: "Gyakori (HU)",
  localized_hu: "Helyi (HU)",
  seasonal_hu: "Szezonális (HU)",
  rare_hu: "Ritka (HU)",
  not_in_hu: "Nem HU",
};

const COLOR_LABELS: Record<string, string> = {
  white: "Fehér",
  black: "Fekete",
  grey: "Szürke",
  brown: "Barna",
  yellow: "Sárga",
  orange: "Narancs",
  red: "Vörös",
  green: "Zöld",
  blue: "Kék",
};

type PlaceLinkRow = {
  place?: { place_type?: unknown; status?: unknown } | null;
};

export const metadata = {
  title: "Madár — Szárnyfeszítő",
};

export const dynamic = "force-dynamic";

export default async function BirdDetailPage({ params }: { params: { slug: string } }) {
  const bird = await getBirdBySlug(params.slug);
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

  const sizeLabel = bird.size_category ? SIZE_LABELS[bird.size_category] : null;
  const visibilityLabel = bird.visibility_category
    ? VISIBILITY_LABELS[bird.visibility_category]
    : "Ismeretlen";

  return (
    <PublicShell>
      <main className={styles.page}>
        <Link className={styles.backLink} href="/birds">
          ← Vissza a madarakhoz
        </Link>

        <section className={styles.hero}>
          <BirdIcon
            iconicSrc={iconicSrc}
            habitatSrc={habitatSrc}
            showHabitatBackground
            size={168}
            className={styles.heroIcon}
          />
          <div className={styles.heroText}>
            <p className={styles.kicker}>Publikus madárkártya</p>
            <h1 className={styles.title}>{bird.name_hu}</h1>
            <p className={styles.meta}>
              {visibilityLabel}
              {sizeLabel ? ` · ${sizeLabel}` : ""}
              {bird.name_latin ? ` · ${bird.name_latin}` : ""}
            </p>
            <p className={styles.short}>{content.short}</p>
            {bird.color_tags?.length ? (
              <div className={styles.tags}>
                {bird.color_tags.map((tag) => (
                  <span key={tag} className={styles.tag}>
                    {COLOR_LABELS[tag] ?? tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <section className={styles.sections}>
          <article className={`${styles.card} admin-card`}>
            <h2 className={styles.cardTitle}>Hosszabb leírás</h2>
            <p className={styles.cardBody}>{content.long}</p>
          </article>

          {content.feature_block?.length ? (
            <article className={`${styles.card} admin-card`}>
              <h2 className={styles.cardTitle}>Jellemzők</h2>
              <div className={styles.featureGrid}>
                {content.feature_block.map((block) => (
                  <div key={block.heading} className={styles.featureItem}>
                    <p className={styles.featureTitle}>{block.heading}</p>
                    <p className={styles.featureBody}>{block.content}</p>
                  </div>
                ))}
              </div>
            </article>
          ) : null}

        <div className={styles.notes}>
          <article className={`${styles.noteCard} admin-card`}>
            <h3 className={styles.noteTitle}>Tudtad?</h3>
            <p className={styles.noteBody}>{content.did_you_know}</p>
          </article>
          <article className={`${styles.noteCard} admin-card`}>
            <h3 className={styles.noteTitle}>Etikai tipp</h3>
            <p className={styles.noteBody}>{content.ethics_tip}</p>
          </article>
        </div>
        </section>
      </main>
    </PublicShell>
  );
}
