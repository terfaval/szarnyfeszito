import BirdListShell from "@/components/admin/BirdListShell";
import { listBirds } from "@/lib/birdService";
import { listLatestDossierBlocksForBirds } from "@/lib/contentService";
import { habitatIconForClass } from "@/lib/habitatIcons";
import { getSignedImageUrl, listCurrentIconicImagesForBirds } from "@/lib/imageService";

export const metadata = {
  title: "Birds — Szarnyfeszito Admin",
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
