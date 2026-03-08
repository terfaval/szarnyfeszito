import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

import StreamJson from "stream-json";
import PickPkg from "stream-json/filters/Pick.js";
import StreamArrayPkg from "stream-json/streamers/StreamArray.js";

const { parser } = StreamJson;
const { pick } = PickPkg;
const { streamArray } = StreamArrayPkg;

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

const BATCH_SIZE = 100;

async function upsertBatch(batch, batchIndex, totalImported, catalog) {
  const { error } = await supabase
    .from("distribution_region_catalog_items")
    .upsert(batch, { onConflict: "region_id" });

  if (error) {
    throw new Error(
      `Upsert failed on batch ${batchIndex} for ${catalog}: ${error.message}`
    );
  }

  process.stdout.write(`Imported ${totalImported} rows\n`);
}

function validateCatalog(catalog) {
  if (catalog !== "globalRegions" && catalog !== "hungaryRegions") {
    throw new Error(`Unexpected catalog: ${String(catalog)}`);
  }
}

function mapRow(region, catalog, now) {
  const row = {
    region_id: String(region.region_id ?? ""),
    catalog,
    scope: String(region.scope ?? ""),
    type: String(region.type ?? ""),
    source: String(region.source ?? ""),
    name: String(region.name ?? ""),
    bbox: region.bbox ?? null,
    geometry: region.geometry ?? null,
    schema_version: "v1",
    updated_at: now,
  };

  if (
    !row.region_id ||
    !row.scope ||
    !row.type ||
    !row.source ||
    !row.name ||
    !row.bbox ||
    !row.geometry
  ) {
    throw new Error(
      `Invalid row encountered (missing required fields). region_id=${JSON.stringify(
        row.region_id
      )}`
    );
  }

  return row;
}

async function readCatalogFromFile(fullPath) {
  return new Promise((resolve, reject) => {
    let resolved = false;
    let expectCatalogValue = false;

    const input = fs.createReadStream(fullPath);
    const jsonParser = parser();

    input.on("error", reject);
    jsonParser.on("error", reject);

    jsonParser.on("data", ({ name, value }) => {
      if (name === "keyValue" && value === "catalog") {
        expectCatalogValue = true;
        return;
      }

      if (expectCatalogValue && name === "stringValue") {
        resolved = true;
        resolve(value);
        input.destroy();
        jsonParser.end();
      }
    });

    jsonParser.on("end", () => {
      if (!resolved) {
        reject(new Error("Could not determine catalog from JSON."));
      }
    });

    input.pipe(jsonParser);
  });
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    throw new Error(
      "Usage: node scripts/import-region-catalog.mjs <globalRegions.json|hungaryRegions.json>"
    );
  }

  const fullPath = path.resolve(process.cwd(), file);
  const now = new Date().toISOString();

  const stat = fs.statSync(fullPath);
  process.stdout.write(
    `Reading ${fullPath} (${(stat.size / 1024 / 1024).toFixed(2)} MB)\n`
  );

  const catalog = await readCatalogFromFile(fullPath);
  validateCatalog(catalog);

  let batch = [];
  let imported = 0;
  let batchIndex = 0;

  await new Promise((resolve, reject) => {
    const input = fs.createReadStream(fullPath);
    const pipeline = input
      .pipe(parser())
      .pipe(pick({ filter: "regions" }))
      .pipe(streamArray());

    let processing = Promise.resolve();
    let failed = false;

    const flushBatch = async () => {
      if (batch.length === 0) return;
      batchIndex += 1;
      const current = batch;
      batch = [];
      await upsertBatch(current, batchIndex, imported + current.length, catalog);
      imported += current.length;
    };

    input.on("error", (err) => {
      failed = true;
      reject(err);
    });

    pipeline.on("error", (err) => {
      failed = true;
      reject(err);
    });

    pipeline.on("data", ({ value }) => {
      pipeline.pause();

      processing = processing
        .then(async () => {
          const row = mapRow(value, catalog, now);
          batch.push(row);

          if (batch.length >= BATCH_SIZE) {
            await flushBatch();
          }
        })
        .then(() => {
          if (!failed) pipeline.resume();
        })
        .catch((err) => {
          failed = true;
          reject(err);
        });
    });

    pipeline.on("end", () => {
      processing
        .then(async () => {
          await flushBatch();
          process.stdout.write(
            `[OK] Imported ${imported} items into distribution_region_catalog_items (${catalog}).\n`
          );
          resolve();
        })
        .catch(reject);
    });
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});