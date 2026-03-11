import { BirdStatus } from "@/types/bird";
import { PlaceStatus } from "@/types/place";
import type { PhenomenonStatus } from "@/types/phenomenon";

type StatusPillProps = {
  status: BirdStatus | PlaceStatus | PhenomenonStatus;
};

export function StatusPill({ status }: StatusPillProps) {
  return (
    <span className={`status-pill status-pill--${status}`}>
      {status.replace(/_/g, " ").toUpperCase()}
    </span>
  );
}

export default StatusPill;
