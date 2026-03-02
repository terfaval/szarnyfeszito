import { BirdStatus } from "@/types/bird";

const STATUS_CLASSES: Record<BirdStatus, string> = {
  draft: "bg-zinc-700 text-white",
  text_generated: "bg-amber-500/10 text-amber-200",
  text_approved: "bg-emerald-500/10 text-emerald-200",
  images_generated: "bg-sky-500/10 text-sky-200",
  images_approved: "bg-emerald-500/20 text-emerald-100",
  published: "bg-amber-400/20 text-amber-100",
};

type StatusPillProps = {
  status: BirdStatus;
};

export function StatusPill({ status }: StatusPillProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.4em] ${STATUS_CLASSES[status]}`}
    >
      {status.replace(/_/g, " ").toUpperCase()}
    </span>
  );
}

export default StatusPill;
