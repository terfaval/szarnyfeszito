import Image from "next/image";
import Link from "next/link";
import BirdIcon from "@/components/admin/BirdIcon";
import LandingPlacesMap from "@/components/landing/LandingPlacesMap";
import { getPublicLandingV1 } from "@/lib/landingService";
import styles from "./page.module.css";

export const metadata = {
  title: "Szárnyfeszítő",
  description: "Útikalaúz szárnyaló kalandoroknak",
};

export const dynamic = "force-dynamic";

const HERO_COPY = `A Szárnyfeszítő azoknak szól, akik valaha is elgondolkodtak azon, hogy miért csinálnak a madarak ekkora felhajtást, amikor nekivágnak az égboltnak, és hogyan lehetne ezt a szárnyas kavalkádot minél közelebbről meglesni. Itt mindent megtalálsz, amire szükséged lehet ahhoz, hogy ne csak állj a mező szélén zavartan pislogva, hanem valódi madárlesőként vágj bele az élménybe. Célunk, hogy összegyűjtsük neked az összes hasznos és izgalmas tudnivalót, hogy a madarak világa ne csak valami messzi titok maradjon, hanem egy felfedezésre váró, nyüzsgő világ, ahol mindig történik valami lenyűgöző.`;

const MIGRATION_COPY = `Fedezd fel a madárvonulás csodálatos világát! A madarak évente kétszer, ősszel és tavasszal is megkezdik vándorútjukat, hogy elérjék melegebb éghajlatukat vagy visszatérjenek fészkelőhelyeikhez. Ez a természet lenyűgöző jelensége nemcsak a biológusok, hanem a természetkedvelők számára is izgalmas esemény, ahol a különböző fajok csodálatos látványával találkozhatunk. Itt összegyűjtöttük a legfontosabb madárvonulásokat és információkat a megfigyelésükről, hogy te is részese lehess ennek a felejthetetlen élménynek. Készülj fel, és indulj el a madarak varázslatos útjára!`;

const BIRDS_PANEL_COPY = `A madárvilág akkor igazán izgalmas, ha nem csak “madarat látsz”, hanem elkezded észrevenni a mintákat: melyik faj mennyire gyakori, mikor bukkan fel, és miért pont ott. Ebben a panelben öt, már publikált fajt mutatunk – úgy válogatva, hogy különböző “gyakoriságú” madarak is felbukkanjanak.`;

const PLACES_PANEL_COPY = `A jó madárles nem csak szerencse kérdése: a helyszín számít. A Helyszínek panelben három, már publikált úti célt ajánlunk, a hozzájuk tartozó rövid leírással és néhány olyan madárral, amelyeket ott jó eséllyel megfigyelhetsz.`;

export default async function Home() {
  const landing = await getPublicLandingV1();

  return (
    <main className="admin-shell-canvas page-backdrop" aria-label="Szárnyfeszítő landing">
      <div className={`admin-shell ${styles.shell}`}>
        <div className={styles.topbar}>
          <Link className="btn btn--accent" href="/admin/login">
            Admin
          </Link>
        </div>

        <section className={`admin-shell__panel ${styles.heroPanel}`} aria-label="Hero">
          <div className={styles.heroInner}>
            <div className={styles.logoWrap}>
              <Image
                src="/logo.svg"
                alt="Szárnyfeszítő"
                width={900}
                height={260}
                priority
                className={styles.logo}
              />
            </div>

            <div className="stack">
              <h1 className={styles.heroTitle}>Szárnyfeszítő</h1>
              <p className={styles.heroSubtitle}>Útikalaúz szárnyaló kalandoroknak</p>
              <p className={styles.heroCopy}>{HERO_COPY}</p>
            </div>
          </div>
        </section>

        <section className="admin-card" aria-label="Madárvonulások">
          <h2 className={styles.sectionTitle}>Madárvonulások</h2>
          <p className={styles.sectionCopy}>{MIGRATION_COPY}</p>
        </section>

        <section className="admin-card" aria-label="Places map">
          <h2 className={styles.sectionTitle}>Helyszínek térképen</h2>
          <p className={styles.sectionCopy}>
            Egy gyors térképes előnézet a publikált helyszínekről – hogy lásd, merre érdemes elindulni.
          </p>
          <div className={styles.mapBlock}>
            <LandingPlacesMap markers={landing.places_map.markers} layers={landing.places_map.layers} />
          </div>
        </section>

        <section className={styles.splitGrid} aria-label="Spotlight panels">
          <article className="admin-card" aria-label="Madarak">
            <h2 className={styles.sectionTitle}>Madarak</h2>
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
          </article>

          <article className="admin-card" aria-label="Helyszínek">
            <h2 className={styles.sectionTitle}>Helyszínek</h2>
            <p className={styles.sectionCopy}>{PLACES_PANEL_COPY}</p>

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
                      {place.teaser ? <p className={styles.placeTeaser}>{place.teaser}</p> : null}
                      {place.short ? <p className={styles.placeShort}>{place.short}</p> : null}
                      {place.birds.length ? (
                        <div className={styles.placeBirdIcons} aria-label="Place birds">
                          {place.birds.slice(0, 5).map((bird) => (
                            <BirdIcon
                              key={bird.id}
                              iconicSrc={bird.iconic_src}
                              showHabitatBackground={false}
                              size={40}
                            />
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
          </article>
        </section>
      </div>
    </main>
  );
}
