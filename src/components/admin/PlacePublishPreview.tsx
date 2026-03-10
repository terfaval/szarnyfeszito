import Link from "next/link";
import Image from "next/image";
import type { Place } from "@/types/place";
import type { PlaceUiVariantsV1 } from "@/lib/placeContentSchema";
import type { SeasonKey } from "@/lib/season";
import BirdIcon from "@/components/admin/BirdIcon";
import PlacePublishHeroMap from "@/components/admin/PlacePublishHeroMap";
import { Card } from "@/ui/components/Card";
import styles from "./PlacePublishPreview.module.css";

type PlacePublishBird = {
  id: string;
  slug: string;
  name_hu: string;
  iconicSrc: string | null;
  rank: number;
};

const SEASON_LABEL_HU: Record<SeasonKey, string> = {
  spring: "Tavasz",
  summer: "Nyár",
  autumn: "Ősz",
  winter: "Tél",
};

function nonEmpty(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

export default function PlacePublishPreview({
  place,
  marker,
  content,
  currentSeason,
  birds,
  showSeasonal,
}: {
  place: Place;
  marker: { lat: number | null; lng: number | null } | null;
  content: PlaceUiVariantsV1 | null;
  currentSeason: SeasonKey;
  birds: PlacePublishBird[];
  showSeasonal: boolean;
}) {
  const variants = content?.variants ?? null;
  const seasonalText = variants?.seasonal_snippet?.[currentSeason] ?? "";
  const seasonLabel = SEASON_LABEL_HU[currentSeason];

  const hasExtras =
    !!variants &&
    (nonEmpty(variants.who_is_it_for) || nonEmpty(variants.when_to_go) || nonEmpty(variants.practical_tip));
  const hasDidYouKnow = !!variants && nonEmpty(variants.did_you_know);
  const hasNearbyProtection = !!variants && nonEmpty(variants.nearby_protection_context);

  return (
    <section className={styles.previewRoot} aria-label="Place publish preview">
      <header className="admin-heading">
        <p className="admin-heading__label">Preview</p>
        <h2 className="admin-heading__title admin-heading__title--large">Place card</h2>
        <p className="admin-heading__description">
          What the public panel will primarily render (UI variants contract), plus the currently linked birds.
        </p>
      </header>

      <Card className="stack">
        <header className={styles.placeHeader}>
          <p className={styles.placeMetaLine}>
            {place.place_type}
            {place.county ? ` · ${place.county}` : ""}
            {place.nearest_city ? ` · ${place.nearest_city}` : ""}
          </p>
          <h3 className={styles.placeName}>{place.name || place.slug || "Untitled place"}</h3>
          {variants && nonEmpty(variants.teaser) ? <p className={styles.teaser}>{variants.teaser}</p> : null}
        </header>

        {variants ? (
          <>
            {nonEmpty(variants.short) ? (
              <p className={styles.copyBlock}>{variants.short}</p>
            ) : (
              <p className="admin-note-small">No approved `variants.short` yet.</p>
            )}

            <div className={styles.heroMap}>
              {place.location_precision === "hidden" ? (
                <div className="admin-panel admin-panel--muted">
                  <p className="admin-note-small">Location is hidden for this place.</p>
                </div>
              ) : (
                <PlacePublishHeroMap
                  lat={marker?.lat ?? null}
                  lng={marker?.lng ?? null}
                  label={place.name || place.slug || "Place"}
                />
              )}
            </div>

            {nonEmpty(variants.long) ? (
              <details className={styles.details} open>
                <summary className={styles.detailsSummary}>Hosszabb leírás</summary>
                <div className="stack" style={{ marginTop: "0.8rem" }}>
                  <p className={styles.copyBlock}>{variants.long}</p>
                  {nonEmpty(variants.ethics_tip) ? (
                    <div className={styles.highlightBox}>
                      <p className={styles.highlightTitle}>Etika</p>
                      <p className={styles.copyBlock} style={{ marginTop: "0.5rem" }}>
                        {variants.ethics_tip}
                      </p>
                    </div>
                  ) : null}
                </div>
              </details>
            ) : nonEmpty(variants.ethics_tip) ? (
              <div className={styles.highlightBox}>
                <p className={styles.highlightTitle}>Etika</p>
                <p className={styles.copyBlock} style={{ marginTop: "0.5rem" }}>
                  {variants.ethics_tip}
                </p>
              </div>
            ) : null}

            {showSeasonal ? (
              <div className="stack">
                {nonEmpty(seasonalText) ? (
                  <p className={styles.seasonalSnippet} aria-label={`Seasonal snippet for ${seasonLabel}`}>
                    {seasonalText}
                  </p>
                ) : (
                  <p className="admin-note-small">No approved seasonal snippet for {seasonLabel} yet.</p>
                )}

                {birds.length ? (
                  <div className={styles.birdRow} aria-label="Linked birds">
                    {birds.map((bird) => (
                      <Link
                        key={bird.id}
                        href={`/admin/birds/${bird.id}`}
                        className={styles.birdLink}
                        aria-label={`Open bird: ${bird.name_hu}`}
                        title={bird.name_hu}
                      >
                        <BirdIcon iconicSrc={bird.iconicSrc} showHabitatBackground={false} size={44} />
                        <span className={styles.birdName}>{bird.name_hu}</span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="admin-note-small">No published birds linked to this place for {seasonLabel}.</p>
                )}
              </div>
            ) : null}

            {hasExtras ? (
              <div className={styles.extrasGrid} aria-label="Extras">
                {nonEmpty(variants.who_is_it_for) ? (
                  <div className="admin-panel">
                    <p className="admin-subheading">Kinek való?</p>
                    <p className={styles.copyBlock}>{variants.who_is_it_for}</p>
                  </div>
                ) : null}
                {nonEmpty(variants.when_to_go) ? (
                  <div className="admin-panel">
                    <p className="admin-subheading">Mikor menj?</p>
                    <p className={styles.copyBlock}>{variants.when_to_go}</p>
                  </div>
                ) : null}
                {nonEmpty(variants.practical_tip) ? (
                  <div className="admin-panel">
                    <p className="admin-subheading">Gyakorlati tipp</p>
                    <p className={styles.copyBlock}>{variants.practical_tip}</p>
                  </div>
                ) : null}
              </div>
            ) : null}

            {hasDidYouKnow ? (
              <div className={styles.didYouKnowCard} aria-label="Tudtad-e">
                <Image
                  src="/icon_didyouknow.svg"
                  alt=""
                  aria-hidden="true"
                  className={styles.didYouKnowIcon}
                  width={44}
                  height={44}
                />
                <p className={styles.didYouKnowText}>{variants.did_you_know}</p>
              </div>
            ) : null}

            {hasNearbyProtection ? (
              <div className="admin-panel" aria-label="Helyi védelmi szervezetek és programok">
                <p className="admin-subheading">Helyi védelem</p>
                <p className={styles.copyBlock}>{variants.nearby_protection_context}</p>
              </div>
            ) : null}
          </>
        ) : (
          <div className="admin-panel admin-panel--muted">
            <p className="admin-note-small">
              No approved content block yet. Approve Place UI variants first, then return here to preview.
            </p>
          </div>
        )}
      </Card>
    </section>
  );
}

