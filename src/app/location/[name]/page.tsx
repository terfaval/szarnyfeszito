'use client';

import { useData } from '@/lib/DataContext';

function prettySeason(s: 'spring' | 'autumn' | 'both') {
  return s === 'spring' ? 'Tavasz' : s === 'autumn' ? 'Ősz' : 'Mindkettő';
}

export default function LocationPage({ params }: { params: { name: string } }) {
  const { locationsByName, locSeasons, locSpecies, speciesBySci, sciLoc } = useData();
  const decoded = decodeURIComponent(params.name);
  const loc = locationsByName.get(decoded);
  if (!loc) return <div className="p-6">Helyszín nem található.</div>;

  const seasons = locSeasons.filter((s) => s.location_name === loc.name);
  const links = locSpecies.filter((ls) => ls.location_name === loc.name);
  const notes = sciLoc.filter((n) => n.location_name === loc.name);

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <header>
        <h1 className="text-3xl font-bold">{loc.name}</h1>
        <p className="text-slate-600">
          {loc.region} • {loc.habitat_types.join(' • ')}
        </p>
        <p className="mt-3">{loc.best_time_hint}</p>
        <p className="mt-1 text-sm text-slate-600">{loc.access_info}</p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="font-semibold mb-2">Szezonok</h2>
          <ul className="list-disc ml-5">
            {seasons.map((s) => (
              <li key={`${s.season}-${s.start_month}-${s.end_month}`}>
                <strong>{prettySeason(s.season)}</strong> • {s.start_month}–{s.end_month}. hó
                {s.peak_weeks?.length ? ` • csúcs hetek: ${s.peak_weeks.join(', ')}` : ''}
                {s.notes ? ` — ${s.notes}` : ''}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="font-semibold mb-2">Megfigyelhető fajok</h2>
          <ul className="space-y-2">
            {links.map((ls) => {
              const sp = speciesBySci.get(ls.species_sci);
              return (
                <li key={`${ls.species_sci}-${ls.season}`} className="border rounded-lg p-3">
                  <div className="font-medium">
                    {sp?.common_name_hu ?? ls.species_sci}{' '}
                    <span className="text-slate-500">({ls.season})</span>
                  </div>
                  <div className="text-sm text-slate-600">
                    {ls.likelihood} • {ls.count_scale} • {ls.best_time_of_day} • {ls.observation_style}
                  </div>
                  {ls.notes && <div className="text-sm mt-1">{ls.notes}</div>}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {!!notes.length && (
        <section className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="font-semibold mb-2">Tudnivalók</h2>
          {notes.map((n) => (
            <div key={n.season} className="mb-4">
              <h3 className="font-medium">{prettySeason(n.season as any)}</h3>
              <p className="mt-1"><strong>Fenológia:</strong> {n.phenology_md}</p>
              <p className="mt-1"><strong>Kímélet:</strong> {n.conservation_md}</p>
              <p className="mt-1"><strong>Kezelés:</strong> {n.management_md}</p>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
