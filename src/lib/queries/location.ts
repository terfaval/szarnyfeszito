// /src/lib/queries/location.ts
import { supabase } from '@/lib/supabaseClient';

export async function getLocationPage(locationId: string) {
  const { data: location, error: e1 } = await supabase
    .from('locations').select('*').eq('id', locationId).single();
  if (e1 || !location) throw e1 ?? new Error('Location not found');

  const { data: seasons, error: e2 } = await supabase
    .from('location_seasons').select('*').eq('location_id', locationId).order('season');
  if (e2) throw e2;

  const { data: speciesList, error: e3 } = await supabase
    .from('location_species')
    .select('*, species:species_id(common_name_hu, scientific_name)')
    .eq('location_id', locationId)
    .order('likelihood');
  if (e3) throw e3;

  const { data: narratives, error: e4 } = await supabase
    .from('narrative_texts')
    .select('*')
    .eq('location_id', locationId)
    .eq('status', 'published')
    .order('order_index', { ascending: true });
  if (e4) throw e4;

  return { location, seasons, speciesList, narratives };
}
