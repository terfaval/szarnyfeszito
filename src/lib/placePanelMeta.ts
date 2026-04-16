type PlaceMetaArgs = {
  typeLabel: string;
  county: string | null;
  nearestCity: string | null;
};

export function buildPlaceMetaLine({ typeLabel, county, nearestCity }: PlaceMetaArgs): string {
  const region = county?.trim() || nearestCity?.trim() || "";
  return region ? `${typeLabel} \u00b7 ${region}` : typeLabel;
}
