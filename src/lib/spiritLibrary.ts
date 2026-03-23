import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { SpiritLibrary, validateSpiritLibrary } from "./spiritSchema";

const LIBRARY_PATH = join(process.cwd(), "data", "spirit", "library.json");

export async function loadSpiritLibrary(): Promise<SpiritLibrary> {
  const raw = await readFile(LIBRARY_PATH, "utf-8");
  const parsed = JSON.parse(raw);
  return validateSpiritLibrary(parsed);
}
