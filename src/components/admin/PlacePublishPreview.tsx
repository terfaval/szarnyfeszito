import Link from "next/link";
import type { Place } from "@/types/place";
import type { PlaceUiVariantsV1 } from "@/lib/placeContentSchema";
import type { SeasonKey } from "@/lib/season";
import BirdIcon from "@/components/admin/BirdIcon";
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
  content,
  currentSeason,
  birds,
}: {
  place: Place;
  content: PlaceUiVariantsV1 | null;
  currentSeason: SeasonKey;
  birds: PlacePublishBird[];
}) {
  const variants = content?.variants ?? null;
  const seasonalText = variants?.seasonal_snippet?.[currentSeason] ?? "";
  const seasonLabel = SEASON_LABEL_HU[currentSeason];

  const extras = variants
    ? ([
        ["when_to_go", "Mikor menj?"],
        ["practical_tip", "Gyakorlati tipp"],
        ["did_you_know", "Tudtad?"],
        ["who_is_it_for", "Kinek való?"],
        ["nearby_protection_context", "Védelem a közelben"],
      ] as const).filter(([key]) => nonEmpty(variants[key]))
    : [];

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

            {nonEmpty(variants.long) ? (
              <details className={styles.details}>
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

            <div className="stack">
              <p className="admin-subheading">Seasonal snippet · {seasonLabel}</p>
              {nonEmpty(seasonalText) ? (
                <p className={styles.copyBlock}>{seasonalText}</p>
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
                <p className="admin-note-small">No published birds linked to this place yet.</p>
              )}
            </div>

            {extras.length ? (
              <div className="stack">
                <p className="admin-subheading">Extras</p>
                <div className="admin-stat-grid">
                  {extras.map(([key, label]) => (
                    <div key={key} className="admin-panel">
                      <p className="admin-subheading">{label}</p>
                      <p className={styles.copyBlock}>{variants[key]}</p>
                    </div>
                  ))}
                </div>
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

