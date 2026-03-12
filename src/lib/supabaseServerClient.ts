import { createClient } from "@supabase/supabase-js";
import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from "@/lib/config";
import { assertSupabaseServiceRoleKey } from "@/lib/supabaseKeyValidation";

assertSupabaseServiceRoleKey(SUPABASE_SERVICE_ROLE_KEY);

export const supabaseServerClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    detectSessionInUrl: false,
  },
});
