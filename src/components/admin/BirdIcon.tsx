import styles from "./BirdIcon.module.css";

export type BirdIconProps = {
  iconicSrc?: string | null;
  habitatSrc?: string | null;
  showHabitatBackground?: boolean;
  size?: number;
  className?: string;
};

export default function BirdIcon({
  iconicSrc,
  habitatSrc,
  showHabitatBackground = true,
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

  return (
    <div
      aria-hidden="true"
      className={rootClassName}
      style={{ ["--bird-icon-size" as never]: `${size}px` }}
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
