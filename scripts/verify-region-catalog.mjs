import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptsDir, "..");
dotenv.config({ path: path.join(repoRoot, ".env.local") });
dotenv.config({ path: path.join(repoRoot, ".env") });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function parseArgs(argv) {
  const out = { sampleGeometries: 0 };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--sample-geometries") {
      const value = Number(argv[i + 1]);
      if (!Number.isFinite(value) || value < 0) {
        throw new Error(`Invalid --sample-geometries: ${String(argv[i + 1])}`);
      }
      out.sampleGeometries = Math.floor(value);
      i += 1;
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }
  return out;
}

function bytesToMb(bytes) {
  return Number((bytes / 1024 / 1024).toFixed(2));
}

function jsonBytes(value) {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

async function verifyCatalog(supabase, catalog, sampleGeometries) {
  const { count, error: countError } = await supabase
    .from("distribution_region_catalog_items")
    .select("region_id", { count: "exact", head: true })
    .eq("catalog", catalog);

  if (countError) throw new Error(countError.message);

  const { data: rows, error } = await supabase
    .from("distribution_region_catalog_items")
    .select("region_id,type")
    .eq("catalog", catalog);

  if (error) throw new Error(error.message);

  const byType = new Map();
  (rows ?? []).forEach((r) => {
    const t = String(r.type ?? "");
    byType.set(t, (byType.get(t) ?? 0) + 1);
  });

  const out = {
    catalog,
    count: count ?? 0,
    types: Object.fromEntries(Array.from(byType.entries()).sort((a, b) => a[0].localeCompare(b[0]))),
  };

  if (sampleGeometries > 0) {
    const { data: sample, error: sampleError } = await supabase
      .from("distribution_region_catalog_items")
      .select("region_id,geometry")
      .eq("catalog", catalog)
      .limit(sampleGeometries);

    if (sampleError) throw new Error(sampleError.message);

    let maxBytes = 0;
    let maxRegionId = "";
    (sample ?? []).forEach((r) => {
      const bytes = jsonBytes(r.geometry);
      if (bytes > maxBytes) {
        maxBytes = bytes;
        maxRegionId = String(r.region_id ?? "");
      }
    });

    out.sample = {
      n: sample?.length ?? 0,
      max_geometry_mb: bytesToMb(maxBytes),
      max_geometry_region_id: maxRegionId,
    };
  }

  return out;
}

async function main() {
  const parsed = parseArgs(process.argv);

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined to verify region catalogs."
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, detectSessionInUrl: false },
  });

  const results = [];
  results.push(await verifyCatalog(supabase, "globalRegions", parsed.sampleGeometries));
  results.push(await verifyCatalog(supabase, "hungaryRegions", parsed.sampleGeometries));
  console.log(JSON.stringify({ ok: true, results }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

