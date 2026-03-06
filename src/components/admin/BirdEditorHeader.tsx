"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Card } from "@/ui/components/Card";
import { StatusPill } from "@/ui/components/StatusPill";

type BirdEditorHeaderProps = {
  bird: {
    id: string;
    name_hu: string;
    slug: string;
    status: string;
  };
  links: {
    general: { href: string; enabled: boolean };
    text: { href: string; enabled: boolean };
    imageAccuracy: { href: string; enabled: boolean };
    images: { href: string; enabled: boolean };
    publish: { href: string; enabled: boolean };
  };
};

function isActive(pathname: string, href: string) {
  if (href === pathname) {
    return true;
  }
  return href !== "/" && pathname.startsWith(`${href}/`);
}

export function BirdEditorHeader({ bird, links }: BirdEditorHeaderProps) {
  const pathname = usePathname();

  const items = [
    { label: "General", key: "general" as const, ...links.general },
    { label: "Text", key: "text" as const, ...links.text },
    { label: "Accuracy", key: "imageAccuracy" as const, ...links.imageAccuracy },
    { label: "Images", key: "images" as const, ...links.images },
    { label: "Publish", key: "publish" as const, ...links.publish },
  ];

  return (
    <Card className="stack">
      <header className="admin-header-row">
        <div className="admin-heading">
          <p className="admin-heading__label">Bird editor</p>
          <h1 className="admin-heading__title admin-heading__title--large">
            {bird.name_hu}
          </h1>
          <p className="admin-heading__description">Slug: {bird.slug}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <StatusPill status={bird.status as never} />
          <Link className="btn btn--ghost" href="/admin/birds">
            Back to list
          </Link>
        </div>
      </header>

      <nav className="admin-tablist" aria-label="Bird editor sections">
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

export default BirdEditorHeader;
