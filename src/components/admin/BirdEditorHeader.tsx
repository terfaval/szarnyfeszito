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
    <Card className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
            Bird editor
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-white">{bird.name_hu}</h1>
          <p className="text-sm text-slate-400">Slug: {bird.slug}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <StatusPill status={bird.status as never} />
          <Link
            className="rounded-full border border-white/30 px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-white transition hover:border-white"
            href="/admin/birds"
          >
            Back to list
          </Link>
        </div>
      </header>

      <nav className="flex flex-wrap gap-3 border-y border-white/5 py-3 text-xs uppercase tracking-[0.3em] text-slate-400">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const className = active
            ? "rounded-full bg-white/10 px-3 py-1 text-white"
            : item.enabled
            ? "rounded-full border border-white/10 px-3 py-1 text-slate-400 transition hover:border-white/40 hover:text-white"
            : "cursor-not-allowed rounded-full border border-white/5 px-3 py-1 text-slate-600 opacity-70";

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
