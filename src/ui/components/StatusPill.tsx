import { BirdStatus } from "@/types/bird";

type StatusPillProps = {
  status: BirdStatus;
};

export function StatusPill({ status }: StatusPillProps) {
  return (
    <span className={`status-pill status-pill--${status}`}>
      {status.replace(/_/g, " ").toUpperCase()}
    </span>
  );
}

export default StatusPill;
