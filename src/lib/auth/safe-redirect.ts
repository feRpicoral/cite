/**
 * Returns `next` only if it's a same-origin relative path. Anything that
 * could escape the origin — absolute URLs, protocol-relative URLs, schemes
 * like `javascript:`, or backslash-prefixed paths some browsers normalize
 * to `/\\foo` and then to `//foo` — falls back to the caller's default.
 *
 * Used by login and the auth callback to close the open redirect from the
 * raw `next` query/form field.
 */
export function safeNextPath(next: string | null | undefined, fallback: string): string {
  if (typeof next !== "string") return fallback;
  if (next.length === 0 || next.length > 2_000) return fallback;
  // Must start with a single forward slash. Reject `//foo` (protocol-relative),
  // `/\foo` (browsers normalize the backslash to `/`), and `\foo`.
  if (next[0] !== "/" || next[1] === "/" || next[1] === "\\") return fallback;
  return next;
}
