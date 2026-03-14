import Link from "next/link";
import PublicShell from "@/ui/components/PublicShell";
import { Card } from "@/ui/components/Card";
import DashboardPlacesMap from "@/components/shared/DashboardPlacesMap";
import BirdIcon from "@/components/shared/BirdIcon";
import { getPublicDashboardV1, PUBLIC_DASHBOARD_SPOTLIGHT_GROUPS_V1 } from "@/lib/publicDashboardService";

export const metadata = {
  title: "Szárnyfeszítő — Publikus áttekintő",
  description: "Publikus áttekintő és gyors felfedezés",
};

export const revalidate = 120;


const SPOTLIGHT_PLACE_LIMIT = 2;


export default async function PublicHomePage() {
  const dashboard = await getPublicDashboardV1();
  const spotlightGroups = PUBLIC_DASHBOARD_SPOTLIGHT_GROUPS_V1;
  const recentBirds = dashboard.recentBirds;
  const currentSeasonLabel = dashboard.currentSeasonLabelHu;
  const spotlightGroupHabitatTiles = dashboard.spotlightGroupHabitatTiles;

  return (
    <PublicShell>
      <section className="admin-stack">
        <DashboardPlacesMap
          markers={dashboard.placesMap.markers}
          layers={dashboard.placesMap.layers}
          detailApiBasePath="/api/public/dashboard/places"
          birdLinkBasePath="/birds"
          birdLinkKey="id"
          birdsIndexHref="/birds"
          placeLinkBasePath="/places?place="
          placeLinkJoiner=""
          placeLinkKey="slug"
        />

        <Card className="stack">
          <header className="admin-heading">
            <p className="admin-heading__label">Helyszínek</p>
            <h2 className="admin-heading__title admin-heading__title--large">Élőhely spotlights</h2>
            <p className="admin-heading__description">
              {currentSeasonLabel} időszakban megfigyelhető madarak publikált helyszínek alapján.
            </p>
          </header>

          <div className="grid gap-4 md:grid-cols-3">
            {spotlightGroups.map((group) => {
              const allowedPlaceTypes = new Set(group.placeTypes);
              const birdsForGroup = (dashboard.spotlightBirdsByGroup[group.key] ?? []).filter((bird) =>
                bird.places.some((place) => allowedPlaceTypes.has(place.place_type))
              );
              const habitatAsset = spotlightGroupHabitatTiles[group.key] ?? null;

              return (
                <div key={group.key} className="admin-stat-card">
                  <p className="admin-stat-label">{group.label}</p>
                  {birdsForGroup.length ? (
                    <div className="dashboard-spotlight-birds mt-3">
                      {birdsForGroup.map((bird) => {
                        const columnPlaces = bird.places.filter((place) =>
                          allowedPlaceTypes.has(place.place_type)
                        );
                        const visiblePlaces = columnPlaces.slice(0, SPOTLIGHT_PLACE_LIMIT);
                        return (
                          <div key={bird.id} className="dashboard-spotlight-bird">
                            <BirdIcon
                              habitatSrc={habitatAsset ?? bird.habitatIconSrc}
                              iconicSrc={null}
                              size={64}
                              className="dashboard-spotlight-bird-icon"
                            />
                            <div className="dashboard-spotlight-bird-body">
                              <Link href={`/birds/${bird.id}`} className="dashboard-spotlight-bird-name">
                                {bird.name_hu}
                              </Link>
                              <div className="dashboard-spotlight-places-row">
                                {visiblePlaces.map((place, index) => (
                                  <span
                                    key={place.id}
                                    className="dashboard-spotlight-place-text"
                                    aria-label={`Helyszín: ${place.name}`}
                                  >
                                    <Link
                                      href={`/places?place=${place.slug}`}
                                      className="dashboard-spotlight-place-link"
                                    >
                                      {place.name}
                                    </Link>
                                    {index < visiblePlaces.length - 1 && (
                                      <span className="dashboard-spotlight-place-separator" aria-hidden="true">
                                        &middot;
                                      </span>
                                    )}
                                  </span>
                                ))}
                                {columnPlaces.length > SPOTLIGHT_PLACE_LIMIT ? (
                                  <span className="dashboard-spotlight-place-ellipsis">…</span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="admin-stat-note mt-3">Még nincs elérhető lista.</p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="stack">
          <header className="admin-heading">
            <p className="admin-heading__label">Felfedezés</p>
            <h2 className="admin-heading__title admin-heading__title--large">Kezdd itt</h2>
            <p className="admin-heading__description">
              Válassz madarat vagy helyszínt, és indulhat a megfigyelés.
            </p>
          </header>

          <div className="grid gap-4 md:grid-cols-2">
            <Link className="admin-link-card stack" href="/birds">
              <p className="admin-link-card__title">Madarak</p>
              <p className="admin-link-card__description">Publikált fajok, szűrőkkel és élőhely háttérrel.</p>
            </Link>

            <Link className="admin-link-card stack" href="/places/list">
              <p className="admin-link-card__title">Helyszínek</p>
              <p className="admin-link-card__description">Publikált helyszínek grides nézetben.</p>
            </Link>
          </div>
        </Card>

        <Card className="stack">
          <header className="admin-heading inline-flex items-start justify-between gap-3">
            <div>
              <p className="admin-heading__label">Madarak</p>
              <h2 className="admin-heading__title admin-heading__title--large">Friss publikált fajok</h2>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <Link className="admin-nav-link" href="/birds">
                Összes madár
              </Link>
            </div>
          </header>

          <div className="space-y-3">
            {recentBirds.length === 0 && <p className="admin-stat-note">Még nincs publikált madár.</p>}

            {recentBirds.map((bird) => (
              <Link key={bird.id} href={`/birds/${bird.id}`} className="admin-list-link">
                <div className="admin-list-details">
                  <div className="admin-bird-list-grid">
                    <BirdIcon
                      habitatSrc={
                        dashboard.habitatTilesByKey[bird.habitat_stock_asset_keys?.[0] ?? ""] ?? null
                      }
                      iconicSrc={dashboard.iconicPreviewByBirdId[bird.id] ?? null}
                      showHabitatBackground
                      size={76}
                    />
                    <div className="admin-bird-text-cell">
                      <p className="admin-list-title">{bird.name_hu}</p>
                      <p className="admin-list-meta">{bird.slug}</p>
                      <p className="admin-list-date">
                        Frissítve{" "}
                        {new Intl.DateTimeFormat("hu-HU", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(bird.updated_at))}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="admin-inline-actions">
                  <span className="admin-list-action">Megnyitás</span>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </section>
    </PublicShell>
  );
}
