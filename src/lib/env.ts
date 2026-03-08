function normalizeEnvValue(raw: string): string {
  const trimmed = raw.trim();
  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\"") && trimmed.length >= 2) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2)
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

export function requiredEnv(name: string): string {
  const raw = process.env[name];
  const value = typeof raw === "string" ? normalizeEnvValue(raw) : "";
  if (!value) {
    throw new Error(
      `Environment variable ${name} is required but missing or empty.`
    );
  }
  return value;
}

export function optionalEnv(
  name: string,
  fallback: string | null = null
): string | null {
  const raw = process.env[name];
  const value = typeof raw === "string" ? normalizeEnvValue(raw) : "";
  if (value) {
    return value;
  }
  return fallback;
}

export function enumEnv<T extends readonly string[]>(
  name: string,
  allowed: T,
  fallback: T[number]
): T[number] {
  const raw = optionalEnv(name, fallback) ?? fallback;
  if ((allowed as readonly string[]).includes(raw)) {
    return raw as T[number];
  }
  throw new Error(
    `Environment variable ${name} must be one of: ${allowed.join(", ")}.`
  );
}
