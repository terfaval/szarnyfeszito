import { BirdStatus } from "@/types/bird";
import { PlaceStatus } from "@/types/place";

type StatusPillProps = {
  status: BirdStatus | PlaceStatus;
};

export function StatusPill({ status }: StatusPillProps) {
  return (
    <span className={`status-pill status-pill--${status}`}>
      {status.replace(/_/g, " ").toUpperCase()}
    </span>
  );
}

export default StatusPill;
