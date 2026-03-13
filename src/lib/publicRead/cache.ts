export const PUBLIC_READ_REVALIDATE_SECONDS = 120;
export const PUBLIC_API_S_MAXAGE_SECONDS = 120;
export const PUBLIC_API_STALE_WHILE_REVALIDATE_SECONDS = 60;

export function publicApiCacheControlValue() {
  return `public, s-maxage=${PUBLIC_API_S_MAXAGE_SECONDS}, stale-while-revalidate=${PUBLIC_API_STALE_WHILE_REVALIDATE_SECONDS}`;
}

export function isPublicReadObservabilityEnabled() {
  return process.env.PUBLIC_READ_OBSERVABILITY === "1";
}

export function logPublicReadRegenerate(name: string, meta: Record<string, unknown>) {
  if (!isPublicReadObservabilityEnabled()) return;
  console.info(`[publicRead:${name}] regenerate`, meta);
}

export function jsonByteSize(value: unknown) {
  const json = JSON.stringify(value);
  return Buffer.byteLength(json, "utf8");
}

