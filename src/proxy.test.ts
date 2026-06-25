import { describe, expect, it } from "vitest";

import { matchesPrefix } from "./proxy";

describe("matchesPrefix", () => {
  it("matches the exact prefix", () => {
    expect(matchesPrefix("/auth", "/auth")).toBe(true);
  });

  it("matches a deeper path under the prefix segment", () => {
    expect(matchesPrefix("/auth/callback", "/auth")).toBe(true);
  });

  it("does not match a sibling prefix that shares the substring", () => {
    expect(matchesPrefix("/authz", "/auth")).toBe(false);
    expect(matchesPrefix("/authenticate", "/auth")).toBe(false);
  });

  it("does not match an unrelated path", () => {
    expect(matchesPrefix("/dashboard", "/auth")).toBe(false);
  });
});
