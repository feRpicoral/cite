import { describe, expect, it } from "vitest";

import { parseAcceptLanguage } from "@/lib/i18n/parse-accept-language";

describe("parseAcceptLanguage", () => {
  it("returns null for null/empty input", () => {
    expect(parseAcceptLanguage(null)).toBeNull();
    expect(parseAcceptLanguage("")).toBeNull();
  });

  it("maps en variants to en-US", () => {
    expect(parseAcceptLanguage("en")).toBe("en-US");
    expect(parseAcceptLanguage("en-GB")).toBe("en-US");
    expect(parseAcceptLanguage("en-US")).toBe("en-US");
  });

  it("maps pt variants to pt-BR", () => {
    expect(parseAcceptLanguage("pt")).toBe("pt-BR");
    expect(parseAcceptLanguage("pt-PT")).toBe("pt-BR");
    expect(parseAcceptLanguage("pt-BR")).toBe("pt-BR");
  });

  it("respects q-value ordering", () => {
    expect(parseAcceptLanguage("fr-FR,pt-BR;q=0.8,en;q=0.5")).toBe("pt-BR");
    expect(parseAcceptLanguage("en;q=0.5,pt;q=0.9")).toBe("pt-BR");
  });

  it("returns null when no supported locale matches", () => {
    expect(parseAcceptLanguage("fr-FR,de;q=0.8,ja;q=0.5")).toBeNull();
  });

  it("handles malformed q-values by treating them as 0", () => {
    expect(parseAcceptLanguage("en;q=abc,pt;q=0.5")).toBe("pt-BR");
  });
});
