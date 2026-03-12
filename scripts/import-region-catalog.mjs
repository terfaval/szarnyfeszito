import dotenv from "dotenv";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";
import { createClient } from "@supabase/supabase-js";

import StreamJson from "stream-json";
import PickPkg from "stream-json/filters/Pick.js";
import StreamArrayPkg from "stream-json/streamers/StreamArray.js";

const { parser } = StreamJson;
const { pick } = PickPkg;
const { streamArray } = StreamArrayPkg;

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptsDir, "..");
dotenv.config({ path: path.join(repoRoot, ".env.local") });
dotenv.config({ path: path.join(repoRoot, ".env") });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const DEFAULT_BATCH_ROWS = 20;
const DEFAULT_BATCH_BYTES = 5 * 1024 * 1024;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function validateCatalog(catalog) {
  if (
    catalog !== "globalRegions" &&
    catalog !== "hungaryRegions" &&
    catalog !== "hungaryExtendedRegions"
  ) {
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

function getJsonSizeBytes(value) {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

function formatCause(err) {
  const anyErr = err ?? null;
  const cause = anyErr && typeof anyErr === "object" && "cause" in anyErr ? anyErr.cause : null;
  if (!cause) return null;

  if (cause instanceof Error) {
    const extra = [];
    if ("code" in cause && typeof cause.code === "string") extra.push(`code=${cause.code}`);
    if ("errno" in cause && (typeof cause.errno === "number" || typeof cause.errno === "string")) {
      extra.push(`errno=${cause.errno}`);
    }
    if ("syscall" in cause && typeof cause.syscall === "string") extra.push(`syscall=${cause.syscall}`);
    return extra.length ? `${cause.name}: ${cause.message} (${extra.join(", ")})` : `${cause.name}: ${cause.message}`;
  }

  if (typeof cause === "string") return cause;
  try {
    return JSON.stringify(cause);
  } catch {
    return String(cause);
  }
}

function createJsonReadStream(fullPath) {
  const input = fs.createReadStream(fullPath);
  if (fullPath.toLowerCase().endsWith(".gz")) {
    return { stream: input.pipe(zlib.createGunzip()), destroy: () => input.destroy() };
  }
  return { stream: input, destroy: () => input.destroy() };
}

async function upsertBatch(batch, batchIndex, totalImported, catalog, supabase) {
  let lastErr;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const payloadBytes = getJsonSizeBytes(batch);

      console.log(
        `Uploading batch ${batchIndex} attempt ${attempt}: rows=${batch.length}, payloadMB=${(
          payloadBytes /
          1024 /
          1024
        ).toFixed(2)}`
      );

      const { error } = await supabase
        .from("distribution_region_catalog_items")
        .upsert(batch, { onConflict: "catalog,region_id" });

      if (error) {
        throw new Error(error.message);
      }

      process.stdout.write(`Imported ${totalImported} rows\n`);
      return;
    } catch (err) {
      lastErr = err;
      console.error(`Batch ${batchIndex} failed on attempt ${attempt}`);
      console.error("Batch size:", batch.length);
      console.error("First region_id:", batch[0]?.region_id);
      console.error("Last region_id:", batch[batch.length - 1]?.region_id);
      const nested = formatCause(err);
      console.error("Cause:", err);
      if (nested) console.error("Cause (nested):", nested);

      if (attempt < 3) {
        await sleep(1000 * attempt);
      }
    }
  }

  throw new Error(
    `Upsert failed on batch ${batchIndex} for ${catalog}: ${lastErr?.message ?? "Unknown error"}`
  );
}

async function readCatalogFromFile(fullPath) {
  return new Promise((resolve, reject) => {
    let resolved = false;
    let expectCatalogValue = false;

    const { stream, destroy } = createJsonReadStream(fullPath);
    const jsonParser = parser();

    stream.on("error", reject);
    jsonParser.on("error", reject);

    jsonParser.on("data", ({ name, value }) => {
      if (name === "keyValue" && value === "catalog") {
        expectCatalogValue = true;
        return;
      }

      if (expectCatalogValue && name === "stringValue") {
        resolved = true;
        resolve(value);
        destroy();
      }
    });

    jsonParser.on("end", () => {
      if (!resolved) {
        reject(new Error("Could not determine catalog from JSON."));
      }
    });

    stream.pipe(jsonParser);
  });
}

function parseArgs(argv) {
  const out = {
    files: [],
    batchRows: DEFAULT_BATCH_ROWS,
    batchBytes: DEFAULT_BATCH_BYTES,
    sleepMs: 0,
    dryRun: false,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--") {
      out.files.push(...argv.slice(i + 1));
      break;
    }
    if (arg === "--dry-run") {
      out.dryRun = true;
      continue;
    }
    if (arg === "--batch-rows") {
      const value = Number(argv[i + 1]);
      if (!Number.isFinite(value) || value <= 0) {
        throw new Error(`Invalid --batch-rows: ${String(argv[i + 1])}`);
      }
      out.batchRows = Math.floor(value);
      i += 1;
      continue;
    }
    if (arg === "--batch-mb") {
      const value = Number(argv[i + 1]);
      if (!Number.isFinite(value) || value <= 0) {
        throw new Error(`Invalid --batch-mb: ${String(argv[i + 1])}`);
      }
      out.batchBytes = Math.floor(value * 1024 * 1024);
      i += 1;
      continue;
    }
    if (arg === "--sleep-ms") {
      const value = Number(argv[i + 1]);
      if (!Number.isFinite(value) || value < 0) {
        throw new Error(`Invalid --sleep-ms: ${String(argv[i + 1])}`);
      }
      out.sleepMs = Math.floor(value);
      i += 1;
      continue;
    }

    if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}`);
    }

    out.files.push(arg);
  }

  return out;
}

async function scanCatalog(fullPath, catalog) {
  let count = 0;
  let maxRowBytes = 0;
  let maxRegionId = "";
  let maxType = "";

  await new Promise((resolve, reject) => {
    const { stream } = createJsonReadStream(fullPath);
    const pipeline = stream.pipe(parser()).pipe(pick({ filter: "regions" })).pipe(streamArray());

    pipeline.on("error", reject);
    pipeline.on("data", ({ value }) => {
      count += 1;
      const row = mapRow(value, catalog, "now");
      const rowBytes = getJsonSizeBytes(row);
      if (rowBytes > maxRowBytes) {
        maxRowBytes = rowBytes;
        maxRegionId = row.region_id;
        maxType = row.type;
      }
    });
    pipeline.on("end", resolve);
  });

  console.log(
    JSON.stringify(
      {
        catalog,
        count,
        max_row_mb: Number((maxRowBytes / 1024 / 1024).toFixed(2)),
        max_row_region_id: maxRegionId,
        max_row_type: maxType,
      },
      null,
      2
    )
  );
}

async function importCatalogFile(args) {
  const { file, supabase, batchRows, batchByteLimit, sleepMs, dryRun } = args;
  const fullPath = path.resolve(process.cwd(), file);
  const now = new Date().toISOString();

  const stat = fs.statSync(fullPath);
  process.stdout.write(
    `Reading ${fullPath} (${(stat.size / 1024 / 1024).toFixed(2)} MB)\n`
  );

  const catalog = await readCatalogFromFile(fullPath);
  validateCatalog(catalog);

  if (dryRun) {
    await scanCatalog(fullPath, catalog);
    return;
  }

  let batch = [];
  let currentBatchBytes = 0;
  let imported = 0;
  let batchIndex = 0;

  await new Promise((resolve, reject) => {
    const { stream: input } = createJsonReadStream(fullPath);
    const pipeline = input.pipe(parser()).pipe(pick({ filter: "regions" })).pipe(streamArray());

    let processing = Promise.resolve();
    let failed = false;

    const flushBatch = async () => {
      if (batch.length === 0) return;

      batchIndex += 1;
      const currentBatch = batch;
      batch = [];
      currentBatchBytes = 0;

      await upsertBatch(currentBatch, batchIndex, imported + currentBatch.length, catalog, supabase);
      if (sleepMs > 0) {
        await sleep(sleepMs);
      }

      imported += currentBatch.length;
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
          const rowBytes = getJsonSizeBytes(row);

          if (rowBytes > batchByteLimit) {
            throw new Error(
              `Single row exceeds batch byte limit (${(
                rowBytes / 1024 / 1024
              ).toFixed(2)} MB). region_id=${row.region_id}`
            );
          }

          const wouldExceedRowLimit = batch.length >= batchRows;
          const wouldExceedByteLimit =
            batch.length > 0 && currentBatchBytes + rowBytes > batchByteLimit;

          if (wouldExceedRowLimit || wouldExceedByteLimit) {
            await flushBatch();
          }

          batch.push(row);
          currentBatchBytes += rowBytes;
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

async function main() {
  const parsed = parseArgs(process.argv);
  if (parsed.files.length === 0) {
    throw new Error(
      [
        "Usage: node scripts/import-region-catalog.mjs [options] <globalRegions.json(.gz)> [hungaryRegions.json(.gz)> [hungaryExtendedRegions.json(.gz) ...]",
        "",
        "Options:",
        "  --dry-run              Scan only (no uploads).",
        "  --batch-rows <n>       Default: 20",
        "  --batch-mb <mb>        Default: 5",
        "  --sleep-ms <ms>        Optional delay after each batch.",
      ].join("\n")
    );
  }

  if (!parsed.dryRun && (!supabaseUrl || !supabaseServiceRoleKey)) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined to import region catalogs."
    );
  }

  const supabase = parsed.dryRun
    ? null
    : createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: { persistSession: false, detectSessionInUrl: false },
      });

  for (const file of parsed.files) {
    await importCatalogFile({
      file,
      supabase,
      batchRows: parsed.batchRows,
      batchByteLimit: parsed.batchBytes,
      sleepMs: parsed.sleepMs,
      dryRun: parsed.dryRun,
    });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});