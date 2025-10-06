'use client';

import Link from 'next/link';
import { useData } from '@/lib/DataContext';

export default function Home() {
  const { locations } = useData();

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-bold mb-4">Szárnyfeszítő – helyszínek</h1>
      <ul className="grid md:grid-cols-2 gap-3">
        {locations.map((l) => (
          <li key={l.name} className="rounded-xl bg-white shadow-sm p-4">
            <Link
              href={`/location/${encodeURIComponent(l.name)}`}
              className="font-semibold hover:underline"
            >
              {l.name}
            </Link>
            <div className="text-sm text-slate-600">
              {l.region} • {l.habitat_types.join(' • ')}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
