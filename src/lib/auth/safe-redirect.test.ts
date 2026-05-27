import { describe, expect, it } from "vitest";

import { safeNextPath } from "./safe-redirect";

describe("safeNextPath", () => {
  const fallback = "/dashboard";

  it("accepts a single-slash relative path", () => {
    const result = safeNextPath("/conversations/abc", fallback);

    expect(result).toBe("/conversations/abc");
  });

  it("rejects absolute URLs", () => {
    const httpsResult = safeNextPath("https://evil.example/", fallback);
    const httpResult = safeNextPath("http://attacker", fallback);

    expect(httpsResult).toBe(fallback);
    expect(httpResult).toBe(fallback);
  });

  it("rejects protocol-relative URLs", () => {
    const result = safeNextPath("//evil.example/path", fallback);

    expect(result).toBe(fallback);
  });

  it("rejects backslash-prefixed paths that browsers normalize to //", () => {
    const slashBackslash = safeNextPath("/\\evil.example", fallback);
    const bareBackslash = safeNextPath("\\evil.example", fallback);

    expect(slashBackslash).toBe(fallback);
    expect(bareBackslash).toBe(fallback);
  });

  it("rejects bare schemes and JS urls", () => {
    const jsResult = safeNextPath("javascript:alert(1)", fallback);
    const dataResult = safeNextPath("data:text/html,foo", fallback);

    expect(jsResult).toBe(fallback);
    expect(dataResult).toBe(fallback);
  });

  it("rejects empty, null, and absurdly long values", () => {
    const nullResult = safeNextPath(null, fallback);
    const undefinedResult = safeNextPath(undefined, fallback);
    const emptyResult = safeNextPath("", fallback);
    const longResult = safeNextPath("/" + "a".repeat(3_000), fallback);

    expect(nullResult).toBe(fallback);
    expect(undefinedResult).toBe(fallback);
    expect(emptyResult).toBe(fallback);
    expect(longResult).toBe(fallback);
  });
});
