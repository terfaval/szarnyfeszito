import { Icon } from "@/ui/icons/Icon";

type GateItem = {
  label: string;
  ok: boolean;
};

type GateChecklistProps = {
  heading?: string;
  description?: string;
  items: GateItem[];
};

export function GateChecklist({
  heading,
  description,
  items,
}: GateChecklistProps) {
  return (
    <section className="space-y-3 rounded-[16px] border border-white/10 bg-zinc-950/60 p-4">
      {heading && (
        <header>
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">{heading}</p>
          {description && <p className="text-sm text-zinc-400">{description}</p>}
        </header>
      )}
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between rounded-[12px] border border-zinc-800 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em]"
          >
            <span className="flex items-center gap-2 text-white">
              <Icon name={item.ok ? "accept" : "delete"} size={14} className="text-current" />
              {item.label}
            </span>
            <span className={item.ok ? "text-emerald-200" : "text-rose-400"}>
              {item.ok ? "Complete" : "Incomplete"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default GateChecklist;
