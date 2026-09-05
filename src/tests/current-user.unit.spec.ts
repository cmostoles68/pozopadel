import { describe, it, expect, beforeEach, vi } from "vitest";
import { AUTH_COOKIE_NAME, SYSTEM_USER_UUIDS } from "../config/auth";

vi.mock("react", () => ({ cache: (fn: unknown) => fn }));

vi.mock("../infrastructure/supabase/session-store", () => ({
  resolveSessionUser: vi.fn(async (token: string | undefined) => {
    if (token === "token-admin") return SYSTEM_USER_UUIDS.admin;
    if (token === "token-guest") return SYSTEM_USER_UUIDS.guest;
    return null;
  }),
}));

const cookieStoreMock = vi.hoisted(() => ({
  get: vi.fn(),
}));
vi.mock("next/headers", () => ({
  cookies: async () => cookieStoreMock,
}));

import {
  getCurrentUserUuid,
  getCurrentAuthMode,
} from "../infrastructure/supabase/current-user";
import { resolveSessionUser as mockResolveSessionUser } from "../infrastructure/supabase/session-store";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("current-user (S3)", () => {
  it("resuelve admin desde la cookie de sesión", async () => {
    cookieStoreMock.get.mockReturnValue({
      name: AUTH_COOKIE_NAME,
      value: "token-admin",
    });
    expect(await getCurrentUserUuid()).toBe(SYSTEM_USER_UUIDS.admin);
    expect(await getCurrentAuthMode()).toBe("admin");
    expect(cookieStoreMock.get).toHaveBeenCalledWith(AUTH_COOKIE_NAME);
    expect(mockResolveSessionUser).toHaveBeenCalledWith("token-admin");
  });

  it("cae a invitado cuando no hay cookie de sesión válida", async () => {
    cookieStoreMock.get.mockReturnValue(undefined);
    expect(await getCurrentUserUuid()).toBe(SYSTEM_USER_UUIDS.guest);
    expect(await getCurrentAuthMode()).toBe("guest");
  });

  it("cae a invitado cuando la sesión no se resuelve (cookie forjada con el UUID admin)", async () => {
    // forjar la cookie con el valor antiguo (el UUID admin) no otorga rol
    cookieStoreMock.get.mockReturnValue({
      name: AUTH_COOKIE_NAME,
      value: SYSTEM_USER_UUIDS.admin,
    });
    expect(await getCurrentUserUuid()).toBe(SYSTEM_USER_UUIDS.guest);
    expect(await getCurrentAuthMode()).toBe("guest");
  });
});
