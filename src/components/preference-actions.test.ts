import { beforeEach, describe, expect, it, vi } from "vitest";

const userUpdate = vi.fn();
const getUser = vi.fn();
const cookieSet = vi.fn();

vi.mock("@/lib/db/client", () => ({
  getPrisma: () => ({ user: { update: userUpdate } }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: async () => ({ auth: { getUser: () => getUser() } }),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ set: cookieSet }),
}));

import { setUserLocaleAction } from "./locale-actions";
import { setUserThemeAction } from "./theme-actions";

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
});

describe("setUserThemeAction", () => {
  it("persists a valid preference", async () => {
    await setUserThemeAction("DARK");

    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { themePreference: "DARK" },
    });
  });

  it("rejects an invalid preference without writing", async () => {
    await setUserThemeAction("NEON" as never);

    expect(userUpdate).not.toHaveBeenCalled();
  });
});

describe("setUserLocaleAction", () => {
  it("persists a valid locale to cookie and db", async () => {
    await setUserLocaleAction("pt-BR");

    expect(cookieSet).toHaveBeenCalledWith("NEXT_LOCALE", "pt-BR", expect.any(Object));
    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { locale: "PT_BR" },
    });
  });

  it("rejects an invalid locale without writing the cookie or db", async () => {
    await setUserLocaleAction("xx-YY" as never);

    expect(cookieSet).not.toHaveBeenCalled();
    expect(userUpdate).not.toHaveBeenCalled();
  });
});
