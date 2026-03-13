"use client";

import { Card } from "@/ui/components/Card";
import type { BirdDossier, BirdDossierSizeRange } from "@/types/dossier";
import styles from "@/components/shared/BirdDossierCard.module.css";

export type BirdDossierCardProps = {
  dossier: BirdDossier;
  mainHabitatSrc: string | null;
  flightSrc: string | null;
  nestingSrc: string | null;
  sexPairSrc: string | null;
  habitats?: Array<{
    key: string;
    label_hu: string;
    src: string | null;
  }>;
  reviewComment?: string | null;
  reviewRequestedAt?: string | null;
  className?: string;
};

function renderNullableValue(value: string | null | undefined) {
  return value && value.trim().length > 0 ? value : "—";
}

function formatRange(range: BirdDossierSizeRange, unit?: string) {
  const min = typeof range?.min === "number" ? range.min : null;
  const max = typeof range?.max === "number" ? range.max : null;
  const suffix = unit ? ` ${unit}` : "";
  if (min != null && max != null) return `${min}–${max}${suffix}`;
  if (min != null) return `${min}+${suffix}`;
  if (max != null) return `≤${max}${suffix}`;
  return "—";
}

function formatBoolean(value: boolean | null | undefined) {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "—";
}

export default function BirdDossierCard({
  dossier,
  mainHabitatSrc,
  flightSrc,
  nestingSrc,
  sexPairSrc,
  habitats,
  reviewComment,
  reviewRequestedAt,
  className,
}: BirdDossierCardProps) {
  const paragraphs = dossier.long_paragraphs ?? [];
  const paragraph1 = paragraphs[0] ?? "Awaiting generated paragraph.";
  const paragraph2 = paragraphs[1] ?? "Awaiting generated paragraph.";

  const physicalPills: { label: string; value: string }[] = [
    { label: "IUCN", value: dossier.distribution.iucn_status ?? "Unknown" },
    { label: "Lifespan", value: formatRange(dossier.pill_meta.lifespan_years, "év") },
    { label: "Size", value: formatRange(dossier.pill_meta.size_cm) },
    { label: "Wingspan", value: formatRange(dossier.pill_meta.wingspan_cm) },
  ];

  const dietPills: { label: string; value: string }[] = [
    { label: "Diet", value: dossier.pill_meta.diet_short || "Pending" },
  ];

  const sexComparisonApproved = dossier.sex_comparison?.review_status === "approved";
  const shortSummary = dossier.header.short_summary || "The summary will populate once the dossier is generated.";

  return (
    <Card className={[styles.dossierCard, className ?? ""].filter(Boolean).join(" ")}>
      <header className={`${styles.header} ${styles.headerFullWidth}`}>
        <div className={styles.headerMain}>
          <div className={styles.headerMainTop}>
            <div className={styles.headerTitleBlock}>
              <h1 className={styles.birdTitle}>{dossier.header.name_hu}</h1>
              <p className={styles.subtitle}>{dossier.header.subtitle}</p>
            </div>
            {habitats?.length ? (
              <div className={styles.habitatsRow} aria-label="Élőhelyek">
                {habitats.map((habitat) => (
                  <div key={habitat.key} className={styles.habitatItem}>
                    <div className={styles.habitatSquare} aria-hidden="true">
                      {habitat.src ? (
                        <img src={habitat.src} alt="" className={styles.habitatSquareImg} />
                      ) : (
                        <div className={styles.habitatSquareFallback} />
                      )}
                    </div>
                    <p className={styles.habitatLabel}>{habitat.label_hu}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className={`${styles.layerStack} ${styles.layerStackPublish}`}>
        <div className={styles.backgroundLayer}>
          <div className={styles.mainImageFrame}>
            {mainHabitatSrc ? (
              <div className={`${styles.fullBodyImage} ${styles.fullBodyImagePublish}`}>
                <img src={mainHabitatSrc} alt="Main bird image" className={styles.fullBodyImageImg} />
              </div>
            ) : (
              <div className={`${styles.fullBodyPlaceholder} ${styles.fullBodyPlaceholderPublish}`}>
                <p>Main bird image</p>
              </div>
            )}
          </div>
        </div>

        <div className={styles.overlayLayer}>
          {dossier.identification.key_features.map((feature, index) => (
            <article key={`${feature.title}-${index}`} className={styles.overlayItem}>
              <div className={styles.overlayHeading}>
                <h3 className={styles.overlayTitle}>{feature.title}</h3>
              </div>
              <p className={styles.overlayDescription}>{feature.description}</p>
            </article>
          ))}
        </div>
      </div>

      <div className={styles.warmHighlight} aria-label="Summary highlight">
        {shortSummary}
      </div>

      <div className={styles.mediaRow}>
        <article className={styles.migrationColumn}>
          <p className={styles.sectionLabel}>Male vs female</p>

          {sexComparisonApproved ? (
            <>
              <div className={styles.migrationList}>
                {dossier.sex_comparison!.key_differences.map((diff, idx) => (
                  <div key={`${idx}-${diff}`} className={styles.migrationItem}>
                    <span>{diff}</span>
                  </div>
                ))}
              </div>

              <p className={styles.migrationNote} style={{ whiteSpace: "pre-wrap" }}>
                {dossier.sex_comparison!.summary}
              </p>
            </>
          ) : (
            <>
              <p className={styles.migrationNote}>Missing approved sex comparison.</p>
            </>
          )}
        </article>

        <div className={styles.flightColumn}>
          <div className={styles.imageFrameLarge}>
            {sexPairSrc ? (
              <img
                src={sexPairSrc}
                alt="Male + female duo illustration"
                className={styles.imageFrameImageContain}
              />
            ) : (
              <div className={styles.imageFramePlaceholder}>
                <p>No approved duo image yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.statPillsBelow}>
        <div className={styles.statPills}>
          <div className={styles.statRow}>
            {physicalPills.map((item) => (
              <div key={item.label} className={styles.statPill}>
                <span className={styles.statLabel}>{item.label}</span>
                <span className={styles.statValue}>{item.value}</span>
              </div>
            ))}
          </div>
          <div className={`${styles.statRow} ${styles.statRowDiet}`}>
            {dietPills.map((item) => (
              <div key={item.label} className={styles.statPill}>
                <span className={styles.statLabel}>{item.label}</span>
                <span className={styles.statValue}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.taxonomyParagraphRow}>
        <article className={styles.taxonomyColumn}>
          <p className={styles.sectionLabel}>Taxonomy</p>
          <div className={styles.taxonomyList}>
            {[
              ["Order", dossier.distribution.taxonomy.order],
              ["Family", dossier.distribution.taxonomy.family],
              ["Genus", dossier.distribution.taxonomy.genus],
              ["Species", dossier.distribution.taxonomy.species],
            ].map(([label, value]) => (
              <div key={label} className={styles.taxonomyLine}>
                <span>{label}</span>
                <span>{renderNullableValue(value as string | null | undefined)}</span>
              </div>
            ))}
          </div>
        </article>

        <article className={styles.paragraphColumn}>
          <div>
            <p className={styles.sectionLabel}>Paragraph 1</p>
          </div>
          <p className={styles.paragraphText}>{paragraph1}</p>
        </article>
      </div>

      <div className={styles.funFactGrid}>
        <article className={styles.funFactCard}>
          <div className={styles.cardHeader}>
            <p className={styles.sectionLabel}>Fun fact</p>
          </div>
          <p className={styles.cardText}>{dossier.fun_fact ?? "Fun fact pending generation."}</p>
        </article>

        <article className={styles.funFactCard}>
          <div className={styles.cardHeader}>
            <p className={styles.sectionLabel}>Typical places</p>
          </div>
          <ul className={styles.typicalPlacesList}>
            {dossier.typical_places.map((place, index) => (
              <li key={`${place}-${index}`}>{place}</li>
            ))}
          </ul>
        </article>

        <article className={styles.funFactCard}>
          <div className={styles.cardHeader}>
            <p className={styles.sectionLabel}>Ethics tip</p>
          </div>
          <p className={styles.cardText}>{dossier.ethics_tip ?? "Offer a stewardship reminder."}</p>
        </article>
      </div>

      <div className={styles.mediaRow}>
        <div className={styles.flightColumn}>
          <div className={styles.imageFrameLarge}>
            {flightSrc ? (
              <img
                src={flightSrc}
                alt="Scientific flight illustration"
                className={styles.imageFrameImageContain}
              />
            ) : (
              <div className={styles.imageFramePlaceholder}>
                <p>Scientific (flight_clean)</p>
              </div>
            )}
          </div>
        </div>
        <article className={styles.migrationColumn}>
          <p className={styles.sectionLabel}>Migration</p>
          <div className={styles.migrationList}>
            <div className={styles.migrationItem}>
              <span>Is migratory</span>
              <span>{formatBoolean(dossier.migration.is_migratory)}</span>
            </div>
            <div className={styles.migrationItem}>
              <span>Timing</span>
              <span>{renderNullableValue(dossier.migration.timing)}</span>
            </div>
            <div className={styles.migrationItem}>
              <span>Route</span>
              <span>{renderNullableValue(dossier.migration.route)}</span>
            </div>
          </div>
          <p className={styles.migrationNote}>{dossier.migration.migration_note}</p>
        </article>
      </div>

      <p className={styles.warmHighlight} aria-label="Bridge paragraph">
        {paragraph2}
      </p>

      <div className={styles.nestingBlock}>
        <div className={styles.nestingText}>
          <p className={styles.sectionLabel}>Nesting</p>
          <div className={styles.nestingList}>
            <div className={styles.nestingLine}>
              <span>Type</span>
              <span>{renderNullableValue(dossier.nesting.nesting_type)}</span>
            </div>
            <div className={styles.nestingLine}>
              <span>Site</span>
              <span>{renderNullableValue(dossier.nesting.nest_site)}</span>
            </div>
            <div className={styles.nestingLine}>
              <span>Season</span>
              <span>{renderNullableValue(dossier.nesting.breeding_season)}</span>
            </div>
            <div className={styles.nestingLine}>
              <span>Clutch</span>
              <span>{renderNullableValue(dossier.nesting.clutch_or_chicks_count)}</span>
            </div>
          </div>
          <p className={styles.nestingNote}>{dossier.nesting.nesting_note}</p>
        </div>
        <div className={styles.nestingImage}>
          <div className={styles.imageFrame}>
            {nestingSrc ? (
              <img
                src={nestingSrc}
                alt="Scientific nesting illustration"
                className={styles.imageFrameImageContain}
              />
            ) : (
              <div className={styles.imageFramePlaceholder}>
                <p>Scientific (nesting_clean)</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {reviewComment ? (
        <blockquote className="admin-review-note">
          <p className="admin-subheading">Last review note</p>
          <p className="mt-1 text-sm font-semibold">{reviewComment}</p>
          {reviewRequestedAt ? (
            <p className="text-xs admin-text-muted">
              Requested on{" "}
              <time dateTime={reviewRequestedAt} suppressHydrationWarning>
                {new Date(reviewRequestedAt).toLocaleString("hu-HU", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "Europe/Budapest",
                })}
              </time>
            </p>
          ) : null}
        </blockquote>
      ) : null}
    </Card>
  );
}
