import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { signUserToken } from "../infrastructure/supabase/sign-token";

const OLD_ENV = process.env;

function mutableEnv(): Record<string, string | undefined> {
  return process.env as unknown as Record<string, string | undefined>;
}

beforeEach(() => {
  process.env = { ...OLD_ENV };
  delete mutableEnv().SUPABASE_JWT_SECRET;
});

afterEach(() => {
  process.env = OLD_ENV;
});

function decodePayload(token: string): Record<string, unknown> {
  const [, payloadB64] = token.split(".");
  const json = Buffer.from(payloadB64, "base64url").toString("utf8");
  return JSON.parse(json);
}

describe("signUserToken (JWT de identidad)", () => {
  it("signa un HS256 y porta el user_uuid como claim", () => {
    const token = signUserToken("00000000-0000-0000-0000-000000000002");
    expect(token.split(".")).toHaveLength(3);
    const payload = decodePayload(token);
    expect(payload.user_uuid).toBe("00000000-0000-0000-0000-000000000002");
    expect(payload.role).toBe("authenticated");
  });

  it("usa el SUPABASE_JWT_SECRET cuando está definido", () => {
    mutableEnv().SUPABASE_JWT_SECRET =
      "mi-secreto-de-produccion-suficientemente-largo";
    const token = signUserToken("00000000-0000-0000-0000-000000000001");
    expect(token.split(".")).toHaveLength(3);
  });

  it("lanza en producción si falta SUPABASE_JWT_SECRET", () => {
    mutableEnv().NODE_ENV = "production";
    expect(() => signUserToken("00000000-0000-0000-0000-000000000001")).toThrow(
      /SUPABASE_JWT_SECRET/,
    );
  });

  it("cae al default en desarrollo si falta la variable", () => {
    mutableEnv().NODE_ENV = "development";
    expect(() =>
      signUserToken("00000000-0000-0000-0000-000000000001"),
    ).not.toThrow();
  });
});
