export type PlaceBirdFilterRow = {
  bird?: unknown;
};

export function pickApprovedPlaceBirds<T extends PlaceBirdFilterRow>(rows: T[]): T[] {
  return rows.filter((row) => Boolean(row.bird));
}
