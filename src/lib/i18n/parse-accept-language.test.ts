import { describe, expect, it } from "vitest";

import { parseAcceptLanguage } from "@/lib/i18n/parse-accept-language";

describe("parseAcceptLanguage", () => {
  it("returns null for null/empty input", () => {
    const nullResult = parseAcceptLanguage(null);
    const emptyResult = parseAcceptLanguage("");

    expect(nullResult).toBeNull();
    expect(emptyResult).toBeNull();
  });

  it("maps en variants to en-US", () => {
    const bare = parseAcceptLanguage("en");
    const gb = parseAcceptLanguage("en-GB");
    const us = parseAcceptLanguage("en-US");

    expect(bare).toBe("en-US");
    expect(gb).toBe("en-US");
    expect(us).toBe("en-US");
  });

  it("maps pt variants to pt-BR", () => {
    const bare = parseAcceptLanguage("pt");
    const pt = parseAcceptLanguage("pt-PT");
    const br = parseAcceptLanguage("pt-BR");

    expect(bare).toBe("pt-BR");
    expect(pt).toBe("pt-BR");
    expect(br).toBe("pt-BR");
  });

  it("respects q-value ordering", () => {
    const ptHigherInList = parseAcceptLanguage("fr-FR,pt-BR;q=0.8,en;q=0.5");
    const ptHigherReversed = parseAcceptLanguage("en;q=0.5,pt;q=0.9");

    expect(ptHigherInList).toBe("pt-BR");
    expect(ptHigherReversed).toBe("pt-BR");
  });

  it("returns null when no supported locale matches", () => {
    const result = parseAcceptLanguage("fr-FR,de;q=0.8,ja;q=0.5");

    expect(result).toBeNull();
  });

  it("handles malformed q-values by treating them as 0", () => {
    const result = parseAcceptLanguage("en;q=abc,pt;q=0.5");

    expect(result).toBe("pt-BR");
  });
});
