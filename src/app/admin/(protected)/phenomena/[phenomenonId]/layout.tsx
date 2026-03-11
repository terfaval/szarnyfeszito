import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { isUuid } from "@/lib/birdService";
import { getPhenomenonById, getPhenomenonBySlug } from "@/lib/phenomenonService";
import PhenomenonEditorHeader from "@/components/admin/PhenomenonEditorHeader";

export const dynamic = "force-dynamic";

export default async function PhenomenonEditorLayout({
  children,
  params,
}: Readonly<{
  children: ReactNode;
  params: Promise<{ phenomenonId: string }>;
}>) {
  const { phenomenonId } = await params;
  const phenomenon = isUuid(phenomenonId) ? await getPhenomenonById(phenomenonId) : await getPhenomenonBySlug(phenomenonId);

  if (!phenomenon) {
    redirect("/admin/phenomena");
  }

  const links = {
    general: { href: `/admin/phenomena/${phenomenon.id}`, enabled: true },
    birds: { href: `/admin/phenomena/${phenomenon.id}/birds`, enabled: true },
    content: { href: `/admin/phenomena/${phenomenon.id}/content`, enabled: true },
    publish: { href: `/admin/phenomena/${phenomenon.id}/publish`, enabled: true },
  };

  return (
    <section className="admin-stack">
      <PhenomenonEditorHeader
        phenomenon={{ id: phenomenon.id, title: phenomenon.title, slug: phenomenon.slug, status: phenomenon.status }}
        links={links}
      />
      {children}
    </section>
  );
}

