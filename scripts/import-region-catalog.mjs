import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined to import region catalogs."
  );
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false, detectSessionInUrl: false },
});

function chunk(array, size) {
  const out = [];
  for (let i = 0; i < array.length; i += size) {
    out.push(array.slice(i, i + size));
  }
  return out;
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    throw new Error("Usage: node scripts/import-region-catalog.mjs <globalRegions.json|hungaryRegions.json>");
  }

  const fullPath = path.resolve(process.cwd(), file);
  const raw = await fs.readFile(fullPath, "utf-8");
  const parsed = JSON.parse(raw);

  const catalog = parsed?.catalog;
  if (catalog !== "globalRegions" && catalog !== "hungaryRegions") {
    throw new Error(`Unexpected catalog: ${String(catalog)}`);
  }

  const regions = Array.isArray(parsed?.regions) ? parsed.regions : null;
  if (!regions) {
    throw new Error("Invalid file: expected { regions: [...] }");
  }

  const now = new Date().toISOString();
  const rows = regions.map((r) => ({
    region_id: String(r.region_id ?? ""),
    catalog,
    scope: String(r.scope ?? ""),
    type: String(r.type ?? ""),
    source: String(r.source ?? ""),
    name: String(r.name ?? ""),
    bbox: r.bbox ?? null,
    geometry: r.geometry ?? null,
    schema_version: "v1",
    updated_at: now,
  }));

  const invalid = rows.find(
    (r) => !r.region_id || !r.scope || !r.type || !r.source || !r.name || !r.bbox || !r.geometry
  );
  if (invalid) {
    throw new Error(
      `Invalid row encountered (missing required fields). Example region_id=${JSON.stringify(invalid.region_id)}`
    );
  }

  const batches = chunk(rows, 100);
  for (let i = 0; i < batches.length; i += 1) {
    const batch = batches[i];
    const { error } = await supabase
      .from("distribution_region_catalog_items")
      .upsert(batch, { onConflict: "region_id" });
    if (error) {
      throw new Error(`Upsert failed on batch ${i + 1}/${batches.length}: ${error.message}`);
    }
    process.stdout.write(`Imported ${Math.min((i + 1) * 100, rows.length)}/${rows.length}\n`);
  }

  process.stdout.write(`[OK] Imported ${rows.length} items into distribution_region_catalog_items (${catalog}).\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
