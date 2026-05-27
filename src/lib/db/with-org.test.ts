import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { MULTI_TENANT_EXEMPT, MULTI_TENANT_MODELS } from "./with-org";

// vitest runs from the repo root.
const SCHEMA_PATH = resolve(process.cwd(), "prisma/schema.prisma");

function modelsWithOrgId(): string[] {
  const schema = readFileSync(SCHEMA_PATH, "utf8");
  const modelRe = /\bmodel\s+(\w+)\s*\{([^}]*)\}/g;
  const out: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = modelRe.exec(schema)) !== null) {
    const [, name, body] = match;
    if (!name || !body) continue;
    // Match either the camelCase field name (`orgId String ...`) or the
    // explicit column mapping (`@map("org_id")`) so renames on either side
    // don't smuggle in an unscoped model.
    if (/\borgId\s+\S+/.test(body) || /@map\("org_id"\)/.test(body)) {
      out.push(name);
    }
  }
  return out;
}

describe("multi-tenant model coverage", () => {
  it("every model with org_id is either scoped or explicitly exempted", () => {
    const tenantModels = modelsWithOrgId();
    expect(tenantModels.length).toBeGreaterThan(0);

    const missing = tenantModels.filter(
      (m) => !MULTI_TENANT_MODELS.has(m) && !MULTI_TENANT_EXEMPT.has(m),
    );
    expect(missing, `Models with org_id but not auto-scoped: ${missing.join(", ")}`).toEqual([]);
  });

  it("does not list non-tenant models in MULTI_TENANT_MODELS", () => {
    const tenantModels = new Set(modelsWithOrgId());
    const stray = [...MULTI_TENANT_MODELS].filter((m) => !tenantModels.has(m));
    expect(stray, `MULTI_TENANT_MODELS entries with no org_id column: ${stray.join(", ")}`).toEqual(
      [],
    );
  });

  it("exemptions and scoping are mutually exclusive", () => {
    const overlap = [...MULTI_TENANT_EXEMPT.keys()].filter((m) => MULTI_TENANT_MODELS.has(m));
    expect(overlap).toEqual([]);
  });
});
