"use client";

import Link from "next/link";
import BirdIcon from "./BirdIcon";
import styles from "./PlaceCardShort.module.css";
import { PLACE_TYPE_LABELS } from "@/lib/placeTypeMeta";
import type { PlaceType } from "@/types/place";

type PlaceCardBird = {
  id: string;
  slug: string;
  name_hu: string;
  iconicSrc: string | null;
};

type PlaceCardShortProps = {
  place: {
    id?: string;
    slug: string;
    name: string;
    place_type: PlaceType;
    county?: string | null;
    nearest_city?: string | null;
    subtitle?: string | null;
  };
  shortDescription?: string | null;
  birds?: PlaceCardBird[];
  placeLinkBasePath?: string;
  placeLinkJoiner?: string;
  birdLinkBasePath?: string;
  birdLinkJoiner?: string;
  birdLinkKey?: "id" | "slug";
  onClose?: () => void;
  className?: string;
};

function joinHref(basePath: string, joiner: string, value: string) {
  return `${basePath}${joiner}${encodeURIComponent(value)}`;
}

export default function PlaceCardShort({
  place,
  shortDescription,
  birds = [],
  placeLinkBasePath = "/places",
  placeLinkJoiner = "/",
  birdLinkBasePath = "/birds",
  birdLinkJoiner = "/",
  birdLinkKey = "slug",
  onClose,
  className,
}: PlaceCardShortProps) {
  const description = shortDescription?.trim();
  const pills = [
    PLACE_TYPE_LABELS[place.place_type],
    place.county ?? "",
    place.nearest_city ?? "",
    place.subtitle ?? "",
  ].filter(Boolean);

  return (
    <div className={[styles.root, className ?? ""].filter(Boolean).join(" ")}>
      <div className={styles.meta}>
        {pills.map((pill) => (
          <span key={pill} className={styles.pill}>
            {pill}
          </span>
        ))}
      </div>
      <h3 className={styles.name}>{place.name}</h3>
      <p className={styles.short}>
        {description || "Nincs rövid leírás ehhez a helyszínhez."}
      </p>

      {birds.length ? (
        <div className={styles.birds} aria-label="Top birds">
          {birds.slice(0, 4).map((bird) => (
            <Link
              key={bird.id}
              href={joinHref(birdLinkBasePath, birdLinkJoiner, birdLinkKey === "slug" ? bird.slug : bird.id)}
              className={styles.birdLink}
              aria-label={`Madár: ${bird.name_hu}`}
            >
              <BirdIcon iconicSrc={bird.iconicSrc} showHabitatBackground={false} size={52} />
            </Link>
          ))}
        </div>
      ) : null}

      <div className={styles.actions}>
        <Link
          href={joinHref(placeLinkBasePath, placeLinkJoiner, place.slug)}
          className="btn btn--accent"
          aria-label={`Megnyitás: ${place.name}`}
        >
          Helyszín
        </Link>
        {onClose ? (
          <button type="button" className={styles.closeButton} onClick={onClose}>
            Bezár
          </button>
        ) : null}
      </div>
    </div>
  );
}
