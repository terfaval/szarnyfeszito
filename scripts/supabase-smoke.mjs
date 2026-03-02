import "dotenv/config";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined to run the smoke test."
  );
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false, detectSessionInUrl: false },
});

async function runSmokeTest() {
  const slug = `smoke-${crypto.randomUUID()}`;
  const birdRows = {
    slug,
    name_hu: "Szarnyfeszito Smoke Test",
    name_latin: "Testus avianus",
  };

  const { data: inserted, error } = await supabase
    .from("birds")
    .insert(birdRows)
    .select("*")
    .single();

  if (error || !inserted) {
    throw new Error(`failed to insert bird: ${error?.message ?? "unknown"}`);
  }

  const { data: fetched, error: fetchError } = await supabase
    .from("birds")
    .select("*")
    .eq("slug", slug)
    .single();

  if (fetchError) {
    throw new Error(`failed to fetch bird: ${fetchError.message}`);
  }

  console.info("Supabase smoke test succeeded:");
  console.info("inserted:", inserted);
  console.info("fetched:", fetched);

  await supabase.from("birds").delete().eq("id", inserted.id);
}

runSmokeTest().catch((error) => {
  console.error("Supabase smoke test failed:", error);
  process.exit(1);
});
