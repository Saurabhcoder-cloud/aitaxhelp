/**
 * Safe redirection URL sanitization utility.
 * Strictly prevents open redirect vulnerabilities by ensuring only internal application
 * paths are accepted.
 */

/**
 * Validates and sanitizes a target redirect destination.
 * Rejects:
 * - External URLs (e.g. "https://attacker.com", "http://evil.org")
 * - Protocol-relative URLs (e.g. "//attacker.com", "//evil.com/path")
 * - Backslash manipulation (e.g. "/\\attacker.com", "\\evil.com")
 * - Non-HTTP schemes (e.g. "javascript:alert(1)", "data:text/html...")
 * - Control characters or malformed strings
 *
 * @param target The raw redirect destination candidate from query parameters.
 * @param fallback The safe default destination to return if candidate is invalid.
 * @returns A safe, internal relative path guaranteed to begin with a single slash "/".
 */
export function getSafeRedirectUrl(
  target: string | null | undefined,
  fallback = "/dashboard"
): string {
  if (!target || typeof target !== "string") {
    return fallback;
  }

  const trimmed = target.trim();
  if (!trimmed) {
    return fallback;
  }

  // Reject paths that do not start with a single forward slash
  if (!trimmed.startsWith("/")) {
    return fallback;
  }

  // Reject protocol-relative URLs (starts with "//")
  if (trimmed.startsWith("//")) {
    return fallback;
  }

  // Reject backslashes which some browsers treat as path separators (e.g. "/\evil.com")
  if (trimmed.includes("\\")) {
    return fallback;
  }

  // Reject explicit scheme declarations inside the string (e.g. "/redirect?url=http://...")
  // Specifically prevent any absolute URLs, javascript:, data:
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return fallback;
  }

  // Reject control characters (ASCII 0-31, 127)
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1F\x7F]/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
