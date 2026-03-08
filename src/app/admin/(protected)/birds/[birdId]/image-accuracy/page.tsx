import Link from "next/link";
import { redirect } from "next/navigation";
import { getBirdById, getBirdBySlug, isUuid } from "@/lib/birdService";
import { getScienceDossierForBird } from "@/lib/scienceDossierService";
import { getVisualBriefForBird } from "@/lib/visualBriefService";
import ImageAccuracyHandoff from "@/components/admin/ImageAccuracyHandoff";
import { upsertScienceDossierDraft } from "@/lib/scienceDossierService";
import { generateScienceDossierV1 } from "@/lib/imageAccuracyGeneration";
import { getLatestContentBlockForBird } from "@/lib/contentService";
import { updateBird } from "@/lib/birdService";
import { BIRD_STATUS_VALUES } from "@/types/bird";

export const metadata = {
  title: "Image accuracy handoff",
};

export const dynamic = "force-dynamic";

export default async function ImageAccuracyPage({
  params,
}: {
  params: Promise<{ birdId: string }>;
}) {
  const { birdId } = await params;
  const bird = isUuid(birdId) ? await getBirdById(birdId) : await getBirdBySlug(birdId);

  if (!bird) {
    redirect("/admin/birds");
  }

  const statusIndex = BIRD_STATUS_VALUES.indexOf(bird.status);
  const textApprovedIndex = BIRD_STATUS_VALUES.indexOf("text_approved");

  if (textApprovedIndex === -1 || statusIndex < textApprovedIndex) {
    redirect(`/admin/birds/${bird.id}`);
  }

  const [initialScienceDossier, visualBrief] = await Promise.all([
    getScienceDossierForBird(bird.id),
    getVisualBriefForBird(bird.id),
  ]);

  let scienceDossier = initialScienceDossier;

  if (!scienceDossier) {
    const contentBlock = await getLatestContentBlockForBird(bird.id);
    const fieldGuideDossier = contentBlock?.blocks_json ?? null;
    const result = await generateScienceDossierV1({
      bird,
      dossier: fieldGuideDossier,
    });
    await upsertScienceDossierDraft({
      bird_id: bird.id,
      schema_version: "v1",
      payload: result.payload,
      created_by: "ai",
    });
    await updateBird({ id: bird.id, science_dossier_status: "generated" });
    scienceDossier = await getScienceDossierForBird(bird.id);
  }

  return (
    <section className="admin-stack">
      <div className="flex items-center justify-between">
        <Link className="admin-nav-link" href={`/admin/birds/${bird.id}`}>
          Back to editor
        </Link>
      </div>
      <ImageAccuracyHandoff
        birdId={bird.id}
        scienceDossier={scienceDossier}
        visualBrief={visualBrief}
        scienceDossierStatus={bird.science_dossier_status}
        visualBriefStatus={bird.visual_brief_status}
      />
    </section>
  );
}
