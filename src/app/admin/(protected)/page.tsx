import Link from "next/link";
import { listBirds } from "@/lib/birdService";
import { listPlaces } from "@/lib/placeService";
import { listLatestDossierBlocksForBirds } from "@/lib/contentService";
import { getSignedImageUrl, listCurrentIconicImagesForBirds } from "@/lib/imageService";
import { BirdStatus, BIRD_STATUS_VALUES } from "@/types/bird";
import { Card } from "@/ui/components/Card";
import { StatusPill } from "@/ui/components/StatusPill";
import BirdIcon from "@/components/admin/BirdIcon";

export const metadata = {
  title: "Szárnyfeszítő admin dashboard",
};

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
  const birds = await listBirds();
  const places = await listPlaces();

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

  return (
    <section className="admin-stack">
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
