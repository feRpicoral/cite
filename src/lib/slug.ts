const MAX_SLUG_LENGTH = 60;

/**
 * Derive a URL slug from a name. Deterministic (no random suffix) so the
 * onboarding preview matches what gets created; uniqueness is enforced at the
 * database/action layer instead.
 */
export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH);
}
