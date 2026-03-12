import Image from "next/image";
import Link from "next/link";
import BirdIcon from "@/components/admin/BirdIcon";
import LandingPlacesMap from "@/components/landing/LandingPlacesMap";
import { getPublicLandingV1 } from "@/lib/landingService";
import styles from "./page.module.css";

export const metadata = {
  title: "Szárnyfeszítő",
  description: "Útikalauz szárnyaló kalandoroknak",
};

export const dynamic = "force-dynamic";

const HERO_INTRO_COPY = `A Szárnyfeszítő azoknak szól, akik szeretnének közelebb kerülni a madarak világához, de nem tudják, hol érdemes elindulni. Helyszínek, fajok és szezonális támpontok segítenek abban, hogy a madármegfigyelés ne távoli hobbinak, hanem átélhető élménynek tűnjön.`;

const WHAT_IS_TITLE = "Mi a Szárnyfeszítő?";
const WHAT_IS_BLOCKS = [
  {
    title: "Belépő a madármegfigyeléshez",
    short: "Kezdőbarát felület, amely segít eligazodni a madárles világának első lépéseiben.",
  },
  {
    title: "Helyszínek és fajok egy helyen",
    short: "Összegyűjtött támpontok arról, hová érdemes menni, és milyen madarakkal találkozhatsz.",
  },
  {
    title: "Élményközpontú felfedezés",
    short: "Nem adatbázis akar lenni, hanem olyan útikalauz, ami közelebb visz a természet valódi megfigyeléséhez.",
  },
] as const;

const MAP_INTRO_TITLE = "Találd meg, merre indulj";
const MAP_INTRO_COPY = `A térkép segít gyorsan átlátni a már elérhető madármegfigyelő helyszíneket, hogy könnyebb legyen kiválasztani a következő úti célt.`;

const MAP_HINT_TITLE = "A jó madárles a helyszínnel kezdődik";
const MAP_HINT_COPY = `Nem kell rögtön mindent tudnod a fajokról vagy az évszakos mintázatokról. Elég egy jó hely, egy kis figyelem, és egy első alkalom, amikor a megfigyelésből élmény lesz.`;

const MIGRATION_COPY = `A madárvonulás az év egyik legizgalmasabb természeti jelensége: tavasszal és ősszel fajok sokasága jelenik meg rövidebb-hosszabb időre olyan helyeken is, ahol máskor nem láthatnánk őket. A Szárnyfeszítő abban segít, hogy tudd, mikor és hol érdemes figyelni ezt a különleges mozgást.`;

const BIRDS_PANEL_COPY = `A madármegfigyelés akkor válik igazán izgalmassá, amikor nemcsak egy-egy fajt látsz, hanem elkezded felismerni a visszatérő mintázatokat is. Az itt kiemelt fajok abban segítenek, hogy lásd: nem minden madár egyformán gyakori, és ez a megfigyelés élményét is teljesen megváltoztatja.`;

const PLACES_PANEL_COPY = `A jó madárleshez a helyszín legalább annyira fontos, mint a türelem. Ezeken a kiemelt helyeken rövid leírást, hangulati képet és néhány jellemző fajt is találsz, hogy könnyebb legyen kiválasztani, merre indulj.`;

const WHO_FOR_TITLE = "Kinek szól a Szárnyfeszítő?";
const WHO_FOR_ITEMS = [
  {
    iconSrc: "/icons/icon_amateur.svg",
    title: "Kezdőknek",
    short: "Akik most ismerkednek a madármegfigyeléssel, és egyszerű, érthető kiindulópontot keresnek.",
  },
  {
    iconSrc: "/icons/icon_photographer.svg",
    title: "Természetfotósoknak",
    short: "Akik nemcsak látni, hanem megörökíteni is szeretnék a helyszínek és fajok különleges pillanatait.",
  },
  {
    iconSrc: "/icons/icon_school.svg",
    title: "Iskoláknak",
    short: "Akik élményszerű, természetközeli módon szeretnék közelebb hozni a diákokhoz a madárvilágot.",
  },
  {
    iconSrc: "/icons/icon_family.svg",
    title: "Családoknak",
    short: "Akik közös kirándulásból szeretnének figyelmesebb, tartalmasabb természeti élményt csinálni.",
  },
] as const;

const HOW_TO_START_TITLE = "Hogyan kezdj bele?";
const HOW_TO_START_STEPS = [
  {
    title: "Válassz egy helyet",
    short: "Indulj egy olyan helyszínnel, amely könnyen elérhető és jó első élményt ígér.",
  },
  {
    title: "Ismerd meg a fajokat",
    short: "Nézd meg, milyen madarakkal találkozhatsz, és milyen időszakban a legizgalmasabb a megfigyelés.",
  },
  {
    title: "Figyelj nyitott szemmel",
    short: "Nem kell rögtön szakértőnek lenned. Az első madárles lényege, hogy észrevedd, mennyi minden történik körülötted.",
  },
] as const;

const CLOSING_CTA_TITLE = "Kezdd el a saját madárles történetedet";
const CLOSING_CTA_COPY =
  "Fedezd fel a helyszíneket, ismerd meg a fajokat, és találd meg, hol induljon az első megfigyelésed.";

export default async function Home() {
  const landing = await getPublicLandingV1();

  return (
    <main className="admin-shell-canvas page-backdrop" aria-label="Szárnyfeszítő landing">
      <div className={`admin-shell ${styles.shell}`}>
        <div className={styles.topbar}>
          <Link className="btn btn--ghost" href="/public">
            Publikus áttekintő
          </Link>
          <Link className="btn btn--accent" href="/admin/login">
            Admin
          </Link>
        </div>

        <section className={`admin-shell__panel ${styles.heroPanel}`} aria-label="Hero">
          <div className={styles.heroInner}>
            <div className={styles.heroMedia}>
              <Image
                src="/logo.svg"
                alt="Szárnyfeszítő"
                width={900}
                height={260}
                priority
                className={styles.logo}
              />
            </div>

            <div className={styles.heroText}>
              <h1 className={styles.heroSubtitle}>Útikalauz szárnyaló kalandoroknak</h1>
              <p className={styles.heroCopy}>{HERO_INTRO_COPY}</p>
              <div className={styles.heroActions}>
                <Link className="btn btn--accent" href="/public">
                  Felfedezés
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className={`admin-card ${styles.landingCard} ${styles.centeredCard}`} aria-label="Mi a Szárnyfeszítő?">
          <h2 className={`admin-heading__title ${styles.sectionTitle}`}>{WHAT_IS_TITLE}</h2>
          <div className={styles.featureGrid} aria-label="Mi a Szárnyfeszítő blocks">
            {WHAT_IS_BLOCKS.map((block) => (
              <div key={block.title} className={styles.featureCard}>
                <p className={styles.featureTitle}>{block.title}</p>
                <p className={styles.featureCopy}>{block.short}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.migrationPanel} aria-label="Madárvonulás panel">
          <p className={styles.migrationCopy}>{MIGRATION_COPY}</p>
        </section>

        <section className={`admin-card ${styles.landingCard} ${styles.centeredCard}`} aria-label="Térkép felvezető">
          <h2 className={`admin-heading__title ${styles.sectionTitle}`}>{MAP_INTRO_TITLE}</h2>
          <p className={styles.sectionCopy}>{MAP_INTRO_COPY}</p>
        </section>

        <section className={`admin-card ${styles.landingCard} ${styles.placesCard}`} aria-label="Térkép">
          <LandingPlacesMap markers={landing.places_map.markers} layers={landing.places_map.layers} />
        </section>

        <section className={styles.splitGrid} aria-label="Spotlight panels">
          <article className={`admin-card ${styles.landingCard} ${styles.centeredCard}`} aria-label="Madarak">
            <h2 className={`admin-heading__title ${styles.sectionTitle}`}>Ismerd meg a madarakat!</h2>
            <p className={styles.sectionCopy}>{BIRDS_PANEL_COPY}</p>

            {landing.featured_birds.length ? (
              <ul className={styles.list} aria-label="Featured birds">
                {landing.featured_birds.map((bird) => (
                  <li key={bird.id} className={styles.birdRow}>
                    <BirdIcon iconicSrc={bird.iconic_src} showHabitatBackground={false} size={56} />
                    <div>
                      <p className={styles.birdName}>{bird.name_hu}</p>
                      <p className={styles.birdMeta}>{bird.visibility_label_hu}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="admin-note-small">Még nincs publikált madár a listához.</p>
            )}

            <div className={styles.cardActions}>
              <Link className="btn btn--ghost" href="/birds">
                Többi madár
              </Link>
            </div>
          </article>

          <article className={`admin-card ${styles.landingCard} ${styles.centeredCard}`} aria-label="Helyszínek">
            <h2 className={`admin-heading__title ${styles.sectionTitle}`}>{MAP_HINT_TITLE}</h2>
            <p className={styles.sectionCopy}>{MAP_HINT_COPY}</p>

            {landing.spotlight_places.length ? (
              <div className={styles.placeGrid} aria-label="Spotlight places">
                {landing.spotlight_places.map((place) => (
                  <section key={place.id} className={styles.placeCard} aria-label={place.name}>
                    {place.hero_image_src ? (
                      <img src={place.hero_image_src} alt="" className={styles.placeHero} />
                    ) : (
                      <div className={styles.placeHero} aria-label="No hero image" />
                    )}
                    <div className={styles.placeBody}>
                      <h3 className={styles.placeName}>{place.name}</h3>
                      {place.short ? <p className={styles.placeShort}>{place.short}</p> : null}
                      {place.birds.length ? (
                        <div className={styles.placeBirdIcons} aria-label="Place birds">
                          {place.birds.slice(0, 5).map((bird) => (
                            <BirdIcon key={bird.id} iconicSrc={bird.iconic_src} showHabitatBackground={false} size={40} />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <p className="admin-note-small">Még nincs publikált helyszín a listához.</p>
            )}

            <div className={styles.cardActions}>
              <Link className="btn btn--ghost" href="/places/list">
                Többi helyszín
              </Link>
            </div>
          </article>
        </section>

        <section className={`admin-card ${styles.landingCard} ${styles.centeredCard}`} aria-label="Kinek szól?">
          <h2 className={`admin-heading__title ${styles.sectionTitle}`}>{WHO_FOR_TITLE}</h2>
          <div className={styles.whoForGrid} aria-label="Kinek szól grid">
            {WHO_FOR_ITEMS.map((item) => (
              <div key={item.title} className={styles.whoForCard}>
                <Image src={item.iconSrc} alt="" width={64} height={64} className={styles.whoForIcon} />
                <p className={styles.whoForTitle}>{item.title}</p>
                <p className={styles.whoForCopy}>{item.short}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={`admin-card ${styles.landingCard} ${styles.centeredCard}`} aria-label="Hogyan kezdj bele?">
          <h2 className={`admin-heading__title ${styles.sectionTitle}`}>{HOW_TO_START_TITLE}</h2>
          <div className={styles.stepsGrid} aria-label="Hogyan kezdj bele steps">
            {HOW_TO_START_STEPS.map((step, idx) => (
              <div key={step.title} className={styles.stepCard}>
                <p className={styles.stepIndex}>{idx + 1}.</p>
                <p className={styles.stepTitle}>{step.title}</p>
                <p className={styles.stepCopy}>{step.short}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={`admin-card ${styles.landingCard} ${styles.closingCta}`} aria-label="Záró CTA">
          <h2 className={`admin-heading__title ${styles.sectionTitle}`}>{CLOSING_CTA_TITLE}</h2>
          <p className={styles.sectionCopy}>{CLOSING_CTA_COPY}</p>
          <div className={styles.closingActions}>
            <Link className="btn btn--accent" href="/public">
              Felfedezés
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
