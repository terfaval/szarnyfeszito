import BirdListShell from "@/components/admin/BirdListShell";
import { listBirds } from "@/lib/birdService";
import { listLatestDossierBlocksForBirds } from "@/lib/contentService";
import { getSignedImageUrl, listCurrentIconicImagesForBirds } from "@/lib/imageService";

export const metadata = {
  title: "Birds — Szarnyfeszito Admin",
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

export default async function BirdsPage() {
  const birds = await listBirds();
  const birdIds = birds.map((bird) => bird.id);

  const dossierByBirdId = await listLatestDossierBlocksForBirds(birdIds);
  const habitatIconByBirdId = new Map<string, string>();
  for (const [birdId, dossier] of dossierByBirdId.entries()) {
    const iconSrc = habitatIconForClass(dossier?.pill_meta?.habitat_class);
    if (iconSrc) {
      habitatIconByBirdId.set(birdId, iconSrc);
    }
  }

  const iconicImages = await listCurrentIconicImagesForBirds(birdIds);
  const iconicPreviewByBirdId = new Map<string, string>();
  await Promise.all(
    iconicImages.map(async (image) => {
      const signedUrl = await getSignedImageUrl(image.storage_path);
      if (signedUrl) {
        iconicPreviewByBirdId.set(image.entity_id, signedUrl);
      }
    })
  );

  const birdsWithBadges = birds.map((bird) => ({
    ...bird,
    habitatIconSrc: habitatIconByBirdId.get(bird.id) ?? null,
    iconicPreviewUrl: iconicPreviewByBirdId.get(bird.id) ?? null,
  }));

  return (
    <section className="space-y-10">
      <BirdListShell birds={birdsWithBadges} />
    </section>
  );
}
