import { describe, expect, it } from "vitest";

import { safeNextPath } from "./safe-redirect";

describe("safeNextPath", () => {
  const fallback = "/dashboard";

  it("accepts a single-slash relative path", () => {
    expect(safeNextPath("/conversations/abc", fallback)).toBe("/conversations/abc");
  });

  it("rejects absolute URLs", () => {
    expect(safeNextPath("https://evil.example/", fallback)).toBe(fallback);
    expect(safeNextPath("http://attacker", fallback)).toBe(fallback);
  });

  it("rejects protocol-relative URLs", () => {
    expect(safeNextPath("//evil.example/path", fallback)).toBe(fallback);
  });

  it("rejects backslash-prefixed paths that browsers normalize to //", () => {
    expect(safeNextPath("/\\evil.example", fallback)).toBe(fallback);
    expect(safeNextPath("\\evil.example", fallback)).toBe(fallback);
  });

  it("rejects bare schemes and JS urls", () => {
    expect(safeNextPath("javascript:alert(1)", fallback)).toBe(fallback);
    expect(safeNextPath("data:text/html,foo", fallback)).toBe(fallback);
  });

  it("rejects empty, null, and absurdly long values", () => {
    expect(safeNextPath(null, fallback)).toBe(fallback);
    expect(safeNextPath(undefined, fallback)).toBe(fallback);
    expect(safeNextPath("", fallback)).toBe(fallback);
    expect(safeNextPath("/" + "a".repeat(3_000), fallback)).toBe(fallback);
  });
});
