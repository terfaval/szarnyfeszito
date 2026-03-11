"use client";

import type { DistributionStatus } from "@/types/distributionMap";
import styles from "./DistributionLegend.module.css";

const STATUS_LABELS: Record<DistributionStatus, string> = {
  resident: "Állandó",
  breeding: "Költő",
  wintering: "Telelő",
  passage: "Átvonuló",
};

const STATUS_COLORS: Record<DistributionStatus, string> = {
  resident: "#BE2D12",
  breeding: "#D9480F",
  wintering: "#F76707",
  passage: "#FFD43B",
};

export type DistributionLegendProps = {
  active: Record<DistributionStatus, boolean>;
  onToggle: (status: DistributionStatus) => void;
  items?: DistributionStatus[];
};

export default function DistributionLegend({
  active,
  onToggle,
  items = ["resident", "breeding", "wintering", "passage"],
}: DistributionLegendProps) {
  if (!items.length) {
    return null;
  }

  return (
    <div className={styles.legend}>
      {items.map((status) => {
        const isOn = active[status];
        return (
          <button
            key={status}
            type="button"
            className={`${styles.item} ${isOn ? styles.itemOn : styles.itemOff}`}
            onClick={() => onToggle(status)}
          >
            <span
              className={styles.swatch}
              style={{ backgroundColor: STATUS_COLORS[status] }}
              aria-hidden="true"
            />
            <span className={styles.label}>{STATUS_LABELS[status]}</span>
          </button>
        );
      })}
    </div>
  );
}
