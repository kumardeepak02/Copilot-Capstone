/**
 * Checks if a value is a given name (a string with at least one non-whitespace character).
 * @param value - The value to check; may be string, null, undefined, or any other type
 * @returns True if value is a non-empty string with at least one non-whitespace character
 */
export function isGivenName(value: string | null | undefined | any): value is string {
  // Check type first, before any method call, to handle non-string values safely (A-5)
  if (typeof value !== "string") {
    return false;
  }
  // A string is a given name if it has at least one non-whitespace character (A-3, FR-5)
  return /\S/.test(value);
}

/**
 * Resolves the display text for a name.
 * Returns the name unchanged if it is a given name, otherwise returns the fallback "Unnamed" (FR-3, FR-4).
 * @param value - The name value; may be string, null, undefined, or any other type
 * @returns The display text: either the input name or "Unnamed"
 */
export function resolveDisplayName(value: string | null | undefined | any): string {
  // Check type first, before any method call (A-5)
  if (isGivenName(value)) {
    return value; // Return the name unchanged, preserving spaces (A-3)
  }
  return "Unnamed"; // Fallback for null, undefined, empty, whitespace-only, or non-string
}
