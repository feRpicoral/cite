import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

describe("cn", () => {
  it("joins class names", () => {
    const result = cn("a", "b");

    expect(result).toBe("a b");
  });

  it("merges conflicting tailwind utilities, last wins", () => {
    const result = cn("p-2", "p-4");

    expect(result).toBe("p-4");
  });

  it("skips falsy values", () => {
    const result = cn("a", false, undefined, null, "", "b");

    expect(result).toBe("a b");
  });
});
