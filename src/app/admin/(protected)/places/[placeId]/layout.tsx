import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { isUuid } from "@/lib/birdService";
import { getPlaceById, getPlaceBySlug } from "@/lib/placeService";
import PlaceEditorHeader from "@/components/admin/PlaceEditorHeader";

export const dynamic = "force-dynamic";

export default async function PlaceEditorLayout({
  children,
  params,
}: Readonly<{
  children: ReactNode;
  params: Promise<{ placeId: string }>;
}>) {
  const { placeId } = await params;
  const place = isUuid(placeId) ? await getPlaceById(placeId) : await getPlaceBySlug(placeId);

  if (!place) {
    redirect("/admin/places");
  }

  const links = {
    general: { href: `/admin/places/${place.id}`, enabled: true },
    birds: { href: `/admin/places/${place.id}/birds`, enabled: true },
    notable_units: { href: `/admin/places/${place.id}/notable-units`, enabled: true },
    content: { href: `/admin/places/${place.id}/content`, enabled: true },
    publish: { href: `/admin/places/${place.id}/publish`, enabled: true },
  };

  return (
    <section className="admin-stack">
      <PlaceEditorHeader
        place={{ id: place.id, name: place.name, slug: place.slug, status: place.status }}
        links={links}
      />
      {children}
    </section>
  );
}
