import { describe, it, expect, vi } from "vitest";
import { RoundService } from "../application/services/round.service";
import { ok, err } from "../domain/result";
import type { PozoRound } from "../domain/entities/round";
import type { Tournament } from "../domain/entities/tournament";
import type { Player } from "../domain/entities/player";
import type { DrawnPair } from "../domain/entities/pair";
import type { PozoRoundPair } from "../domain/entities/match";
import type { IPozoRoundRepository } from "../domain/repositories/round.repository";
import type { ITournamentRepository } from "../domain/repositories/tournament.repository";
import type { IDrawnPairRepository } from "../domain/repositories/pair.repository";
import type { IPlayerRepository } from "../domain/repositories/player.repository";
import type { IMatchHistoryRepository } from "../domain/repositories/match.repository";

type Mock = { [k: string]: ReturnType<typeof vi.fn> };

function round(overrides: Partial<PozoRound> & { id: string }): PozoRound {
  return {
    tournament_id: "t1",
    round_number: 1,
    status: "in_progress",
    created_at: "",
    ...overrides,
  };
}

describe("RoundService", () => {
  function buildService() {
    const repos: Record<string, Mock> = {
      pozoRoundRepo: {
        findByTournament: vi.fn(),
        findActiveByTournament: vi.fn(),
        findById: vi.fn(),
        createRound: vi.fn(),
        updateStatus: vi.fn(),
        deleteByTournament: vi.fn(),
        findRoundPairs: vi.fn(),
        findCourtPairs: vi.fn(),
        updatePairResult: vi.fn(),
        insertRoundPairs: vi.fn(),
        deleteRound: vi.fn(),
        findRound1IfExists: vi.fn(),
      },
      tournamentRepo: {
        findById: vi.fn(),
        findAll: vi.fn(),
        create: vi.fn(),
        updateStatus: vi.fn(),
        updateChampion: vi.fn(),
        delete: vi.fn(),
      },
      drawnPairRepo: { findAll: vi.fn() },
      playerRepo: { findAll: vi.fn() },
      matchHistoryRepo: {
        upsert: vi.fn(),
        findAll: vi.fn(),
        findByTournament: vi.fn(),
        findWinningPartnerships: vi.fn(),
      },
    };

    const service = new RoundService(
      repos.pozoRoundRepo as unknown as IPozoRoundRepository,
      repos.tournamentRepo as unknown as ITournamentRepository,
      repos.drawnPairRepo as unknown as IDrawnPairRepository,
      repos.playerRepo as unknown as IPlayerRepository,
      repos.matchHistoryRepo as unknown as IMatchHistoryRepository,
    );
    return { service, repos };
  }

  function courtPair(overrides: Partial<PozoRoundPair> & { id: string }): PozoRoundPair {
    return {
      round_id: "r1",
      drawn_pair_id: "d1",
      court_number: 1,
      winner_drawn_pair_id: null,
      score_a: null,
      score_b: null,
      is_finished: false,
      created_at: "",
      ...overrides,
    };
  }

  describe("getRounds / getActiveRound / getRoundPairs", () => {
    it("delegates to the round repo", async () => {
      const { service, repos } = buildService();
      repos.pozoRoundRepo.findByTournament.mockResolvedValue(ok([round({ id: "r1" })]));
      repos.pozoRoundRepo.findActiveByTournament.mockResolvedValue(ok(null));
      repos.pozoRoundRepo.findRoundPairs.mockResolvedValue(ok([]));

      await expect(service.getRounds("t1")).resolves.toEqual(ok([round({ id: "r1" })]));
      await expect(service.getActiveRound("t1")).resolves.toEqual(ok(null));
      await expect(service.getRoundPairs("r1")).resolves.toEqual(ok([]));
    });
  });

  describe("saveCourtResult", () => {
    it("returns an error when the round does not exist", async () => {
      const { service, repos } = buildService();
      repos.pozoRoundRepo.findById.mockResolvedValue(ok(null));

      const res = await service.saveCourtResult("r1", 1, [], "d1", "u1");
      expect(res).toEqual(err("Ronda no encontrada"));
    });

    it("returns an error when the court has no pairs", async () => {
      const { service, repos } = buildService();
      repos.pozoRoundRepo.findById.mockResolvedValue(ok(round({ id: "r1" })));
      repos.pozoRoundRepo.findCourtPairs.mockResolvedValue(ok([]));

      const res = await service.saveCourtResult("r1", 1, [], "d1", "u1");
      expect(res).toEqual(err("Pista no encontrada"));
    });

    it("updates each pair and records match history", async () => {
      const { service, repos } = buildService();
      repos.pozoRoundRepo.findById.mockResolvedValue(ok(round({ id: "r1", round_number: 3 })));
      repos.pozoRoundRepo.findCourtPairs.mockResolvedValue(
        ok([courtPair({ id: "rp1", drawn_pair_id: "d1" }), courtPair({ id: "rp2", drawn_pair_id: "d2" })]),
      );
      repos.pozoRoundRepo.updatePairResult.mockResolvedValue(ok(undefined));
      repos.drawnPairRepo.findAll.mockResolvedValue(ok([
        { id: "d1", player1_id: "p1", player2_id: "p2" } as unknown as DrawnPair,
        { id: "d2", player1_id: "p3", player2_id: "p4" } as unknown as DrawnPair,
      ]));
      repos.playerRepo.findAll.mockResolvedValue(ok([
        { id: "p1", full_name: "A", gender: "MALE", dominant_hand: "RIGHT", level: 5 } as unknown as Player,
        { id: "p2", full_name: "B", gender: "MALE", dominant_hand: "LEFT", level: 4 } as unknown as Player,
        { id: "p3", full_name: "C", gender: "FEMALE", dominant_hand: "RIGHT", level: 6 } as unknown as Player,
        { id: "p4", full_name: "D", gender: "FEMALE", dominant_hand: "RIGHT", level: 3 } as unknown as Player,
      ]));
      repos.matchHistoryRepo.upsert.mockResolvedValue(ok(undefined));

      const res = await service.saveCourtResult(
        "r1",
        1,
        [
          { drawnPairId: "d1", score: 10 },
          { drawnPairId: "d2", score: 8 },
        ],
        "d1",
        "u1",
      );

      expect(res).toEqual(ok(undefined));
      expect(repos.pozoRoundRepo.updatePairResult).toHaveBeenNthCalledWith(1, {
        pairId: "rp1",
        winner_drawn_pair_id: "d1",
        score_a: 10,
      });
      expect(repos.pozoRoundRepo.updatePairResult).toHaveBeenNthCalledWith(2, {
        pairId: "rp2",
        winner_drawn_pair_id: "d1",
        score_a: 8,
      });
      expect(repos.matchHistoryRepo.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          tournament_id: "t1",
          round_id: "r1",
          round_number: 3,
          court_number: 1,
          winner_player1_id: "p1",
          winner_player2_id: "p2",
          loser_player1_id: "p3",
          loser_player2_id: "p4",
          winner_drawn_pair_id: "d1",
          loser_drawn_pair_id: "d2",
          score_winner: 10,
          score_loser: 8,
          user_uuid: "u1",
        }),
      );
    });

    it("does not record history when winner or loser pair is missing", async () => {
      const { service, repos } = buildService();
      repos.pozoRoundRepo.findById.mockResolvedValue(ok(round({ id: "r1" })));
      repos.pozoRoundRepo.findCourtPairs.mockResolvedValue(ok([courtPair({ id: "rp1", drawn_pair_id: "d1" })]));
      repos.pozoRoundRepo.updatePairResult.mockResolvedValue(ok(undefined));
      repos.drawnPairRepo.findAll.mockResolvedValue(ok([]));

      const res = await service.saveCourtResult("r1", 1, [], "d1", "u1");
      expect(res).toEqual(ok(undefined));
      expect(repos.matchHistoryRepo.upsert).not.toHaveBeenCalled();
    });
  });

  describe("checkAndStartNextRound", () => {
    it("returns empty when the round is already finished", async () => {
      const { service, repos } = buildService();
      repos.pozoRoundRepo.findById.mockResolvedValue(
        ok(round({ id: "r1", status: "finished" })),
      );

      expect(await service.checkAndStartNextRound("t1", "r1", "u1")).toEqual(ok({}));
    });

    it("returns empty when a court has not finished yet", async () => {
      const { service, repos } = buildService();
      repos.pozoRoundRepo.findById.mockResolvedValue(ok(round({ id: "r1", round_number: 1 })));
      repos.pozoRoundRepo.findRoundPairs.mockResolvedValue(
        ok([
          courtPair({ id: "rp1", drawn_pair_id: "d1", winner_drawn_pair_id: "d1", is_finished: true }),
          courtPair({ id: "rp2", drawn_pair_id: "d2", court_number: 1 }),
        ]),
      );

      const res = await service.checkAndStartNextRound("t1", "r1", "u1");
      expect(res).toEqual(ok({}));
      expect(repos.pozoRoundRepo.createRound).not.toHaveBeenCalled();
    });

    it("created the next round with correct movements and flips status to finished", async () => {
      const { service, repos } = buildService();
      repos.pozoRoundRepo.findById.mockResolvedValue(ok(round({ id: "r1", round_number: 1 })));
      repos.pozoRoundRepo.findRoundPairs.mockResolvedValue(
        ok([
          courtPair({ id: "rp1", drawn_pair_id: "d1", winner_drawn_pair_id: "d1", is_finished: true }),
          courtPair({ id: "rp2", drawn_pair_id: "d2", winner_drawn_pair_id: "d1", is_finished: true }),
          courtPair({ id: "rp3", drawn_pair_id: "d3", court_number: 2, winner_drawn_pair_id: "d3", is_finished: true }),
          courtPair({ id: "rp4", drawn_pair_id: "d4", court_number: 2, winner_drawn_pair_id: "d3", is_finished: true }),
        ]),
      );
      repos.tournamentRepo.findById.mockResolvedValue(
        ok({ id: "t1", number_of_courts: 2 } as unknown as Tournament),
      );
      repos.pozoRoundRepo.createRound.mockResolvedValue(
        ok({ id: "r2", round_number: 2 } as unknown as PozoRound),
      );
      repos.pozoRoundRepo.insertRoundPairs.mockResolvedValue(ok(undefined));
      repos.pozoRoundRepo.updateStatus.mockResolvedValue(ok(undefined));

      const res = await service.checkAndStartNextRound("t1", "r1", "u1");
      expect(res).toEqual(ok({ nextRoundNumber: 2 }));

      expect(repos.pozoRoundRepo.createRound).toHaveBeenCalledWith({
        tournament_id: "t1",
        round_number: 2,
      });
      expect(repos.pozoRoundRepo.insertRoundPairs).toHaveBeenCalledWith([
        { round_id: "r2", drawn_pair_id: "d1", court_number: 1 },
        { round_id: "r2", drawn_pair_id: "d2", court_number: 2 },
        { round_id: "r2", drawn_pair_id: "d3", court_number: 1 },
        { round_id: "r2", drawn_pair_id: "d4", court_number: 2 },
      ]);
      expect(repos.pozoRoundRepo.updateStatus).toHaveBeenCalledWith("r1", "finished");
    });

    it("uses only the courts that actually have pairs when the tournament has empty courts", async () => {
      const { service, repos } = buildService();
      repos.pozoRoundRepo.findById.mockResolvedValue(ok(round({ id: "r1", round_number: 1 })));
      repos.pozoRoundRepo.findRoundPairs.mockResolvedValue(
        ok([
          courtPair({ id: "rp1", drawn_pair_id: "d1", winner_drawn_pair_id: "d1", is_finished: true }),
          courtPair({ id: "rp2", drawn_pair_id: "d2", winner_drawn_pair_id: "d1", is_finished: true }),
          courtPair({ id: "rp3", drawn_pair_id: "d3", court_number: 2, winner_drawn_pair_id: "d3", is_finished: true }),
          courtPair({ id: "rp4", drawn_pair_id: "d4", court_number: 2, winner_drawn_pair_id: "d3", is_finished: true }),
          courtPair({ id: "rp5", drawn_pair_id: "d5", court_number: 3, winner_drawn_pair_id: "d5", is_finished: true }),
          courtPair({ id: "rp6", drawn_pair_id: "d6", court_number: 3, winner_drawn_pair_id: "d5", is_finished: true }),
        ]),
      );
      repos.tournamentRepo.findById.mockResolvedValue(
        ok({ id: "t1", number_of_courts: 4 } as unknown as Tournament),
      );
      repos.pozoRoundRepo.createRound.mockResolvedValue(
        ok({ id: "r2", round_number: 2 } as unknown as PozoRound),
      );
      repos.pozoRoundRepo.insertRoundPairs.mockResolvedValue(ok(undefined));
      repos.pozoRoundRepo.updateStatus.mockResolvedValue(ok(undefined));

      const res = await service.checkAndStartNextRound("t1", "r1", "u1");
      expect(res).toEqual(ok({ nextRoundNumber: 2 }));

      const calls = repos.pozoRoundRepo.insertRoundPairs.mock.calls[0][0] as {
        court_number: number;
        drawn_pair_id: string;
      }[];
      const byCourt = new Map<number, string[]>();
      for (const c of calls) {
        byCourt.set(c.court_number, [...(byCourt.get(c.court_number) ?? []), c.drawn_pair_id]);
      }
      expect(byCourt).toEqual(
        new Map([
          [1, ["d1", "d3"]],
          [2, ["d2", "d5"]],
          [3, ["d4", "d6"]],
        ]),
      );
    });

    it("rolls back the created round if inserting pairs fails", async () => {
      const { service, repos } = buildService();
      repos.pozoRoundRepo.findById.mockResolvedValue(ok(round({ id: "r1", round_number: 1 })));
      repos.pozoRoundRepo.findRoundPairs.mockResolvedValue(
        ok([
          courtPair({ id: "rp1", drawn_pair_id: "d1", winner_drawn_pair_id: "d1", is_finished: true }),
          courtPair({ id: "rp2", drawn_pair_id: "d2", winner_drawn_pair_id: "d1", is_finished: true }),
        ]),
      );
      repos.tournamentRepo.findById.mockResolvedValue(
        ok({ id: "t1", number_of_courts: 1 } as unknown as Tournament),
      );
      repos.pozoRoundRepo.createRound.mockResolvedValue(
        ok({ id: "r2", round_number: 2 } as unknown as PozoRound),
      );
      repos.pozoRoundRepo.insertRoundPairs.mockResolvedValue(err("no insert"));

      const res = await service.checkAndStartNextRound("t1", "r1", "u1");
      expect(res).toEqual(err("no insert"));
      expect(repos.pozoRoundRepo.deleteRound).toHaveBeenCalledWith("r2");
      expect(repos.pozoRoundRepo.updateStatus).not.toHaveBeenCalled();
    });

    it("returns an error when the tournament is not found", async () => {
      const { service, repos } = buildService();
      repos.pozoRoundRepo.findById.mockResolvedValue(ok(round({ id: "r1", round_number: 1 })));
      repos.pozoRoundRepo.findRoundPairs.mockResolvedValue(
        ok([
          courtPair({ id: "rp1", drawn_pair_id: "d1", winner_drawn_pair_id: "d1", is_finished: true }),
          courtPair({ id: "rp2", drawn_pair_id: "d2", winner_drawn_pair_id: "d1", is_finished: true }),
        ]),
      );
      repos.tournamentRepo.findById.mockResolvedValue(ok(null));

      const res = await service.checkAndStartNextRound("t1", "r1", "u1");
      expect(res).toEqual(err("Torneo no encontrado"));
    });
  });

  describe("finalizePozo", () => {
    const championPair = courtPair({
      id: "rp1",
      drawn_pair_id: "dChampion",
      winner_drawn_pair_id: "dChampion",
      is_finished: true,
      score_a: 10,
      score_b: 6,
    });

    it("returns an error when there are no rounds", async () => {
      const { service, repos } = buildService();
      repos.pozoRoundRepo.findByTournament.mockResolvedValue(ok([]));

      const res = await service.finalizePozo("t1", "u1");
      expect(res).toEqual(err("No hay rondas para finalizar"));
    });

    it("returns an error when court 1 has no defined champion", async () => {
      const { service, repos } = buildService();
      repos.pozoRoundRepo.findByTournament.mockResolvedValue(ok([round({ id: "r1" })]));
      repos.pozoRoundRepo.findCourtPairs.mockResolvedValue(
        ok([courtPair({ id: "rp1", drawn_pair_id: "dChampion", is_finished: false })]),
      );

      const res = await service.finalizePozo("t1", "u1");
      expect(res).toEqual(err("La pista 1 todavía no tiene un ganador definido"));
    });

    it("marks the winner of the latest court-1 match as champion", async () => {
      const { service, repos } = buildService();
      const loserOnCourt1 = courtPair({
        id: "rp2",
        drawn_pair_id: "dLoser",
        winner_drawn_pair_id: "dChampion",
      });
      repos.pozoRoundRepo.findByTournament.mockResolvedValue(ok([
        round({ id: "r1", round_number: 1 }),
        round({ id: "r2", round_number: 2 }),
      ]));
      repos.pozoRoundRepo.findCourtPairs.mockImplementation((roundId) =>
        roundId === "r2"
          ? Promise.resolve(ok([championPair, loserOnCourt1]))
          : Promise.resolve(ok([])),
      );
      repos.tournamentRepo.updateChampion.mockResolvedValue(ok(undefined));

      const res = await service.finalizePozo("t1", "u1");
      expect(res).toEqual(ok(undefined));
      expect(repos.tournamentRepo.updateChampion).toHaveBeenCalledWith("t1", "u1", "dChampion");
    });
  });
});