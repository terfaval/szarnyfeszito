"use client";

import { CalendarDays, ExternalLink } from "lucide-react";

export default function RightPanel() {
  return (
    <aside className="flex h-full flex-col">
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">Közelgő események</h2>
        <p className="text-sm text-gray-600">
          Rendszer események + partnerek (MME) – később API-ból.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 1) Rendszer: vonulás */}
        <EventCard
          title="Daruvonulás csúcsa (Hortobágy)"
          date="2025-10-15 – 2025-11-10"
          excerpt="Hajnal/alkony megfigyelések, több ezer példány."
          image="https://images.unsplash.com/photo-1511295742361-2d9d4f4f3c69?q=80&w=1200&auto=format&fit=crop"
        />

        {/* 2) Rendszer: fészkelési aktivitás */}
        <EventCard
          title="Gémtelepek aktivitása (Kiskunság)"
          date="2025-04-01 – 2025-06-15"
          excerpt="Kanalasgém, kócsag, szürke gém – etikett és távolságtartás!"
          image="https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=1200&auto=format&fit=crop"
        />

        {/* 3) Partner (MME) – placeholder */}
        <EventCard
          title="MME terepnap – kezdőknek"
          date="2025-10-12"
          excerpt="Távcsőpróba, azonosítási alapismeretek, rövid séta."
          image="https://images.unsplash.com/photo-1503264116251-35a269479413?q=80&w=1200&auto=format&fit=crop"
          linkLabel="Esemény oldala"
          href="#"
        />

        <EventCard
          title="MME fotós workshop – vízimadarak"
          date="2025-11-02"
          excerpt="Kompozíció, terepi etika, eszközhasználat."
          image="https://images.unsplash.com/photo-1497206365907-f5e630693df0?q=80&w=1200&auto=format&fit=crop"
          linkLabel="Esemény oldala"
          href="#"
        />
      </div>
    </aside>
  );
}

function EventCard({
  title, date, excerpt, image, href, linkLabel
}: {
  title: string; date: string; excerpt: string; image: string;
  href?: string; linkLabel?: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-white shadow-soft">
      <div className="aspect-[16/9] w-full bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="" className="h-full w-full object-cover" />
      </div>
      <div className="p-3">
        <h3 className="font-semibold">{title}</h3>
        <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
          <CalendarDays className="h-4 w-4" /> {date}
        </div>
        <p className="mt-2 text-sm text-gray-700">{excerpt}</p>
        {href && (
          <a
            href={href}
            className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-brand-700 hover:underline"
          >
            {linkLabel ?? "Megnyitás"} <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>
    </div>
  );
}
