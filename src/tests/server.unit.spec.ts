import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const createServerClientMock = vi.hoisted(() =>
  vi.fn((_url: string, _key: string, options: unknown) => ({ options })),
);
vi.mock("@supabase/ssr", () => ({
  createServerClient: createServerClientMock,
}));

vi.mock("../infrastructure/supabase/current-user", () => ({
  getCurrentUserUuid: vi.fn(async () => "00000000-0000-0000-0000-000000000002"),
}));

const cookieStoreMock = vi.hoisted(() => ({
  getAll: vi.fn(() => []),
  set: vi.fn(),
}));
vi.mock("next/headers", () => ({
  cookies: async () => cookieStoreMock,
}));

import { createClient } from "../infrastructure/supabase/server";

const OLD_ENV = process.env;

beforeEach(() => {
  process.env = {
    ...OLD_ENV,
    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-test-key",
  };
  delete process.env.SUPABASE_JWT_SECRET;
});

function decodePayload(token: string): Record<string, unknown> {
  const [, payloadB64] = token.split(".");
  return JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
}

afterEach(() => {
  process.env = OLD_ENV;
});

describe("createClient (server, S3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("firma un JWT por usuario y lo envía como Bearer (autorización RLS)", async () => {
    await createClient();

    const [url, key, options] = createServerClientMock.mock
      .calls[0] as unknown as [
      string,
      string,
      {
        global: { headers: { authorization: string } };
        cookies: unknown;
      },
    ];
    expect(url).toBe("http://127.0.0.1:54321");
    expect(key).toBe("anon-test-key");
    const auth = options.global.headers.authorization;
    expect(auth.startsWith("Bearer ")).toBe(true);
    const payload = decodePayload(auth.slice("Bearer ".length));
    expect(payload.user_uuid).toBe("00000000-0000-0000-0000-000000000002");
  });

  it("configura el getter de cookies para el store de Next", async () => {
    await createClient();
    const [, , options] = createServerClientMock.mock.calls[0] as unknown as [
      string,
      string,
      { cookies: { getAll: () => unknown[] } },
    ];
    expect(options.cookies.getAll()).toEqual([]);
  });
});
