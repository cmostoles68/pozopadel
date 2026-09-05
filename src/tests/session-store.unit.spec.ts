import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  SESSION_TTL_SECONDS,
  hashSessionToken,
  generateSessionToken,
  createSessionToken,
  resolveSessionUser,
  destroySession,
} from "../infrastructure/supabase/session-store";

const serviceClientMock = {
  from: vi.fn(),
};
vi.mock("../infrastructure/supabase/service-client", () => ({
  createServiceClient: () => serviceClientMock,
}));

type MockFn = ReturnType<typeof vi.fn>;

interface QueryBuilderMock {
  delete: MockFn;
  insert: MockFn;
  select: MockFn;
  eq: MockFn;
  gt: MockFn;
  maybeSingle: MockFn;
  then: MockFn;
}

function builder(result: {
  data?: unknown;
  error?: unknown;
}): QueryBuilderMock {
  const b: QueryBuilderMock = {
    delete: vi.fn(),
    insert: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    gt: vi.fn(),
    maybeSingle: vi.fn(),
    then: vi.fn(),
  };
  b.delete.mockReturnValue(b);
  b.insert.mockReturnValue(b);
  b.select.mockReturnValue(b);
  b.eq.mockReturnValue(b);
  b.gt.mockReturnValue(b);
  b.maybeSingle.mockResolvedValue(result);
  b.then.mockImplementation((resolve: (x: unknown) => unknown) =>
    resolve(result),
  );
  return b;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("session-store (S3)", () => {
  it("crea un token opaco de 256 bits y una sola sesión activa por usuario", async () => {
    const b = builder({ data: null });
    serviceClientMock.from.mockReturnValue(b);

    const token = await createSessionToken(
      "00000000-0000-0000-0000-000000000001",
    );

    expect(token).toBeTruthy();
    expect(token).not.toContain("00000000-");
    const fromCalls = serviceClientMock.from.mock.calls;
    expect(fromCalls[0][0]).toBe("session_tokens");
    expect(fromCalls[1][0]).toBe("session_tokens");
    // revoca la sesión anterior (delete) antes de insertar la nueva
    expect(b.delete).toHaveBeenCalledTimes(1);
    expect(b.eq).toHaveBeenCalledWith(
      "user_uuid",
      "00000000-0000-0000-0000-000000000001",
    );
    // inserta el hash, no el token crudo
    expect(b.insert).toHaveBeenCalledTimes(1);
    const inserted = b.insert.mock.calls[0][0] as {
      token_hash: string;
      expires_at: string;
    };
    expect(inserted.token_hash).toBe(hashSessionToken(token));
    const ttlMs = new Date(inserted.expires_at).getTime() - Date.now();
    expect(ttlMs).toBeGreaterThan(SESSION_TTL_SECONDS * 1000 - 5000);
    expect(ttlMs).toBeLessThanOrEqual(SESSION_TTL_SECONDS * 1000);
  });

  it("resuelve el usuario ligado a un token válido y null sin token", async () => {
    const b = builder({
      data: { user_uuid: "00000000-0000-0000-0000-000000000002" },
    });
    serviceClientMock.from.mockReturnValue(b);

    const user = await resolveSessionUser("algun-token");
    expect(b.select).toHaveBeenCalledWith("user_uuid");
    expect(b.eq).toHaveBeenCalledWith(
      "token_hash",
      hashSessionToken("algun-token"),
    );
    expect(b.gt).toHaveBeenCalledWith("expires_at", expect.any(String));
    expect(user).toBe("00000000-0000-0000-0000-000000000002");

    expect(await resolveSessionUser(undefined)).toBeNull();
  });

  it("destruye la sesión por hash del token (logout)", async () => {
    const b = builder({ data: null });
    serviceClientMock.from.mockReturnValue(b);

    await destroySession("algun-token");
    expect(b.delete).toHaveBeenCalledTimes(1);
    expect(b.eq).toHaveBeenCalledWith(
      "token_hash",
      hashSessionToken("algun-token"),
    );
  });

  it("genera tokens opacos distintos y de 256 bits", () => {
    const a = generateSessionToken();
    const b = generateSessionToken();
    expect(a).not.toBe(b);
    // base64url de 32 bytes → 43 caracteres
    expect(a).toHaveLength(43);
    expect(hashSessionToken(a)).toHaveLength(64);
  });
});
