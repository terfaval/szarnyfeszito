import { z } from "zod";
import { PLACE_NOTABLE_UNIT_TYPE_VALUES, type PlaceNotableUnit, type PlaceNotableUnitType } from "@/types/place";

const unitTypeEnum = PLACE_NOTABLE_UNIT_TYPE_VALUES as unknown as [
  PlaceNotableUnitType,
  ...PlaceNotableUnitType[],
];

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asOptionalTrimmedString(value: unknown): string | null {
  const s = asTrimmedString(value);
  return s ? s : null;
}

function normalizeUnitType(value: unknown): PlaceNotableUnitType | null {
  const raw = asTrimmedString(value);
  if (!raw) return null;
  return PLACE_NOTABLE_UNIT_TYPE_VALUES.includes(raw as PlaceNotableUnitType)
    ? (raw as PlaceNotableUnitType)
    : null;
}

function isNumericOnly(value: string): boolean {
  return /^[\d\s.,]+$/.test(value) && /[\d]/.test(value) && !/[a-zA-Z\u00C0-\u024F]/.test(value);
}

function normalizeDistanceText(value: unknown): string | null {
  const s = asOptionalTrimmedString(value);
  if (!s) return null;
  if (isNumericOnly(s)) return null;
  return s;
}

function toIntOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim()) {
    const n = Number(value.trim());
    if (Number.isFinite(n)) return Math.trunc(n);
  }
  return null;
}

function normalizeName(value: unknown): string {
  return asTrimmedString(value).replace(/\s+/g, " ");
}

function normalizeShortNote(value: unknown): string {
  return asTrimmedString(value).replace(/\s+/g, " ");
}

const placeNotableUnitSchemaV1 = z
  .object({
    name: z.string().trim().min(1),
    unit_type: z.enum(unitTypeEnum).nullable(),
    distance_text: z.string().trim().min(1).nullable(),
    short_note: z.string().trim().min(1),
    order_index: z.number().int().min(1),
  })
  .strict();

export function normalizePlaceNotableUnits(input: unknown): PlaceNotableUnit[] {
  if (!Array.isArray(input)) return [];

  const normalized = input
    .map((raw, index): PlaceNotableUnit | null => {
      if (!raw || typeof raw !== "object") return null;
      const row = raw as Record<string, unknown>;

      const name = normalizeName(row.name);
      const short_note = normalizeShortNote(row.short_note ?? row.note);
      if (!name || !short_note) return null;

      const unit_type = normalizeUnitType(row.unit_type ?? row.type);
      const distance_text = normalizeDistanceText(row.distance_text ?? row.distance);

      const orderCandidate = toIntOrNull(row.order_index);
      const order_index = orderCandidate && orderCandidate > 0 ? orderCandidate : index + 1;

      const parsed = placeNotableUnitSchemaV1.safeParse({
        name,
        unit_type,
        distance_text,
        short_note,
        order_index,
      });

      return parsed.success ? parsed.data : null;
    })
    .filter((row): row is PlaceNotableUnit => Boolean(row))
    .sort((a, b) => a.order_index - b.order_index || a.name.localeCompare(b.name, "hu"));

  const deduped: PlaceNotableUnit[] = [];
  const seen = new Set<string>();
  for (const row of normalized) {
    const key = row.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(row);
    if (deduped.length >= 8) break;
  }

  return deduped.map((row, idx) => ({ ...row, order_index: idx + 1 }));
}

