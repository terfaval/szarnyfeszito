import BirdIcon from "@/components/admin/BirdIcon";
import type { BirdColorTag, BirdSizeCategory, BirdVisibilityCategory } from "@/types/bird";
import styles from "./BirdCard.module.css";

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

const COLOR_LABELS: Record<BirdColorTag, string> = {
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

type BirdCardProps = {
  bird: {
    name_hu: string;
    name_latin: string | null;
    size_category: BirdSizeCategory | null;
    visibility_category: BirdVisibilityCategory | null;
    color_tags: BirdColorTag[] | null;
  };
  content: {
    short: string;
    long: string;
    feature_block?: Array<{ heading: string; content: string }>;
    did_you_know: string;
    ethics_tip: string;
  };
  iconicSrc?: string | null;
  habitatSrc?: string | null;
};

export default function BirdCard({ bird, content, iconicSrc, habitatSrc }: BirdCardProps) {
  const sizeLabel = bird.size_category ? SIZE_LABELS[bird.size_category] : null;
  const visibilityLabel = bird.visibility_category ? VISIBILITY_LABELS[bird.visibility_category] : "Ismeretlen";

  return (
    <article className={`admin-card ${styles.root}`} aria-label="Bird card">
      <section className={styles.hero}>
        <BirdIcon iconicSrc={iconicSrc} habitatSrc={habitatSrc} showHabitatBackground size={168} />
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
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Hosszabb leírás</h2>
          <p className={styles.cardBody}>{content.long}</p>
        </section>

        {content.feature_block?.length ? (
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Jellemzők</h2>
            <div className={styles.featureGrid}>
              {content.feature_block.map((block) => (
                <div key={block.heading} className={styles.featureItem}>
                  <p className={styles.featureTitle}>{block.heading}</p>
                  <p className={styles.featureBody}>{block.content}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <div className={styles.notes}>
          <section className={styles.noteCard}>
            <h3 className={styles.noteTitle}>Tudtad?</h3>
            <p className={styles.noteBody}>{content.did_you_know}</p>
          </section>
          <section className={styles.noteCard}>
            <h3 className={styles.noteTitle}>Etikai tipp</h3>
            <p className={styles.noteBody}>{content.ethics_tip}</p>
          </section>
        </div>
      </section>
    </article>
  );
}

