// /src/app/species/[id]/page.tsx
import { getSpeciesPage } from '@/lib/queries/species';
import type { NarrativeText } from '@/lib/types';

export default async function SpeciesPage({ params }: { params: { id: string } }) {
  const { species, sci, narratives } = await getSpeciesPage(params.id);

  const full: NarrativeText | undefined = narratives.find(
    (n: NarrativeText) => n.placement === 'full'
  );
  const side: NarrativeText[] = narratives.filter((n: NarrativeText) => n.placement !== 'full');

  return (
    <main className="mx-auto max-w-5xl p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
      <article className="lg:col-span-2 space-y-4">
        <h1 className="text-3xl font-bold">
          {species.common_name_hu}{' '}
          <span className="text-gray-500 italic">({species.scientific_name})</span>
        </h1>

        {full ? (
          <>
            {full.title && <h2 className="text-xl font-semibold">{full.title}</h2>}
            <div
              className="prose prose-neutral"
              dangerouslySetInnerHTML={{ __html: mdToHtml(full.body_md) }}
            />
          </>
        ) : (
          <p className="text-gray-500">Ehhez a fajhoz még nincs fő narratíva.</p>
        )}

        {sci && (
          <section className="mt-8 border-t pt-6">
            <h3 className="text-lg font-semibold">Tények (rövid)</h3>
            <ul className="list-disc ml-6">
              {sci.id_markings_md && <li>Azonosítás: {sci.id_markings_md}</li>}
              {sci.voice_md && <li>Hang: {sci.voice_md}</li>}
              {sci.habitat_md && <li>Élőhely: {sci.habitat_md}</li>}
              {sci.phenology_md && <li>Fenológia: {sci.phenology_md}</li>}
            </ul>
          </section>
        )}
      </article>

      <aside className="space-y-4">
        {side.map((n: NarrativeText) => (
          <div key={n.id} className="rounded-2xl border p-4 shadow-sm bg-white">
            {n.title && <h4 className="font-semibold mb-2">{n.title}</h4>}
            <div className="prose prose-sm" dangerouslySetInnerHTML={{ __html: mdToHtml(n.body_md) }} />
          </div>
        ))}
      </aside>
    </main>
  );
}

// nagyon egyszerű md -> html (később tegyél be rendes renderert)
function mdToHtml(md: string) {
  return md
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>');
}
