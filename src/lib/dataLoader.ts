import type {
  Location, Species, LocationSeason, LocationSpecies,
  ScientificLocationNote, ScientificSpeciesDescription
} from './types';

const BASE = '/data';

async function get<T>(file: string): Promise<T> {
  if (typeof window !== 'undefined') {
    const k = `sf-cache:${file}`;
    const cached = localStorage.getItem(k);
    if (cached) return JSON.parse(cached) as T;
  }
  const res = await fetch(`${BASE}/${file}`, { cache: 'force-cache' });
  if (!res.ok) throw new Error(`Cannot load ${file}`);
  const data = (await res.json()) as T;
  if (typeof window !== 'undefined') {
    localStorage.setItem(`sf-cache:${file}`, JSON.stringify(data));
  }
  return data;
}

export async function loadAll() {
  const [locations, species, locSeasons, locSpecies, sciLoc, sciSp] = await Promise.all([
    get<Location[]>('locations.json'),
    get<Species[]>('species.json'),
    get<LocationSeason[]>('location_seasons.json'),
    get<LocationSpecies[]>('location_species.json'),
    get<ScientificLocationNote[]>('scientific_location_notes.json'),
    get<ScientificSpeciesDescription[]>('scientific_species_descriptions.json'),
  ]);

  const speciesBySci = new Map(species.map((s) => [s.scientific_name, s]));
  const locationsByName = new Map(locations.map((l) => [l.name, l]));

  return { locations, species, locSeasons, locSpecies, sciLoc, sciSp, speciesBySci, locationsByName };
}
