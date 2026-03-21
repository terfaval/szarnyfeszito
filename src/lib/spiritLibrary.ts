import rawLibrary from "../../data/spirit/library.json";
import { SpiritLibrary, validateSpiritLibrary } from "./spiritSchema";

let cached: SpiritLibrary | null = null;

export function loadSpiritLibrary(): SpiritLibrary {
  if (cached) {
    return cached;
  }

  cached = validateSpiritLibrary(rawLibrary);
  return cached;
}
