import { describe, it, expect } from "vitest";
import {
  createPlayerSchema,
  updatePlayerSchema,
  createTournamentSchema,
  drawMethodSchema,
  saveCourtResultSchema,
  uuidSchema,
} from "../application/validation/schemas";
import { parseOrError } from "../application/validation/parse";

describe("createPlayerSchema", () => {
  it("coerces string level into a number", () => {
    const res = createPlayerSchema.safeParse({
      full_name: "Ana",
      gender: "FEMALE",
      dominant_hand: "LEFT",
      level: "6",
    });
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data.level).toBe(6);
  });

  it("rejects a blank name", () => {
    const res = createPlayerSchema.safeParse({
      full_name: "   ",
      gender: "MALE",
      dominant_hand: "RIGHT",
      level: 5,
    });
    expect(res.success).toBe(false);
  });

  it("rejects an invalid gender", () => {
    const res = createPlayerSchema.safeParse({
      full_name: "Ana",
      gender: "OTRO",
      dominant_hand: "RIGHT",
      level: 5,
    });
    expect(res.success).toBe(false);
  });

  it("rejects a level outside 1..10", () => {
    expect(
      createPlayerSchema.safeParse({
        full_name: "Ana",
        gender: "FEMALE",
        dominant_hand: "RIGHT",
        level: 11,
      }).success,
    ).toBe(false);
  });
});

describe("updatePlayerSchema", () => {
  it("requires the id", () => {
    const res = updatePlayerSchema.safeParse({
      full_name: "Ana",
      gender: "FEMALE",
      dominant_hand: "RIGHT",
      level: 5,
    });
    expect(res.success).toBe(false);
  });

  it("accepts a full valid payload", () => {
    const res = updatePlayerSchema.safeParse({
      id: "11111111-1111-1111-1111-111111111111",
      full_name: "Ana",
      gender: "FEMALE",
      dominant_hand: "RIGHT",
      level: 5,
    });
    expect(res.success).toBe(true);
  });
});

describe("createTournamentSchema", () => {
  it("coerces numeric form values", () => {
    const res = createTournamentSchema.safeParse({
      title: "Pozo Viernes",
      numberOfCourts: "4",
      minutesPerRound: "15",
    });
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data.numberOfCourts).toBe(4);
    expect(res.data.minutesPerRound).toBe(15);
  });

  it("rejects minutesPerRound above 90", () => {
    const res = createTournamentSchema.safeParse({
      title: "Pozo",
      numberOfCourts: 3,
      minutesPerRound: 91,
    });
    expect(res.success).toBe(false);
  });

  it("rejects empty title", () => {
    const res = createTournamentSchema.safeParse({
      title: "  ",
      numberOfCourts: 3,
      minutesPerRound: 15,
    });
    expect(res.success).toBe(false);
  });
});

describe("drawMethodSchema", () => {
  it("accepts all four methods", () => {
    for (const m of ["random", "random_mix", "level", "level_mix"]) {
      expect(drawMethodSchema.safeParse(m).success).toBe(true);
    }
  });

  it("rejects unknown methods", () => {
    expect(drawMethodSchema.safeParse("unknown").success).toBe(false);
  });
});

describe("saveCourtResultSchema", () => {
  it("accepts a valid payload", () => {
    const res = saveCourtResultSchema.safeParse({
      roundId: "22222222-2222-2222-2222-222222222222",
      courtNumber: 2,
      winnerDrawnPairId: "33333333-3333-3333-3333-333333333333",
      results: [
        { drawnPairId: "33333333-3333-3333-3333-333333333333", score: 6 },
        { drawnPairId: "44444444-4444-4444-4444-444444444444", score: 3 },
      ],
    });
    expect(res.success).toBe(true);
  });

  it("rejects an empty results list", () => {
    const res = saveCourtResultSchema.safeParse({
      roundId: "22222222-2222-2222-2222-222222222222",
      courtNumber: 2,
      winnerDrawnPairId: "33333333-3333-3333-3333-333333333333",
      results: [],
    });
    expect(res.success).toBe(false);
  });

  it("rejects a court number below 1", () => {
    const res = saveCourtResultSchema.safeParse({
      roundId: "22222222-2222-2222-2222-222222222222",
      courtNumber: 0,
      winnerDrawnPairId: "33333333-3333-3333-3333-333333333333",
      results: [
        { drawnPairId: "33333333-3333-3333-3333-333333333333", score: 6 },
      ],
    });
    expect(res.success).toBe(false);
  });

  it("rejects a negative score", () => {
    const res = saveCourtResultSchema.safeParse({
      roundId: "22222222-2222-2222-2222-222222222222",
      courtNumber: 1,
      winnerDrawnPairId: "33333333-3333-3333-3333-333333333333",
      results: [
        { drawnPairId: "33333333-3333-3333-3333-333333333333", score: -1 },
      ],
    });
    expect(res.success).toBe(false);
  });
});

describe("uuidSchema (anti SQL / filter injection)", () => {
  it("rejects a valid-looking UUID", () => {
    expect(
      uuidSchema.safeParse("123e4567-e89b-12d3-a456-426614174000").success,
    ).toBe(true);
  });

  it("accepts a system UUID", () => {
    expect(
      uuidSchema.safeParse("00000000-0000-0000-0000-000000000002").success,
    ).toBe(true);
  });

  it.each([
    "p1",
    "1' OR '1'='1",
    "1; DROP TABLE profiles; --",
    "x'.eq.00000000-0000-0000-0000-000000000002,user_uuid.eq.",
    "winner_player1_id.eq.00000000-0000-0000-0000-000000000002",
    "(true)",
    "aaaaaaaa-bbbb-cccc-dddd-eeeeee)or(true",
    "..;..",
    "not a uuid at all",
  ])("rejects injection payload: %s", (payload) => {
    expect(uuidSchema.safeParse(payload).success).toBe(false);
  });

  it("rejects whitespace-padded injection", () => {
    expect(uuidSchema.safeParse("  ' OR 1=1 -- ").success).toBe(false);
  });
});

describe("parseOrError", () => {
  it("returns the data when valid", () => {
    const res = parseOrError(createPlayerSchema, {
      full_name: "Ana",
      gender: "FEMALE",
      dominant_hand: "RIGHT",
      level: "5",
    });
    expect(res).toEqual({
      ok: true,
      data: {
        full_name: "Ana",
        gender: "FEMALE",
        dominant_hand: "RIGHT",
        level: 5,
      },
    });
  });

  it("returns a message on the first issue", () => {
    const res = parseOrError(createPlayerSchema, {
      full_name: "",
      gender: "FEMALE",
      dominant_hand: "RIGHT",
      level: 5,
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toBeTruthy();
  });
});
