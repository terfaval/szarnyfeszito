// /src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Megjegyzés: publikus, read-only lekérdezésekhez bőven elég.
// Ha később auth kell, visszahozzuk a cookie-s SSR kliens verziót.
