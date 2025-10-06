"use client";

import { useEffect, useMemo, useState } from "react";
import type { Sighting } from "@/lib/types";
import { X } from "lucide-react";

const SPECIES = [
  "Fehér gólya (Ciconia ciconia)",
  "Daru (Grus grus)",
  "Jégmadár (Alcedo atthis)",
  "Búbosbanka (Upupa epops)",
  "Szajkó (Garrulus glandarius)",
  "Kanalasgém (Platalea leucorodia)",
  "Kis kárókatona (Microcarbo pygmaeus)",
  "Darázsölyv (Pernis apivorus)"
];

export default function AddSightingSheet({
  open,
  onClose,
  onSave,
  initial
}: {
  open: boolean;
  onClose: () => void;
  onSave: (s: Sighting) => void;
  initial?: Partial<Sighting>;
}) {
  const [species, setSpecies] = useState(SPECIES[0]);
  const [when, setWhen] = useState<string>(new Date().toISOString().slice(0,16));
  const [lat, setLat] = useState<number | undefined>(initial?.lat);
  const [lng, setLng] = useState<number | undefined>(initial?.lng);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (initial?.lat && initial?.lng) {
      setLat(initial.lat);
      setLng(initial.lng);
    }
    if (initial?.when) {
      setWhen(initial.when.slice(0,16));
    }
  }, [initial]);

  const disabled = useMemo(() => lat === undefined || lng === undefined, [lat, lng]);

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-[500]">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      {/* sheet */}
      <div className="absolute left-0 top-0 h-full w-[460px] bg-white shadow-soft">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-lg font-semibold">Új észlelés</h2>
          <button onClick={onClose} aria-label="Bezárás"><X /></button>
        </div>

        <div className="space-y-4 p-4">
          <div>
            <label className="block text-sm font-medium mb-1">Faj</label>
            <select
              value={species}
              onChange={(e) => setSpecies(e.target.value)}
              className="w-full rounded-md border px-3 py-2"
            >
              {SPECIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Később bővítjük tudományos adatbázissal és keresővel.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Dátum és idő</label>
              <input
                type="datetime-local"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
                className="w-full rounded-md border px-3 py-2"
              />
            </div>
            <div className="self-end text-xs text-gray-600">
              Ha a térképen kattintasz, automatikusan kitöltjük a koordinátákat.
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Szélesség (lat)</label>
              <input
                type="number"
                value={lat ?? ""}
                onChange={(e) => setLat(Number(e.target.value))}
                className="w-full rounded-md border px-3 py-2"
                placeholder="pl. 47.16"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Hosszúság (lng)</label>
              <input
                type="number"
                value={lng ?? ""}
                onChange={(e) => setLng(Number(e.target.value))}
                className="w-full rounded-md border px-3 py-2"
                placeholder="pl. 19.50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Megjegyzés</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border px-3 py-2"
              rows={4}
              placeholder="Környezet, viselkedés, csapatméret, azonosítás módja stb."
            />
          </div>

          <button
            disabled={disabled}
            onClick={() => {
              if (disabled) return;
              onSave({
                id: crypto.randomUUID(),
                species,
                when: new Date(when).toISOString(),
                lat: lat!,
                lng: lng!,
                notes: notes.trim() || undefined
              });
            }}
            className="w-full rounded-md bg-brand-600 px-4 py-2 font-medium text-white shadow-soft hover:bg-brand-700 disabled:opacity-50"
          >
            Mentés
          </button>
        </div>
      </div>
    </div>
  );
}
