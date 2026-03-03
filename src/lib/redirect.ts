export const DEFAULT_ADMIN_REDIRECT = "/admin";

export function sanitizeRedirectTarget(target?: string | null): string {
  if (!target) {
    return DEFAULT_ADMIN_REDIRECT;
  }

  const trimmed = target.trim();
  if (!trimmed.startsWith("/")) {
    return DEFAULT_ADMIN_REDIRECT;
  }

  if (trimmed.startsWith("//")) {
    return DEFAULT_ADMIN_REDIRECT;
  }

  return trimmed;
}
