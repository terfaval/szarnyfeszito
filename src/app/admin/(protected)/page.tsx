import Link from "next/link";
import { getAdminUserFromCookies } from "@/lib/auth";
import { listBirds } from "@/lib/birdService";
import { listPlaces, listPublishedPlaceDashboardMarkers, listPublishedPlacesByPrimaryType } from "@/lib/placeService";
import { listLatestDossierBlocksForBirds } from "@/lib/contentService";
import { supabaseServerClient } from "@/lib/supabaseServerClient";
import { getSignedImageUrl, listCurrentIconicImagesForBirds } from "@/lib/imageService";
import { BirdStatus, BIRD_STATUS_VALUES } from "@/types/bird";
import type { PlaceType } from "@/types/place";
import { getCurrentSeasonKey } from "@/lib/season";
import { listBirdSightingsForUser } from "@/lib/birdSightingService";
import { Card } from "@/ui/components/Card";
import { StatusPill } from "@/ui/components/StatusPill";
import BirdIcon from "@/components/admin/BirdIcon";
import DashboardPlacesMap from "@/components/admin/DashboardPlacesMap";

export const metadata = {
  title: "Szárnyfeszítő admin dashboard",
};

export const dynamic = "force-dynamic";

const habitatIconForClass = (habitatClass: unknown) => {
  if (typeof habitatClass !== "string") {
    return null;
  }

  switch (habitatClass.trim().toLowerCase()) {
    case "erdő":
      return "/BIRDS/ICONS/BACKGROUND/ICON_FOREST.svg";
    case "vízpart":
      return "/BIRDS/ICONS/BACKGROUND/ICON_WATER.svg";
    case "puszta":
      return "/BIRDS/ICONS/BACKGROUND/ICON_GRASSLAND.svg";
    case "hegy":
      return "/BIRDS/ICONS/BACKGROUND/ICON_MOUNTAIN.svg";
    case "város":
      return "/BIRDS/ICONS/BACKGROUND/ICON_CITY.svg";
    default:
      return null;
  }
};

export default async function AdminPage() {
  const admin = await getAdminUserFromCookies();
  const birds = await listBirds();
  const places = await listPlaces();
  const publishedMarkers = await listPublishedPlaceDashboardMarkers();
  const currentSeason = getCurrentSeasonKey();
  const currentSeasonLabel =
    currentSeason === "spring"
      ? "Tavasz"
      : currentSeason === "summer"
      ? "Nyár"
      : currentSeason === "autumn"
      ? "Ősz"
      : "Tél";

  const statusCounts = birds.reduce(
    (acc, bird) => {
      acc[bird.status] = (acc[bird.status] ?? 0) + 1;
      return acc;
    },
    BIRD_STATUS_VALUES.reduce<Record<BirdStatus, number>>((acc, status) => {
      acc[status] = 0;
      return acc;
    }, {} as Record<BirdStatus, number>)
  );

  const recentBirds = birds.slice(0, 3);
  const recentBirdIds = recentBirds.map((bird) => bird.id);

  const dossierByBirdId = await listLatestDossierBlocksForBirds(recentBirdIds);
  const habitatIconByBirdId = new Map<string, string>();
  for (const [birdId, dossier] of dossierByBirdId.entries()) {
    const iconSrc = habitatIconForClass(dossier?.pill_meta?.habitat_class);
    if (iconSrc) {
      habitatIconByBirdId.set(birdId, iconSrc);
    }
  }

  const iconicImages = await listCurrentIconicImagesForBirds(recentBirdIds);
  const iconicPreviewByBirdId = new Map<string, string>();
  await Promise.all(
    iconicImages.map(async (image) => {
      const signedUrl = await getSignedImageUrl(image.storage_path);
      if (signedUrl) {
        iconicPreviewByBirdId.set(image.entity_id, signedUrl);
      }
    })
  );

  const spotlightGroups: Array<{
    key: "water" | "forest" | "mountain";
    label: string;
    placeTypes: PlaceType[];
  }> = [
    {
      key: "water",
      label: "Vízpart",
      placeTypes: [
        "lake",
        "river",
        "fishpond",
        "reservoir",
        "marsh",
        "reedbed",
        "salt_lake",
        "urban_waterfront",
      ],
    },
    { key: "forest", label: "Erdő", placeTypes: ["forest_edge", "protected_area"] },
    { key: "mountain", label: "Hegység", placeTypes: ["mountain_area"] },
  ];

  type SpotlightPlace = { id: string; name: string; slug: string };
  type SpotlightBird = {
    id: string;
    slug: string;
    name_hu: string;
    habitatIconSrc: string | null;
    places: SpotlightPlace[];
    bestRank: number;
  };

  const publishedPlacesByGroup = await Promise.all(
    spotlightGroups.map(async (group) => ({
      key: group.key,
      label: group.label,
      places: await listPublishedPlacesByPrimaryType(group.placeTypes),
    }))
  );

  const spotlightBirdsByGroup = new Map<string, SpotlightBird[]>();
  const spotlightBirdIds = new Set<string>();

  for (const group of publishedPlacesByGroup) {
    const placeById = new Map(group.places.map((place) => [place.id, place] as const));
    const placeIds = Array.from(placeById.keys());
    if (placeIds.length === 0) {
      spotlightBirdsByGroup.set(group.key, []);
      continue;
    }

    type Row = {
      place_id: string;
      rank: number;
      frequency_band: string;
      is_iconic: boolean;
      visible_in_spring: boolean;
      visible_in_summer: boolean;
      visible_in_autumn: boolean;
      visible_in_winter: boolean;
      updated_at: string;
      bird: { id: string; slug: string; name_hu: string; status?: string } | null;
    };

    const { data, error } = await supabaseServerClient
      .from("place_birds")
      .select(
        "place_id,bird_id,rank,frequency_band,is_iconic,visible_in_spring,visible_in_summer,visible_in_autumn,visible_in_winter,updated_at,bird:birds(id,slug,name_hu,status)"
      )
      .eq("review_status", "approved")
      .not("bird_id", "is", null)
      .in("place_id", placeIds)
      .order("rank", { ascending: true })
      .order("updated_at", { ascending: false })
      .limit(600);

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as unknown as Row[];
    const seasonalRows = rows.filter((row) => {
      if (!row.bird || row.bird.status !== "published") return false;
      if (currentSeason === "spring") return row.visible_in_spring;
      if (currentSeason === "summer") return row.visible_in_summer;
      if (currentSeason === "autumn") return row.visible_in_autumn;
      return row.visible_in_winter;
    });

    const byBirdId = new Map<string, SpotlightBird>();
    for (const row of seasonalRows) {
      const bird = row.bird;
      if (!bird) continue;
      const place = placeById.get(row.place_id);
      if (!place) continue;

      const existing = byBirdId.get(bird.id);
      if (!existing) {
        byBirdId.set(bird.id, {
          id: bird.id,
          slug: bird.slug,
          name_hu: bird.name_hu,
          habitatIconSrc: null,
          places: [{ id: place.id, name: place.name, slug: place.slug }],
          bestRank: row.rank,
        });
      } else {
        existing.bestRank = Math.min(existing.bestRank, row.rank);
        if (!existing.places.some((p) => p.id === place.id)) {
          existing.places.push({ id: place.id, name: place.name, slug: place.slug });
          if (existing.places.length > 3) {
            existing.places = existing.places.slice(0, 3);
          }
        }
      }
    }

    const list = Array.from(byBirdId.values())
      .sort((a, b) => a.bestRank - b.bestRank || b.places.length - a.places.length || a.name_hu.localeCompare(b.name_hu))
      .slice(0, 7);

    list.forEach((bird) => spotlightBirdIds.add(bird.id));
    spotlightBirdsByGroup.set(group.key, list);
  }

  const spotlightDossierByBirdId = await listLatestDossierBlocksForBirds(Array.from(spotlightBirdIds));
  for (const group of spotlightGroups) {
    const list = spotlightBirdsByGroup.get(group.key) ?? [];
    list.forEach((bird) => {
      const dossier = spotlightDossierByBirdId.get(bird.id);
      bird.habitatIconSrc = habitatIconForClass(dossier?.pill_meta?.habitat_class);
    });
    spotlightBirdsByGroup.set(group.key, list);
  }

  const mySightings = admin ? await listBirdSightingsForUser(admin.id, { limit: 8 }) : [];
  const formatter = new Intl.DateTimeFormat("hu-HU", { dateStyle: "medium", timeStyle: "short" });

  return (
    <section className="admin-stack">
      <DashboardPlacesMap markers={publishedMarkers} />

      <Card className="stack">
        <header className="admin-heading">
          <p className="admin-heading__label">Places</p>
          <h2 className="admin-heading__title admin-heading__title--large">Habitat spotlights</h2>
          <p className="admin-heading__description">
            Top birds visible in {currentSeasonLabel} across published places, grouped by primary place type.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          {spotlightGroups.map((group) => {
            const birdsForGroup = spotlightBirdsByGroup.get(group.key) ?? [];
            return (
              <div key={group.key} className="admin-stat-card">
                <p className="admin-stat-label">{group.label}</p>
                {birdsForGroup.length ? (
                  <div className="mt-3 space-y-3">
                    {birdsForGroup.map((bird) => (
                      <div key={bird.id} className="flex items-start gap-3">
                        {bird.habitatIconSrc ? (
                          <img
                            src={bird.habitatIconSrc}
                            alt=""
                            className="h-10 w-10 shrink-0 rounded-xl p-2"
                            style={{ border: "1px solid var(--line)", background: "var(--panel-2)" }}
                          />
                        ) : (
                          <div
                            className="h-10 w-10 shrink-0 rounded-xl"
                            style={{ border: "1px solid var(--line)", background: "var(--panel-2)" }}
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <Link href={`/admin/birds/${bird.id}`} className="admin-nav-link">
                            {bird.name_hu}
                          </Link>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {bird.places.map((place) => (
                              <Link
                                key={place.id}
                                href={`/admin/places/${place.id}`}
                                className="admin-note-small hover:underline"
                              >
                                {place.name}
                              </Link>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="admin-stat-note mt-3">No matches yet.</p>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="stack">
        <header className="admin-heading">
          <p className="admin-heading__label admin-text-accent">Birdwatch</p>
          <h2 className="admin-heading__title admin-heading__title--large">My sightings</h2>
          <p className="admin-heading__description">
            Your latest quick logs from the sticky Birdwatch button.
          </p>
        </header>

        {mySightings.length === 0 ? (
          <p className="admin-stat-note">No sightings recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {mySightings.map((sighting) => (
              <div key={sighting.id} className="admin-list-link" style={{ padding: "0.9rem 1rem" }}>
                <div className="admin-list-details">
                  <div className="admin-bird-list-grid" style={{ gridTemplateColumns: "1fr" }}>
                    <div className="min-w-0">
                      <p className="admin-stat-label">{formatter.format(new Date(sighting.seen_at))}</p>
                      <p className="admin-note-small mt-2">
                        {sighting.birds.map((bird, idx) => (
                          <span key={bird.id}>
                            <Link href={`/admin/birds/${bird.id}`} className="admin-nav-link">
                              {bird.name_hu}
                            </Link>
                            {idx < sighting.birds.length - 1 ? ", " : ""}
                          </span>
                        ))}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="stack">
        <header className="admin-heading">
          <p className="admin-heading__label">Dashboard</p>
          <h1 className="admin-heading__title">Bird pipeline overview</h1>
          <p className="admin-heading__description">
            Track the Szarnyfeszito pipeline from draft text to publish-ready
            stories. Navigate to Birds to continue the flow.
          </p>
        </header>

        <div className="admin-stat-grid">
          {BIRD_STATUS_VALUES.map((status) => (
            <article key={status} className="admin-stat-card">
              <p className="admin-stat-label">{status}</p>
              <p className="admin-stat-count">
                {statusCounts[status] ?? 0}
              </p>
              <p className="admin-stat-note">
                {status === "draft"
                  ? "New birds awaiting text"
                  : status === "text_generated"
                  ? "Text generated"
                  : status === "text_approved"
                  ? "Text approved"
                  : status === "images_generated"
                  ? "Images in progress"
                  : status === "images_approved"
                  ? "Images approved"
                  : "Published"}
              </p>
            </article>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Link className="admin-link-card stack" href="/admin/birds">
            <p className="admin-link-card__title">Manage Birds</p>
            <p className="admin-link-card__description">
              Explore list, editors, and pipeline states.
            </p>
          </Link>

          <Link className="admin-link-card stack" href="/admin/places">
            <p className="admin-link-card__title">Manage Places</p>
            <p className="admin-link-card__description">
              {places.length} places in registry. Generate, review, and publish destination panels.
            </p>
          </Link>

          <article className="admin-stat-card">
            <p className="admin-stat-label">Phenomena</p>
            <p className="admin-stat-count">0</p>
            <p className="admin-stat-note">Pending T102/T105 work.</p>
          </article>
        </div>
      </Card>

      <Card className="stack">
        <header className="admin-heading inline-flex items-start justify-between gap-3">
          <div>
            <p className="admin-heading__label">Birds</p>
            <h2 className="admin-heading__title admin-heading__title--large">
              Recent birds in the pipeline
            </h2>
          </div>
          <Link className="admin-nav-link" href="/admin/birds">
            View all birds
          </Link>
        </header>

        <div className="space-y-3">
          {recentBirds.length === 0 && (
            <p className="admin-stat-note">
              No birds have been created yet. Use the Birds page to add the
              first entry.
            </p>
          )}

          {recentBirds.map((bird) => (
            <Link
              key={bird.id}
              href={`/admin/birds/${bird.id}`}
              className="admin-list-link"
            >
              <div className="admin-list-details">
                <div className="admin-bird-list-grid">
                  <BirdIcon
                    habitatSrc={habitatIconByBirdId.get(bird.id) ?? null}
                    iconicSrc={iconicPreviewByBirdId.get(bird.id) ?? null}
                    showHabitatBackground
                    size={76}
                  />
                  <div className="admin-bird-text-cell">
                    <p className="admin-list-title">{bird.name_hu}</p>
                    <p className="admin-list-meta">{bird.slug}</p>
                    <p className="admin-list-date">
                      Updated{" "}
                      {new Intl.DateTimeFormat(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(bird.updated_at))}
                    </p>
                  </div>
                </div>
              </div>
              <div className="admin-inline-actions">
                <StatusPill status={bird.status} />
                <span className="admin-list-action">Open editor</span>
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </section>
  );
}
