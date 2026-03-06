import Link from "next/link";
import { redirect } from "next/navigation";
import { getBirdById, getBirdBySlug, isUuid } from "@/lib/birdService";
import { getScienceDossierForBird } from "@/lib/scienceDossierService";
import { getVisualBriefForBird } from "@/lib/visualBriefService";
import ImageAccuracyHandoff from "@/components/admin/ImageAccuracyHandoff";
import { upsertScienceDossierDraft } from "@/lib/scienceDossierService";
import { scienceDossierSchemaV1 } from "@/lib/imageAccuracySchemas";
import { updateBird } from "@/lib/birdService";

export const metadata = {
  title: "Image accuracy handoff",
};

export const dynamic = "force-dynamic";

function buildBootstrapScienceDossier(bird: { name_hu: string; name_latin?: string | null }) {
  return scienceDossierSchemaV1.parse({
    species_identity: {
      name_hu: bird.name_hu,
      name_latin: bird.name_latin ?? bird.name_hu,
    },
    confusion_set: [],
    key_field_marks: [],
    proportions: {
      neck: "medium",
      legs: "medium",
      body: "average",
      beak: { length: "medium", shape: "straight" },
    },
    plumage_variants: {
      adult: "TODO",
      juvenile: "not_applicable",
      breeding: "not_applicable",
      non_breeding: "not_applicable",
    },
    must_not_include: ["wrong species", "fantasy colors", "extra limbs"],
    confidence: { per_section: "low", notes: "Bootstrapped draft. Please review." },
  });
}

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

  let [scienceDossier, visualBrief] = await Promise.all([
    getScienceDossierForBird(bird.id),
    getVisualBriefForBird(bird.id),
  ]);

  if (!scienceDossier) {
    const payload = buildBootstrapScienceDossier(bird);
    await upsertScienceDossierDraft({
      bird_id: bird.id,
      schema_version: "v1",
      payload,
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
