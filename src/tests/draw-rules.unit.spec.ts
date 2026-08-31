import { describe, it, expect } from "vitest";
import { getDrawValidationError } from "../domain/algorithms/draw";

describe("getDrawValidationError", () => {
  it("rejects fewer than 4 players", () => {
    expect(getDrawValidationError(0)).toContain("al menos 4");
    expect(getDrawValidationError(2)).toContain("al menos 4");
    expect(getDrawValidationError(3)).toContain("al menos 4");
  });

  it("rejects an odd number of players", () => {
    expect(getDrawValidationError(5)).toContain("par");
    expect(getDrawValidationError(7)).toContain("par");
  });

  it("accepts 4 players (minimum)", () => {
    expect(getDrawValidationError(4)).toBeNull();
  });

  it("accepts any even number of 4 or more", () => {
    expect(getDrawValidationError(6)).toBeNull();
    expect(getDrawValidationError(8)).toBeNull();
    expect(getDrawValidationError(12)).toBeNull();
  });
});
