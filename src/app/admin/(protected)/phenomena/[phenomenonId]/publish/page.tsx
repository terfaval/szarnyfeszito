import { Card } from "@/ui/components/Card";
import { isUuid } from "@/lib/birdService";
import { getPhenomenonById, getPhenomenonBySlug } from "@/lib/phenomenonService";
import { getLatestApprovedContentBlockForPhenomenon } from "@/lib/phenomenonContentService";
import { listApprovedPublishedBirdLinksForPhenomenon } from "@/lib/phenomenonBirdService";
import PhenomenonPublishAction from "@/components/admin/PhenomenonPublishAction";

export const metadata = {
  title: "Phenomenon publish — Szárnyfeszítő Admin",
};

export const dynamic = "force-dynamic";

function nonEmpty(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function isMmdd(value: unknown) {
  return typeof value === "string" && /^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/.test(value.trim());
}

export default async function PhenomenonPublishPage({
  params,
}: {
  params: Promise<{ phenomenonId: string }>;
}) {
  const { phenomenonId } = await params;
  const phenomenon = isUuid(phenomenonId) ? await getPhenomenonById(phenomenonId) : await getPhenomenonBySlug(phenomenonId);

  if (!phenomenon) {
    return <Card className="admin-stat-card admin-stat-card--note">Phenomenon not found.</Card>;
  }

  const approved = await getLatestApprovedContentBlockForPhenomenon(phenomenon.id);
  const birdLinks = await listApprovedPublishedBirdLinksForPhenomenon(phenomenon.id);

  const missing: string[] = [];
  if (!nonEmpty(phenomenon.title)) missing.push("title");
  if (!nonEmpty(phenomenon.slug)) missing.push("slug");
  if (!nonEmpty(phenomenon.region_id)) missing.push("region_id");
  if (!nonEmpty(phenomenon.season)) missing.push("season");
  if (!isMmdd(phenomenon.typical_start_mmdd)) missing.push("typical_start_mmdd");
  if (!isMmdd(phenomenon.typical_end_mmdd)) missing.push("typical_end_mmdd");

  if (!approved || !approved.blocks_json) {
    missing.push("approved_content");
  } else {
    const variants = approved.blocks_json.variants;
    if (!nonEmpty(variants.short)) missing.push("content.short");
    if (!nonEmpty(variants.long)) missing.push("content.long");
    if (!nonEmpty(variants.ethics_tip)) missing.push("content.ethics_tip");
  }

  if (birdLinks.length < 1) {
    missing.push("approved_bird_links");
  }

  return (
    <Card className="place-panel place-publish stack">
      <PhenomenonPublishAction phenomenon={phenomenon} missing={missing} />
    </Card>
  );
}

