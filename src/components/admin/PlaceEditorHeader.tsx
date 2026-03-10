"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Card } from "@/ui/components/Card";
import { StatusPill } from "@/ui/components/StatusPill";
import type { PlaceStatus } from "@/types/place";

type PlaceEditorHeaderProps = {
  place: {
    id: string;
    name: string;
    slug: string;
    status: PlaceStatus;
  };
  links: {
    general: { href: string; enabled: boolean };
    birds: { href: string; enabled: boolean };
    notable_units: { href: string; enabled: boolean };
    content: { href: string; enabled: boolean };
    publish: { href: string; enabled: boolean };
  };
};

function isActive(pathname: string, href: string) {
  if (href === pathname) return true;
  return href !== "/" && pathname.startsWith(`${href}/`);
}

export function PlaceEditorHeader({ place, links }: PlaceEditorHeaderProps) {
  const pathname = usePathname();
  const items = [
    { label: "General", key: "general" as const, ...links.general },
    { label: "Birds", key: "birds" as const, ...links.birds },
    { label: "Notable units", key: "notable_units" as const, ...links.notable_units },
    { label: "Content", key: "content" as const, ...links.content },
    { label: "Publish", key: "publish" as const, ...links.publish },
  ];

  return (
    <Card className="place-panel stack">
      <header className="place-panel-header admin-header-row">
        <div className="admin-heading">
          <p className="admin-heading__label">Place editor</p>
          <h1 className="admin-heading__title admin-heading__title--large">{place.name}</h1>
          <p className="admin-heading__description">Slug: {place.slug}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <StatusPill status={place.status} />
          <Link className="btn btn--ghost" href="/admin/places">
            Back to list
          </Link>
        </div>
      </header>

      <nav className="admin-tablist" aria-label="Place editor sections">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const className = [
            "admin-tab",
            active ? "admin-tab--active" : "admin-tab--inactive",
            item.enabled ? "" : "cursor-not-allowed opacity-60",
          ]
            .filter(Boolean)
            .join(" ");

          return item.enabled ? (
            <Link key={item.key} href={item.href} className={className}>
              {item.label}
            </Link>
          ) : (
            <span key={item.key} className={className} aria-disabled="true">
              {item.label}
            </span>
          );
        })}
      </nav>
    </Card>
  );
}

export default PlaceEditorHeader;
