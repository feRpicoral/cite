import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

describe("cn", () => {
  it("joins class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("merges conflicting tailwind utilities, last wins", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("skips falsy values", () => {
    expect(cn("a", false, undefined, null, "", "b")).toBe("a b");
  });
});
