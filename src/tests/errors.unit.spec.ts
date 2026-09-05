import { describe, it, expect } from "vitest";
import { err } from "../domain/result";
import {
  toSafeErrorMessage,
  safeErr,
  DEFAULT_ERROR_MESSAGE,
} from "../application/errors";

describe("toSafeErrorMessage", () => {
  it("conserva los mensajes de negocio ya legibles", () => {
    expect(toSafeErrorMessage("El nombre es obligatorio")).toBe(
      "El nombre es obligatorio",
    );
    expect(toSafeErrorMessage("No hay parejas seleccionadas")).toBe(
      "No hay parejas seleccionadas",
    );
  });

  it("devuelve el mensaje genérico ante valores vacíos", () => {
    expect(toSafeErrorMessage("")).toBe(DEFAULT_ERROR_MESSAGE);
    expect(toSafeErrorMessage(null)).toBe(DEFAULT_ERROR_MESSAGE);
    expect(toSafeErrorMessage(undefined)).toBe(DEFAULT_ERROR_MESSAGE);
  });

  it("oculta errores de infraestructura (SQL / Supabase)", () => {
    const technical = [
      'duplicate key value violates unique constraint "profiles_pkey"',
      "new row violates row-level security policy",
      'relation "profiles" does not exist',
      'column "user_uuid" of relation "profiles" does not exist',
      "syntax error at or near SELECT",
      "connection refused (ECONNREFUSED)",
      "fetch failed",
      '"user_uuid" violates foreign key constraint',
    ];
    for (const msg of technical) {
      expect(toSafeErrorMessage(msg)).not.toBe(msg);
    }
  });

  it("traduce errores de duplicidad a un mensaje de usuario claro", () => {
    expect(
      toSafeErrorMessage(
        'duplicate key value violates unique constraint "profiles_pkey"',
      ),
    ).toBe("Ese registro ya existe. Comprueba los datos e inténtalo de nuevo.");
  });

  it("oculta stacks y estructuras internas", () => {
    expect(
      toSafeErrorMessage(
        "Error: boom\n    at Object.<anonymous> (webpack:1:2)",
      ),
    ).toBe(DEFAULT_ERROR_MESSAGE);
    expect(toSafeErrorMessage('{"code":500,"details":"internal"}')).toBe(
      DEFAULT_ERROR_MESSAGE,
    );
  });
});

describe("safeErr", () => {
  it("devuelve un error seguro a partir de un Error", () => {
    const res = safeErr(
      new Error("duplicate key value violates unique constraint"),
    );
    expect(res.ok).toBe(false);
    if (!res.ok)
      expect(res.error).toBe(
        "Ese registro ya existe. Comprueba los datos e inténtalo de nuevo.",
      );
  });

  it("devuelve un error seguro para un objeto con campo message (PostgrestError)", () => {
    const res = safeErr({
      message: 'duplicate key value violates unique constraint "profiles_pkey"',
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe(
        "Ese registro ya existe. Comprueba los datos e inténtalo de nuevo.",
      );
    }
  });
});

describe("propagación de errores de negocio", () => {
  it("conserva el mensaje de negocio que ya es legible", () => {
    const res = err("No hay parejas seleccionadas");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("No hay parejas seleccionadas");
  });
});
