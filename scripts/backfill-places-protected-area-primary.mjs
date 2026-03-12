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
  const out = { dryRun: false, limit: 5000 };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") {
      out.dryRun = true;
      continue;
    }
    if (arg === "--limit") {
      const value = Number(argv[i + 1]);
      if (!Number.isFinite(value) || value <= 0) {
        throw new Error(`Invalid --limit: ${String(argv[i + 1])}`);
      }
      out.limit = Math.floor(value);
      i += 1;
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }
  return out;
}

function pickSafePrimary(placeTypes) {
  if (!Array.isArray(placeTypes)) return null;
  const normalized = placeTypes
    .filter((v) => typeof v === "string")
    .map((v) => v.trim())
    .filter(Boolean);
  return normalized.find((t) => t !== "protected_area") ?? null;
}

async function main() {
  const args = parseArgs(process.argv);

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined.");
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, detectSessionInUrl: false },
  });

  const { data: rows, error } = await supabase
    .from("places")
    .select("id,slug,name,place_type,place_types")
    .eq("place_type", "protected_area")
    .limit(args.limit);

  if (error) {
    throw new Error(error.message);
  }

  const items = Array.isArray(rows) ? rows : [];
  const fixable = [];
  const manual = [];

  items.forEach((row) => {
    const safe = pickSafePrimary(row.place_types);
    if (!safe) {
      manual.push({
        id: String(row.id ?? ""),
        slug: String(row.slug ?? ""),
        name: String(row.name ?? ""),
        place_type: String(row.place_type ?? ""),
        place_types: row.place_types ?? null,
      });
      return;
    }
    fixable.push({
      id: String(row.id ?? ""),
      slug: String(row.slug ?? ""),
      name: String(row.name ?? ""),
      from: "protected_area",
      to: safe,
      place_types: row.place_types ?? null,
    });
  });

  if (args.dryRun) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          dry_run: true,
          total: items.length,
          fixable: fixable.length,
          manual: manual.length,
          manual_examples: manual.slice(0, 10),
        },
        null,
        2
      )
    );
    return;
  }

  for (const item of fixable) {
    const { error: updateError } = await supabase
      .from("places")
      .update({ place_type: item.to })
      .eq("id", item.id);
    if (updateError) {
      throw new Error(updateError.message);
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        updated: fixable.length,
        manual: manual.length,
        manual_examples: manual.slice(0, 25),
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

