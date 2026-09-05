import { describe, it, expect, beforeEach, afterEach } from "vitest";
import bcrypt from "bcryptjs";
import { verifyAdminPassword } from "../infrastructure/auth/admin-password";

const OLD_ENV = process.env;
const HASH_FILE = ".admin-password.hash";

// Deterministic test hash for the password "test123" (cost 12).
const TEST_HASH = bcrypt.hashSync("test123", 12);

async function withEnvHash(run: () => Promise<void>) {
  // Hide any on-disk hash so the env var path is used deterministically.
  const fs = await import("node:fs");
  const existed = fs.existsSync(HASH_FILE);
  const old = existed ? fs.readFileSync(HASH_FILE, "utf8") : null;
  if (existed) fs.renameSync(HASH_FILE, HASH_FILE + ".bak");
  process.env.ADMIN_PASSWORD_HASH = TEST_HASH;
  try {
    await run();
  } finally {
    delete process.env.ADMIN_PASSWORD_HASH;
    if (old != null) {
      fs.writeFileSync(HASH_FILE, old);
    }
    if (fs.existsSync(HASH_FILE + ".bak")) {
      fs.unlinkSync(HASH_FILE + ".bak");
    }
  }
}

describe("verifyAdminPassword (bcrypt + rate-limit)", () => {
  beforeEach(() => {
    process.env = { ...OLD_ENV };
    const env = process.env as unknown as Record<string, string | undefined>;
    delete env.ADMIN_PASSWORD_HASH;
    delete env.NODE_ENV;
  });
  afterEach(() => {
    process.env = OLD_ENV;
  });

  it("acepta la contraseña correcta", async () => {
    await withEnvHash(async () => {
      const res = await verifyAdminPassword("test123", "k1");
      expect(res.ok).toBe(true);
    });
  });

  it("rechaza una contraseña incorrecta", async () => {
    await withEnvHash(async () => {
      const res = await verifyAdminPassword("incorrecta", "k2");
      expect(res.ok).toBe(false);
    });
  });

  it("devuelve false sin hash configurado", async () => {
    const res = await verifyAdminPassword("test123", "k3");
    expect(res.ok).toBe(false);
  });

  it("bloquea tras demasiados intentos en el límite de tiempo", async () => {
    await withEnvHash(async () => {
      // 5 intentos fallidos (máximo permitido = 5)
      for (let i = 0; i < 5; i++) {
        const r = await verifyAdminPassword("mal", "k-rate");
        expect(r.ok).toBe(false);
      }
      // El 6º queda bloqueado por rate-limit
      const blocked = await verifyAdminPassword("test123", "k-rate");
      expect(blocked.ok).toBe(false);
      expect(blocked.error).toMatch(/minuto/i);
    });
  });
});
