import Link from "next/link";
import { redirect } from "next/navigation";
import { getBirdById, getBirdBySlug, isUuid } from "@/lib/birdService";
import { getScienceDossierForBird } from "@/lib/scienceDossierService";
import { getVisualBriefForBird } from "@/lib/visualBriefService";
import { Card } from "@/ui/components/Card";
import ImageAccuracyHandoff from "@/components/admin/ImageAccuracyHandoff";

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

  if (bird.status !== "text_approved") {
    redirect(`/admin/birds/${bird.id}`);
  }

  const [scienceDossier, visualBrief] = await Promise.all([
    getScienceDossierForBird(bird.id),
    getVisualBriefForBird(bird.id),
  ]);

  return (
    <section className="admin-stack">
      <Card className="stack">
        <header className="admin-heading inline-flex items-start justify-between gap-3">
          <div>
            <p className="admin-heading__label">Bird</p>
            <h1 className="admin-heading__title admin-heading__title--large">
              {bird.name_hu}
            </h1>
            <p className="admin-heading__description">
              Status: <span className="font-semibold">{bird.status}</span>
            </p>
          </div>
          <Link className="admin-nav-link" href={`/admin/birds/${bird.id}`}>
            Back to editor
          </Link>
        </header>
      </Card>

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

