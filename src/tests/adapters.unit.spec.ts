import { describe, it, expect, vi } from "vitest";
import { ok, err } from "../domain/result";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../infrastructure/supabase/database.types";
import { SupabaseTournamentAdapter } from "../infrastructure/supabase/adapters/tournament.adapter";
import { SupabasePlayerAdapter } from "../infrastructure/supabase/adapters/player.adapter";
import {
  SupabaseDrawnPairAdapter,
  SupabaseTournamentDrawnPairAdapter,
} from "../infrastructure/supabase/adapters/pair.adapter";
import { SupabasePozoRoundAdapter } from "../infrastructure/supabase/adapters/round.adapter";
import { SupabaseMatchHistoryAdapter } from "../infrastructure/supabase/adapters/match.adapter";
import type { Tournament } from "../domain/entities/tournament";
import type { Player } from "../domain/entities/player";
import type { DrawnPair, TournamentDrawnPair } from "../domain/entities/pair";
import type { PozoRound } from "../domain/entities/round";
import type { PozoRoundPair } from "../domain/entities/match";
import type { MatchHistoryRow } from "../domain/entities/match";

type Mock = ReturnType<typeof vi.fn>;
type SupabaseBuilderMock = {
  [method: string]: Mock;
  single: Mock;
  maybeSingle: Mock;
  then: Mock;
};

interface SupabaseResponse {
  data: unknown;
  error: { message: string } | null;
}

function createQueryBuilder(result: SupabaseResponse): SupabaseBuilderMock {
  const entries: Record<string, unknown> = {};
  for (const m of ["select", "eq", "order", "limit", "in", "not", "is", "insert", "update", "delete", "upsert"]) {
    entries[m] = vi.fn(() => entries);
  }
  entries["single"] = vi.fn(() => Promise.resolve(result));
  entries["maybeSingle"] = vi.fn(() => Promise.resolve(result));
  entries["then"] = vi.fn((resolve: (value: unknown) => void) => {
    void Promise.resolve(result).then(resolve);
  });
  return entries as SupabaseBuilderMock;
}

function createSupabaseMock() {
  const from: Mock = vi.fn();
  const supabase = { from } as unknown as SupabaseClient<Database>;
  return { from, supabase };
}

describe("SupabaseTournamentAdapter", () => {
  function buildAdapter() {
    const { from, supabase } = createSupabaseMock();
    const adapter = new SupabaseTournamentAdapter(supabase);
    return { adapter, from };
  }

  it("findById returns the tournament when found", async () => {
    const { adapter, from } = buildAdapter();
    const row = { id: "t1", title: "Pozo Viernes" };
    from.mockReturnValue(createQueryBuilder({ data: row, error: null }));

    const res = await adapter.findById("t1", "u1");
    expect(res).toEqual(ok(row as unknown as Tournament));
    expect(from).toHaveBeenCalledWith("tournaments");
  });

  it("findById returns null when no row", async () => {
    const { adapter, from } = buildAdapter();
    from.mockReturnValue(createQueryBuilder({ data: null, error: null }));

    const res = await adapter.findById("t1", "u1");
    expect(res).toEqual(ok(null));
  });

  it("findAll returns rows ordered by createdAt desc", async () => {
    const { adapter, from } = buildAdapter();
    const rows = [{ id: "t1" }, { id: "t2" }];
    from.mockReturnValue(createQueryBuilder({ data: rows, error: null }));

    const res = await adapter.findAll("u1");
    expect(res).toEqual(ok(rows as unknown as Tournament[]));
  });

  it("create returns created tournament", async () => {
    const { adapter, from } = buildAdapter();
    const created = { id: "t1", title: "Pozo" };
    from.mockReturnValue(createQueryBuilder({ data: created, error: null }));

    const res = await adapter.create({
      title: "Pozo",
      number_of_courts: 3,
      minutes_per_round: 15,
      user_uuid: "u1",
    });
    expect(res).toEqual(ok(created as unknown as Tournament));
  });

  it("create propagates an error", async () => {
    const { adapter, from } = buildAdapter();
    from.mockReturnValue(
      createQueryBuilder({ data: null, error: { message: "db down" } }),
    );

    const res = await adapter.create({
      title: "Pozo",
      number_of_courts: 3,
      minutes_per_round: 15,
      user_uuid: "u1",
    });
    expect(res).toEqual(err("db down"));
  });

  it("updateStatus scopes by user and propagates errors", async () => {
    const { adapter, from } = buildAdapter();
    const builder = createQueryBuilder({ data: null, error: { message: "no" } });
    from.mockReturnValue(builder);

    const res = await adapter.updateStatus("t1", "u1", "completed");
    expect(res).toEqual(err("no"));
    expect(builder.update).toHaveBeenCalledWith({ status: "completed" });
  });

  it("delete propagates errors", async () => {
    const { adapter, from } = buildAdapter();
    from.mockReturnValue(
      createQueryBuilder({ data: null, error: { message: "fk" } }),
    );

    const res = await adapter.delete("t1", "u1");
    expect(res).toEqual(err("fk"));
  });
});

describe("SupabasePlayerAdapter", () => {
  function buildAdapter() {
    const { from, supabase } = createSupabaseMock();
    const adapter = new SupabasePlayerAdapter(supabase);
    return { adapter, from };
  }

  it("findAll returns players scoped by user", async () => {
    const { adapter, from } = buildAdapter();
    const rows = [{ id: "p1", full_name: "Ana", gender: "FEMALE" }];
    from.mockReturnValue(createQueryBuilder({ data: rows, error: null }));

    const res = await adapter.findAll("u1");
    expect(res).toEqual(ok(rows as unknown as Player[]));
  });

  it("findProfiles selects only profile fields", async () => {
    const { adapter, from } = buildAdapter();
    const builder = createQueryBuilder({ data: null, error: null });
    from.mockReturnValue(builder);

    await adapter.findProfiles("u1");
    expect(builder.eq).toHaveBeenCalledWith("user_uuid", "u1");
  });

  it("create forwards the full data object", async () => {
    const { adapter, from } = buildAdapter();
    const builder = createQueryBuilder({ data: null, error: null });
    from.mockReturnValue(builder);

    const data = {
      id: "p1",
      full_name: "Ana",
      gender: "FEMALE" as const,
      dominant_hand: "RIGHT" as const,
      level: 5,
      user_uuid: "u1",
    };
    const res = await adapter.create(data);
    expect(res).toEqual(ok(undefined));
    expect(builder.insert).toHaveBeenCalledWith(data);
  });

  it("create propagates errors", async () => {
    const { adapter, from } = buildAdapter();
    from.mockReturnValue(
      createQueryBuilder({ data: null, error: { message: "dup name" } }),
    );

    const res = await adapter.create({
      full_name: "Ana",
      gender: "FEMALE",
      dominant_hand: "RIGHT",
      level: 5,
      user_uuid: "u1",
    });
    expect(res).toEqual(err("dup name"));
  });

  it("update scopes both id and user_uuid", async () => {
    const { adapter, from } = buildAdapter();
    const builder = createQueryBuilder({ data: null, error: null });
    from.mockReturnValue(builder);

    await adapter.update("p1", { full_name: "Ana", gender: "FEMALE", dominant_hand: "RIGHT", level: 4 }, "u1");
    expect(builder.update).toHaveBeenCalledWith({
      full_name: "Ana",
      gender: "FEMALE",
      dominant_hand: "RIGHT",
      level: 4,
    });
    expect(builder.eq).toHaveBeenCalledWith("user_uuid", "u1");
  });

  it("deleteAll propagates errors", async () => {
    const { adapter, from } = buildAdapter();
    from.mockReturnValue(
      createQueryBuilder({ data: null, error: { message: "fk" } }),
    );

    const res = await adapter.deleteAll("u1");
    expect(res).toEqual(err("fk"));
  });

  it("exists returns false when no row", async () => {
    const { adapter, from } = buildAdapter();
    from.mockReturnValue(createQueryBuilder({ data: null, error: null }));

    const res = await adapter.exists("p1");
    expect(res).toEqual(ok(false));
  });

  it("exists returns true when row present", async () => {
    const { adapter, from } = buildAdapter();
    from.mockReturnValue(createQueryBuilder({ data: { id: "p1" }, error: null }));

    const res = await adapter.exists("p1");
    expect(res).toEqual(ok(true));
  });
});

describe("SupabaseDrawnPairAdapter", () => {
  function buildAdapter() {
    const { from, supabase } = createSupabaseMock();
    const adapter = new SupabaseDrawnPairAdapter(supabase);
    return { adapter, from };
  }

  it("findAll returns pairs scoped by user", async () => {
    const { adapter, from } = buildAdapter();
    const rows = [{ id: "d1", pair_number: 1 }];
    from.mockReturnValue(createQueryBuilder({ data: rows, error: null }));

    const res = await adapter.findAll("u1");
    expect(res).toEqual(ok(rows as unknown as DrawnPair[]));
  });

  it("findAllWithProfiles returns empty for no pairs", async () => {
    const { adapter, from } = buildAdapter();
    from.mockImplementation((table: string) =>
      createQueryBuilder({ data: table === "drawn_pairs" ? [] : [], error: null }),
    );

    const res = await adapter.findAllWithProfiles("u1");
    expect(res).toEqual(ok([]));
  });

  it("findAllWithProfiles enriches pairs with profile data", async () => {
    const { adapter, from } = buildAdapter();
    from.mockImplementation(
      (table: string) =>
        createQueryBuilder({
          data:
            table === "drawn_pairs"
              ? [
                  {
                    id: "d1",
                    pair_number: 1,
                    player1_id: "p1",
                    player2_id: "p2",
                    draw_method: "random",
                  },
                ]
              : [
                  { id: "p1", full_name: "Ana", level: 6, dominant_hand: "LEFT" },
                  { id: "p2", full_name: "Luis", level: 4, dominant_hand: "RIGHT" },
                ],
          error: null,
        }),
    );

    const res = await adapter.findAllWithProfiles("u1");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data[0]).toMatchObject({
      id: "d1",
      pair_number: 1,
      player1_id: "p1",
      player2_id: "p2",
      player1_name: "Ana",
      player2_name: "Luis",
      avg_level: 5,
      is_lefty: true,
    });
  });

  it("insert stamps rows with user_uuid and returns them", async () => {
    const { adapter, from } = buildAdapter();
    const inserted = [{ id: "d1", pair_number: 1, player1_id: "p1", player2_id: "p2", draw_method: "random" }];
    const builder = createQueryBuilder({ data: inserted, error: null });
    from.mockReturnValue(builder);

    const res = await adapter.insert(
      [{ pair_number: 1, player1_id: "p1", player2_id: "p2", draw_method: "random" }],
      "u1",
    );
    expect(res).toEqual(ok(inserted as unknown as DrawnPair[]));
    expect(builder.insert).toHaveBeenCalledWith([
      {
        pair_number: 1,
        player1_id: "p1",
        player2_id: "p2",
        draw_method: "random",
        user_uuid: "u1",
      },
    ]);
  });
});

describe("SupabaseTournamentDrawnPairAdapter", () => {
  function buildAdapter() {
    const { from, supabase } = createSupabaseMock();
    const adapter = new SupabaseTournamentDrawnPairAdapter(supabase);
    return { adapter, from };
  }

  it("findByTournament returns selected pairs", async () => {
    const { adapter, from } = buildAdapter();
    const rows = [{ id: "s1", tournament_id: "t1", drawn_pair_id: "d1", court_number: null }];
    from.mockReturnValue(createQueryBuilder({ data: rows, error: null }));

    const res = await adapter.findByTournament("t1");
    expect(res).toEqual(ok(rows as unknown as TournamentDrawnPair[]));
  });

  it("selectPair inserts the selection", async () => {
    const { adapter, from } = buildAdapter();
    const builder = createQueryBuilder({ data: null, error: null });
    from.mockReturnValue(builder);

    const res = await adapter.selectPair("t1", "d1");
    expect(res).toEqual(ok(undefined));
    expect(builder.insert).toHaveBeenCalledWith({
      tournament_id: "t1",
      drawn_pair_id: "d1",
    });
  });

  it("selectAllPairs only inserts not-yet-selected ids", async () => {
    const { adapter, from } = buildAdapter();
    const builder = createQueryBuilder({ data: [{ drawn_pair_id: "d1" }], error: null });
    from.mockReturnValue(builder);

    await adapter.selectAllPairs("t1", ["d1", "d2", "d3"]);
    expect(builder.insert).toHaveBeenCalledWith([
      { tournament_id: "t1", drawn_pair_id: "d2" },
      { tournament_id: "t1", drawn_pair_id: "d3" },
    ]);
  });

  it("selectAllPairs skips insert when everything is already selected", async () => {
    const { adapter, from } = buildAdapter();
    const builder = createQueryBuilder({ data: [{ drawn_pair_id: "d1" }], error: null });
    from.mockReturnValue(builder);

    const res = await adapter.selectAllPairs("t1", ["d1"]);
    expect(res).toEqual(ok(undefined));
    expect(builder.insert).not.toHaveBeenCalled();
  });

  it("getSelectedWithCourt filters court_number not null", async () => {
    const { adapter, from } = buildAdapter();
    const builder = createQueryBuilder({ data: [{ id: "s1", drawn_pair_id: "d1", court_number: 2 }], error: null });
    from.mockReturnValue(builder);

    const res = await adapter.getSelectedWithCourt("t1");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data[0]).toMatchObject({ id: "s1", court_number: 2 });
  });
});

describe("SupabasePozoRoundAdapter", () => {
  function buildAdapter() {
    const { from, supabase } = createSupabaseMock();
    const adapter = new SupabasePozoRoundAdapter(supabase);
    return { adapter, from };
  }

  it("findByTournament returns rounds ordered by round_number", async () => {
    const { adapter, from } = buildAdapter();
    const rows = [{ id: "r1", round_number: 1 }];
    from.mockReturnValue(createQueryBuilder({ data: rows, error: null }));

    const res = await adapter.findByTournament("t1");
    expect(res).toEqual(ok(rows as unknown as PozoRound[]));
  });

  it("findActiveByTournament returns null when inactive", async () => {
    const { adapter, from } = buildAdapter();
    from.mockReturnValue(createQueryBuilder({ data: null, error: null }));

    const res = await adapter.findActiveByTournament("t1");
    expect(res).toEqual(ok(null));
  });

  it("createRound defaults status to in_progress", async () => {
    const { adapter, from } = buildAdapter();
    const builder = createQueryBuilder({ data: { id: "r1", round_number: 1, status: "in_progress" }, error: null });
    from.mockReturnValue(builder);

    const res = await adapter.createRound({ tournament_id: "t1", round_number: 1 });
    expect(res.ok).toBe(true);
    expect(builder.insert).toHaveBeenCalledWith({
      tournament_id: "t1",
      round_number: 1,
      status: "in_progress",
    });
  });

  it("createRound propagates errors", async () => {
    const { adapter, from } = buildAdapter();
    from.mockReturnValue(createQueryBuilder({ data: null, error: { message: "no" } }));

    const res = await adapter.createRound({ tournament_id: "t1", round_number: 1 });
    expect(res).toEqual(err("no"));
  });

  it("findRoundPairs returns pairs ordered by court", async () => {
    const { adapter, from } = buildAdapter();
    const rows = [{ id: "rp1", round_id: "r1", court_number: 1 }];
    from.mockReturnValue(createQueryBuilder({ data: rows, error: null }));

    const res = await adapter.findRoundPairs("r1");
    expect(res).toEqual(ok(rows as unknown as PozoRoundPair[]));
  });

  it("updatePairResult sets winner, score, and finished flag", async () => {
    const { adapter, from } = buildAdapter();
    const builder = createQueryBuilder({ data: null, error: null });
    from.mockReturnValue(builder);

    const res = await adapter.updatePairResult({
      pairId: "rp1",
      winner_drawn_pair_id: "d1",
      score_a: 6,
    });
    expect(res).toEqual(ok(undefined));
    expect(builder.update).toHaveBeenCalledWith({
      winner_drawn_pair_id: "d1",
      score_a: 6,
      is_finished: true,
    });
  });

  it("insertRoundPairs handles an empty list", async () => {
    const { adapter, from } = buildAdapter();
    const builder = createQueryBuilder({ data: null, error: null });
    from.mockReturnValue(builder);

    const res = await adapter.insertRoundPairs([]);
    expect(res).toEqual(ok(undefined));
  });

  it("findRound1IfExists returns the row or null", async () => {
    const { adapter, from } = buildAdapter();
    from.mockReturnValue(createQueryBuilder({ data: { id: "r1" }, error: null }));

    const res = await adapter.findRound1IfExists("t1");
    expect(res).toEqual(ok({ id: "r1" } as unknown as PozoRound));
  });
});

describe("SupabaseMatchHistoryAdapter", () => {
  function buildAdapter() {
    const { from, supabase } = createSupabaseMock();
    const adapter = new SupabaseMatchHistoryAdapter(supabase);
    return { adapter, from };
  }

  function buildPlayerData(): Map<string, { name: string | null; gender: string | null; hand: string | null; level: number | null }> {
    const m = new Map();
    m.set("w1", { name: "Ana", gender: "FEMALE", hand: "LEFT", level: 6 });
    m.set("w2", { name: "Luis", gender: "MALE", hand: "RIGHT", level: 4 });
    m.set("l1", { name: "Sara", gender: "FEMALE", hand: "RIGHT", level: 3 });
    m.set("l2", { name: "Pablo", gender: "MALE", hand: "RIGHT", level: 5 });
    return m;
  }

  it("upsert flattens playerData snapshots", async () => {
    const { adapter, from } = buildAdapter();
    const builder = createQueryBuilder({ data: null, error: null });
    from.mockReturnValue(builder);

    const res = await adapter.upsert({
      tournament_id: "t1",
      round_id: "r1",
      round_number: 1,
      court_number: 1,
      winner_player1_id: "w1",
      winner_player2_id: "w2",
      loser_player1_id: "l1",
      loser_player2_id: "l2",
      winner_drawn_pair_id: "d1",
      loser_drawn_pair_id: "d2",
      playerData: buildPlayerData(),
      score_winner: 6,
      score_loser: 3,
      user_uuid: "u1",
    });
    expect(res).toEqual(ok(undefined));

    const payload = builder.upsert.mock.calls[0][0] as {
      winner_player1_name: string | null;
      winner_player2_level: number | null;
      loser_player1_hand: string | null;
      score_winner: number | null;
      onConflict?: never;
    };
    expect(payload.winner_player1_name).toBe("Ana");
    expect(payload.winner_player2_level).toBe(4);
    expect(payload.loser_player1_hand).toBe("RIGHT");
    expect(payload.score_winner).toBe(6);
  });

  it("upsert uses onConflict on tournament_id,round_id,court_number", async () => {
    const { adapter, from } = buildAdapter();
    const builder = createQueryBuilder({ data: null, error: null });
    from.mockReturnValue(builder);

    await adapter.upsert({
      tournament_id: "t1",
      round_id: "r1",
      round_number: 1,
      court_number: 1,
      winner_player1_id: "w1",
      winner_player2_id: "w2",
      loser_player1_id: "l1",
      loser_player2_id: "l2",
      winner_drawn_pair_id: "d1",
      loser_drawn_pair_id: "d2",
      playerData: buildPlayerData(),
      score_winner: 6,
      score_loser: 3,
      user_uuid: "u1",
    });
    expect(builder.upsert.mock.calls[0][1]).toEqual({
      onConflict: "tournament_id,round_id,court_number",
    });
  });

  it("upsert propagates errors", async () => {
    const { adapter, from } = buildAdapter();
    from.mockReturnValue(createQueryBuilder({ data: null, error: { message: "conflict" } }));

    const res = await adapter.upsert({
      tournament_id: "t1",
      round_id: "r1",
      round_number: 1,
      court_number: 1,
      winner_player1_id: "w1",
      winner_player2_id: "w2",
      loser_player1_id: "l1",
      loser_player2_id: "l2",
      winner_drawn_pair_id: "d1",
      loser_drawn_pair_id: "d2",
      playerData: buildPlayerData(),
      score_winner: 6,
      score_loser: 3,
      user_uuid: "u1",
    });
    expect(res).toEqual(err("conflict"));
  });

  it("findAll returns history scoped by user, newest first", async () => {
    const { adapter, from } = buildAdapter();
    const rows = [{ id: "m1" }];
    from.mockReturnValue(createQueryBuilder({ data: rows, error: null }));

    const res = await adapter.findAll("u1");
    expect(res).toEqual(ok(rows as unknown as MatchHistoryRow[]));
  });

  it("findWinningPartnerships filters by matches and win rate", async () => {
    const { adapter, from } = buildAdapter();
    const base = {
      winner_player1_id: "",
      winner_player2_id: "",
      loser_player1_id: "",
      loser_player2_id: "",
    };
    const history = [
      { ...base, winner_player1_id: "p1", winner_player2_id: "p2", loser_player1_id: "p3", loser_player2_id: "p4" },
      { ...base, winner_player1_id: "p1", winner_player2_id: "p2", loser_player1_id: "p4", loser_player2_id: "p3" },
      { ...base, winner_player1_id: "x5", winner_player2_id: "x6", loser_player1_id: "x7", loser_player2_id: "x8" },
    ];
    from.mockReturnValue(createQueryBuilder({ data: history, error: null }));

    const res = await adapter.findWinningPartnerships("u1");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data).toHaveLength(1);
    expect(res.data[0]).toMatchObject({ a: "p1", b: "p2", wins: 2, total: 2, winRate: 1 });
  });

  it("findWinningPartnerships returns empty when no history", async () => {
    const { adapter, from } = buildAdapter();
    from.mockReturnValue(createQueryBuilder({ data: [], error: null }));

    const res = await adapter.findWinningPartnerships("u1");
    expect(res).toEqual(ok([]));
  });
});