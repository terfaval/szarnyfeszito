// /src/lib/queries/species.ts
import { supabase } from '@/lib/supabaseClient';
import type { Species, ScientificSpeciesDescription, NarrativeText } from '@/lib/types';

export async function getSpeciesPage(speciesId: string): Promise<{
  species: Species;
  sci: ScientificSpeciesDescription | null;
  narratives: NarrativeText[];
}> {
  const { data: species, error: e1 } = await supabase
    .from('species')
    .select('*')
    .eq('id', speciesId)
    .single();

  if (e1 || !species) throw e1 ?? new Error('Species not found');

  const { data: sci, error: e2 } = await supabase
    .from('scientific_species_descriptions')
    .select('*')
    .eq('species_id', speciesId)
    .maybeSingle();

  if (e2) throw e2;

  const { data: narratives, error: e3 } = await supabase
    .from('narrative_texts')
    .select('*')
    .eq('species_id', speciesId)
    .eq('status', 'published')
    .order('order_index', { ascending: true });

  if (e3) throw e3;

  return {
    species: species as Species,
    sci: (sci ?? null) as ScientificSpeciesDescription | null,
    narratives: (narratives ?? []) as NarrativeText[],
  };
}
