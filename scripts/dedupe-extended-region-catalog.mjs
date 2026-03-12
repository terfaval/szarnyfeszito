import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import StreamJson from "stream-json";
import PickPkg from "stream-json/filters/Pick.js";
import StreamArrayPkg from "stream-json/streamers/StreamArray.js";

const { parser } = StreamJson;
const { pick } = PickPkg;
const { streamArray } = StreamArrayPkg;

function parseArgs(argv) {
  const out = {
    hungaryFile: "",
    extendedFile: "",
    outFile: "",
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--hungary") {
      out.hungaryFile = String(argv[i + 1] ?? "");
      i += 1;
      continue;
    }

    if (arg === "--extended") {
      out.extendedFile = String(argv[i + 1] ?? "");
      i += 1;
      continue;
    }

    if (arg === "--out") {
      out.outFile = String(argv[i + 1] ?? "");
      i += 1;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  if (!out.hungaryFile || !out.extendedFile || !out.outFile) {
    throw new Error(
      [
        "Usage:",
        "  node scripts/dedupe-extended-region-catalog.mjs --hungary <hungaryRegions.json(.gz)> --extended <hungaryExtendedRegions.json(.gz)> --out <hungaryExtendedRegions.deduped.json>",
      ].join("\n")
    );
  }

  return out;
}

function createJsonReadStream(fullPath) {
  const input = fs.createReadStream(fullPath);
  if (fullPath.toLowerCase().endsWith(".gz")) {
    return input.pipe(zlib.createGunzip());
  }
  return input;
}

async function readWholeJson(fullPath) {
  const resolved = path.resolve(process.cwd(), fullPath);
  const input = createJsonReadStream(resolved);

  const chunks = [];
  await new Promise((resolve, reject) => {
    input.on("data", (chunk) => chunks.push(chunk));
    input.on("end", resolve);
    input.on("error", reject);
  });

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function collectRegionIds(fullPath) {
  const resolved = path.resolve(process.cwd(), fullPath);
  const ids = new Set();

  await new Promise((resolve, reject) => {
    const input = createJsonReadStream(resolved);
    const pipeline = input.pipe(parser()).pipe(pick({ filter: "regions" })).pipe(streamArray());

    pipeline.on("data", ({ value }) => {
      const regionId = String(value?.region_id ?? "");
      if (regionId) ids.add(regionId);
    });

    pipeline.on("end", resolve);
    pipeline.on("error", reject);
    input.on("error", reject);
  });

  return ids;
}

async function main() {
  const args = parseArgs(process.argv);

  const hungaryIds = await collectRegionIds(args.hungaryFile);
  const extended = await readWholeJson(args.extendedFile);

  if (extended.catalog !== "hungaryExtendedRegions") {
    throw new Error(`Unexpected catalog in extended file: ${String(extended.catalog)}`);
  }

  const originalRegions = Array.isArray(extended.regions) ? extended.regions : [];
  const removed = [];
  const kept = [];

  for (const region of originalRegions) {
    const regionId = String(region?.region_id ?? "");
    if (hungaryIds.has(regionId)) {
      removed.push(regionId);
      continue;
    }
    kept.push(region);
  }

  const output = {
    ...extended,
    deduped_against: "hungaryRegions",
    dedupe_key: "region_id",
    regions: kept,
  };

  const outPath = path.resolve(process.cwd(), args.outFile);
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), "utf8");

  console.log(
    JSON.stringify(
      {
        ok: true,
        input_hungary_count: hungaryIds.size,
        input_extended_count: originalRegions.length,
        removed_count: removed.length,
        output_count: kept.length,
        out_file: outPath,
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