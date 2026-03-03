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
    <section className="admin-panel gate-checklist">
      {heading && (
        <header>
          <p className="gate-checklist__heading">{heading}</p>
          {description && (
            <p className="gate-checklist__description">{description}</p>
          )}
        </header>
      )}
      <div className="space-y-2">
        {items.map((item) => {
          const itemState = item.ok
            ? "gate-checklist__item--complete"
            : "gate-checklist__item--pending";

          return (
            <div
              key={item.label}
              className={`gate-checklist__item ${itemState}`}
            >
              <span>
                <Icon name={item.ok ? "accept" : "delete"} size={14} />
                {item.label}
              </span>
              <span>{item.ok ? "Complete" : "Incomplete"}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default GateChecklist;
