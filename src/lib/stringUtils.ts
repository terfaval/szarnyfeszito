export function normalizeHungarianName(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }

  const firstChar = trimmed[0].toLocaleUpperCase("hu-HU");
  return `${firstChar}${trimmed.slice(1)}`;
}
