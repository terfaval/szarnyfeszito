'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { loadAll } from './dataLoader';

type DataState = Awaited<ReturnType<typeof loadAll>>;
const Ctx = createContext<DataState | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DataState | null>(null);

  useEffect(() => {
    let alive = true;
    loadAll().then((d) => alive && setState(d)).catch(console.error);
    return () => { alive = false; };
  }, []);

  if (!state) return <div className="p-6">Adatok betöltése…</div>;
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export function useData() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useData must be used within <DataProvider>');
  return ctx;
}
