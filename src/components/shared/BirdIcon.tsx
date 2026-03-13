import type { CSSProperties } from "react";
import styles from "./BirdIcon.module.css";
import type { BirdIconBackground } from "@/types/dossier";

export type BirdIconProps = {
  iconicSrc?: string | null;
  habitatSrc?: string | null;
  showHabitatBackground?: boolean;
  background?: BirdIconBackground | null;
  size?: number;
  className?: string;
};

const BACKGROUND_COLORS: Record<BirdIconBackground, string> = {
  white: "#f8fafc",
  black: "#1f2937",
  grey: "#eef2f7",
  brown: "#f3ede7",
  yellow: "#fff3cc",
  orange: "#ffe7d6",
  red: "#fdecef",
  green: "#e8f3ea",
  blue: "#e8f2ff",
};

export default function BirdIcon({
  iconicSrc,
  habitatSrc,
  showHabitatBackground = true,
  background,
  size = 76,
  className,
}: BirdIconProps) {
  const rootClassName = [
    styles.root,
    showHabitatBackground ? "" : styles.rootNoHabitatBackground,
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const style = {
    ["--bird-icon-size" as never]: `${size}px`,
    ...(background ? { ["--bird-icon-bg" as never]: BACKGROUND_COLORS[background] } : null),
  } as CSSProperties;

  return (
    <div
      aria-hidden="true"
      className={rootClassName}
      style={style}
    >
      {showHabitatBackground ? (
        habitatSrc ? (
          <img src={habitatSrc} alt="" className={styles.habitatBackground} />
        ) : (
          <div className={styles.habitatFallback} />
        )
      ) : null}

      {iconicSrc ? <img src={iconicSrc} alt="" className={styles.iconicBird} /> : null}
    </div>
  );
}
