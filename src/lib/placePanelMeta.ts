type PlaceMetaArgs = {
  typeLabel: string;
  county: string | null;
  nearestCity: string | null;
};

export function buildPlaceMetaLine({ typeLabel, county, nearestCity }: PlaceMetaArgs): string {
  const region = county?.trim() || nearestCity?.trim() || "";
  return region ? `${typeLabel} · ${region}` : typeLabel;
}