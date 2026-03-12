function base64UrlDecodeToString(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + "=".repeat(padLen);
  return Buffer.from(padded, "base64").toString("utf8");
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payloadJson = base64UrlDecodeToString(parts[1] ?? "");
    const payload = JSON.parse(payloadJson) as unknown;
    if (!payload || typeof payload !== "object") return null;
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function assertSupabaseServiceRoleKey(rawKey: string) {
  const key = rawKey.trim();
  const payload = decodeJwtPayload(key);
  const role = String(payload?.role ?? "");

  if (role !== "service_role") {
    const hint = role ? ` (detected role: ${role})` : "";
    throw new Error(
      `SUPABASE_SERVICE_ROLE_KEY must be a Supabase service_role key${hint}. ` +
        `If this is set to the anon key, RLS will hide rows like distribution_region_catalog_items and validation will fail.`
    );
  }
}

