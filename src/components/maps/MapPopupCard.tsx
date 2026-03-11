"use client";

import Link from "next/link";

export type MapPopupCardProps = {
  eyebrow?: string | null;
  title: string;
  meta?: string | null;
  description?: string | null;
  href?: string | null;
  ctaLabel?: string | null;
};

export default function MapPopupCard({ eyebrow, title, meta, description, href, ctaLabel }: MapPopupCardProps) {
  return (
    <div className="sf-map-popup">
      {eyebrow ? <p className="sf-map-popup__eyebrow">{eyebrow}</p> : null}
      <p className="sf-map-popup__title">{title}</p>
      {meta ? <p className="sf-map-popup__meta">{meta}</p> : null}
      {description ? <p className="sf-map-popup__desc">{description}</p> : null}
      {href ? (
        <Link href={href} className="sf-map-popup__cta">
          {ctaLabel ?? "Open"}
        </Link>
      ) : null}
    </div>
  );
}

