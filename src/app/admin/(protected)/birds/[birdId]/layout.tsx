import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getBirdById, getBirdBySlug, isUuid } from "@/lib/birdService";
import { BIRD_STATUS_VALUES } from "@/types/bird";
import BirdEditorHeader from "@/components/admin/BirdEditorHeader";

export const dynamic = "force-dynamic";

export default async function BirdEditorLayout({
  children,
  params,
}: Readonly<{
  children: ReactNode;
  params: Promise<{ birdId: string }>;
}>) {
  const { birdId } = await params;
  const bird = isUuid(birdId) ? await getBirdById(birdId) : await getBirdBySlug(birdId);

  if (!bird) {
    redirect("/admin/birds");
  }

  const statusIndex = BIRD_STATUS_VALUES.indexOf(bird.status);
  const textApprovedIndex = BIRD_STATUS_VALUES.indexOf("text_approved");

  const hasReachedTextApproved =
    textApprovedIndex !== -1 && statusIndex >= textApprovedIndex;

  const links = {
    general: { href: `/admin/birds/${bird.id}`, enabled: true },
    text: { href: `/admin/birds/${bird.id}/text`, enabled: true },
    imageAccuracy: {
      href: `/admin/birds/${bird.id}/image-accuracy`,
      enabled: hasReachedTextApproved,
    },
    images: {
      href: `/admin/birds/${bird.id}/images`,
      enabled: hasReachedTextApproved,
    },
    publish: {
      href: `/admin/birds/${bird.id}/publish`,
      enabled: hasReachedTextApproved,
    },
  };

  return (
    <section className="admin-stack">
      <BirdEditorHeader
        bird={{
          id: bird.id,
          name_hu: bird.name_hu,
          slug: bird.slug,
          status: bird.status,
        }}
        links={links}
      />
      {children}
    </section>
  );
}
