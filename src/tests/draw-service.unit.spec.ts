import { describe, it, expect, vi } from "vitest";
import { DrawService } from "../application/services/draw.service";
import { ok, err } from "../domain/result";
import type { PlayerProfile } from "../domain/entities/player";
import type { IDrawnPairRepository, ITournamentDrawnPairRepository } from "../domain/repositories/pair.repository";
import type { IPlayerRepository } from "../domain/repositories/player.repository";
import type { IMatchHistoryRepository } from "../domain/repositories/match.repository";
import type { IPozoRoundRepository } from "../domain/repositories/round.repository";
import type { ITournamentRepository } from "../domain/repositories/tournament.repository";
import type { Tournament } from "../domain/entities/tournament";
import type { TournamentDrawnPair, DrawnPair } from "../domain/entities/pair";
import type { PozoRound } from "../domain/entities/round";

type Mock = { [k: string]: ReturnType<typeof vi.fn> };

function makePlayers(count: number): PlayerProfile[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}`,
    full_name: `Jugador ${i + 1}`,
    level: 5,
    gender: "MALE",
    dominant_hand: "RIGHT",
  }));
}

describe("DrawService", () => {
  function buildService() {
    const repos: Record<string, Mock> = {
      drawnPairRepo: {
        findAll: vi.fn(),
        findAllWithProfiles: vi.fn(),
        deleteAll: vi.fn(),
        insert: vi.fn(),
      },
      tournamentDrawnPairRepo: {
        findByTournament: vi.fn(),
        selectPair: vi.fn(),
        deselectPair: vi.fn(),
        selectAllPairs: vi.fn(),
        updateCourtNumber: vi.fn(),
        clearCourtNumbers: vi.fn(),
        getSelectedWithCourt: vi.fn(),
      },
      playerRepo: { findProfiles: vi.fn() },
      matchHistoryRepo: { findWinningPartnerships: vi.fn() },
      pozoRoundRepo: {
        deleteByTournament: vi.fn(),
        findRound1IfExists: vi.fn(),
        createRound: vi.fn(),
        insertRoundPairs: vi.fn(),
      },
      tournamentRepo: { findById: vi.fn() },
    };

    const service = new DrawService(
      repos.drawnPairRepo as unknown as IDrawnPairRepository,
      repos.tournamentDrawnPairRepo as unknown as ITournamentDrawnPairRepository,
      repos.playerRepo as unknown as IPlayerRepository,
      repos.matchHistoryRepo as unknown as IMatchHistoryRepository,
      repos.pozoRoundRepo as unknown as IPozoRoundRepository,
      repos.tournamentRepo as unknown as ITournamentRepository,
    );
    return { service, repos };
  }

  describe("drawPairs", () => {
    it("rejects fewer than 4 players", async () => {
      const { service, repos } = buildService();
      repos.playerRepo.findProfiles.mockResolvedValue(ok(makePlayers(2)));

      const res = await service.drawPairs("random", "u1");
      expect(res.ok).toBe(false);
      expect((res as { error: string }).error).toContain("al menos 4");
      expect(repos.drawnPairRepo.deleteAll).not.toHaveBeenCalled();
    });

    it("rejects an odd number of players", async () => {
      const { service, repos } = buildService();
      repos.playerRepo.findProfiles.mockResolvedValue(ok(makePlayers(5)));

      const res = await service.drawPairs("random", "u1");
      expect(res.ok).toBe(false);
      expect((res as { error: string }).error).toContain("par");
    });

    it("propagates errors from the player repo", async () => {
      const { service, repos } = buildService();
      repos.playerRepo.findProfiles.mockResolvedValue(err("boom"));

      const res = await service.drawPairs("random", "u1");
      expect(res).toEqual(err("boom"));
    });

    it("inserts pairs and reports no odd player for an even field", async () => {
      const { service, repos } = buildService();
      repos.playerRepo.findProfiles.mockResolvedValue(ok(makePlayers(4)));
      repos.drawnPairRepo.deleteAll.mockResolvedValue(ok(undefined));
      repos.matchHistoryRepo.findWinningPartnerships.mockResolvedValue(ok([]));
      repos.drawnPairRepo.insert.mockResolvedValue(
        ok([
          {
            id: "d1",
            pair_number: 1,
            player1_id: "p1",
            player2_id: "p2",
            draw_method: "random",
            created_at: "",
          },
          {
            id: "d2",
            pair_number: 2,
            player1_id: "p3",
            player2_id: "p4",
            draw_method: "random",
            created_at: "",
          },
        ]),
      );

      const res = await service.drawPairs("random", "u1");
      expect(res).toEqual(
        ok({
          pairs: [
            { id: "d1", pair_number: 1, player1_id: "p1", player2_id: "p2", draw_method: "random" },
            { id: "d2", pair_number: 2, player1_id: "p3", player2_id: "p4", draw_method: "random" },
          ],
          oddPlayer: null,
        }),
      );
      expect(repos.drawnPairRepo.deleteAll).toHaveBeenCalledWith("u1");
      expect(repos.drawnPairRepo.insert).toHaveBeenCalled();
    });

    it("propagates errors from deleteAll", async () => {
      const { service, repos } = buildService();
      repos.playerRepo.findProfiles.mockResolvedValue(ok(makePlayers(4)));
      repos.drawnPairRepo.deleteAll.mockResolvedValue(err("no delete"));

      const res = await service.drawPairs("random", "u1");
      expect(res).toEqual(err("no delete"));
    });

    it("propagates errors from findWinningPartnerships", async () => {
      const { service, repos } = buildService();
      repos.playerRepo.findProfiles.mockResolvedValue(ok(makePlayers(4)));
      repos.drawnPairRepo.deleteAll.mockResolvedValue(ok(undefined));
      repos.matchHistoryRepo.findWinningPartnerships.mockResolvedValue(err("no history"));

      const res = await service.drawPairs("random", "u1");
      expect(res).toEqual(err("no history"));
    });

    it("propagates errors from insert", async () => {
      const { service, repos } = buildService();
      repos.playerRepo.findProfiles.mockResolvedValue(ok(makePlayers(4)));
      repos.drawnPairRepo.deleteAll.mockResolvedValue(ok(undefined));
      repos.matchHistoryRepo.findWinningPartnerships.mockResolvedValue(ok([]));
      repos.drawnPairRepo.insert.mockResolvedValue(err("no insert"));

      const res = await service.drawPairs("random", "u1");
      expect(res).toEqual(err("no insert"));
    });
  });

  describe("drawCourts", () => {
    it("returns an error when the tournament is not found", async () => {
      const { service, repos } = buildService();
      repos.tournamentRepo.findById.mockResolvedValue(ok(null));

      const res = await service.drawCourts("t1", "u1");
      expect(res.ok).toBe(false);
      expect((res as { error: string }).error).toBe("Torneo no encontrado");
    });

    it("returns an error when there are no selected pairs", async () => {
      const { service, repos } = buildService();
      repos.tournamentRepo.findById.mockResolvedValue(
        ok({ id: "t1", number_of_courts: 2 } as unknown as Tournament),
      );
      repos.tournamentDrawnPairRepo.findByTournament.mockResolvedValue(ok([]));

      const res = await service.drawCourts("t1", "u1");
      expect(res.ok).toBe(false);
      expect((res as { error: string }).error).toBe("No hay parejas seleccionadas");
    });

    it("rejects more pairs than the courts can hold", async () => {
      const { service, repos } = buildService();
      repos.tournamentRepo.findById.mockResolvedValue(
        ok({ id: "t1", number_of_courts: 2 } as unknown as Tournament),
      );
      repos.tournamentDrawnPairRepo.findByTournament.mockResolvedValue(
        ok([1, 2, 3, 4, 5].map((n) => ({ id: `s${n}` })) as unknown as TournamentDrawnPair[]),
      );

      const res = await service.drawCourts("t1", "u1");
      expect(res.ok).toBe(false);
      expect((res as { error: string }).error).toContain("2 pistas");
    });

    it("assigns two pairs per court", async () => {
      const { service, repos } = buildService();
      repos.tournamentRepo.findById.mockResolvedValue(
        ok({ id: "t1", number_of_courts: 2 } as unknown as Tournament),
      );
      repos.tournamentDrawnPairRepo.findByTournament.mockResolvedValue(
        ok([1, 2, 3, 4].map((n) => ({ id: `s${n}` })) as unknown as TournamentDrawnPair[]),
      );
      repos.tournamentDrawnPairRepo.updateCourtNumber.mockResolvedValue(ok(undefined));

      const res = await service.drawCourts("t1", "u1");
      expect(res).toEqual(ok(undefined));

      const calls = repos.tournamentDrawnPairRepo.updateCourtNumber.mock.calls.map(
        (call) => call[1],
      ) as number[];
      expect(calls.sort()).toEqual([1, 1, 2, 2]);
    });
  });

  describe("selectAllPairs", () => {
    it("selects every drawn pair for the tournament", async () => {
      const { service, repos } = buildService();
      repos.drawnPairRepo.findAll.mockResolvedValue(ok([
        { id: "d1" } as unknown as DrawnPair,
        { id: "d2" } as unknown as DrawnPair,
      ]));
      repos.tournamentDrawnPairRepo.selectAllPairs.mockResolvedValue(ok(undefined));

      const res = await service.selectAllPairs("t1", "u1");
      expect(res).toEqual(ok(undefined));
      expect(repos.tournamentDrawnPairRepo.selectAllPairs).toHaveBeenCalledWith("t1", [
        "d1",
        "d2",
      ]);
    });

    it("propagates errors from findAll", async () => {
      const { service, repos } = buildService();
      repos.drawnPairRepo.findAll.mockResolvedValue(err("boom"));

      const res = await service.selectAllPairs("t1", "u1");
      expect(res).toEqual(err("boom"));
    });
  });

  describe("clearCourtDraw", () => {
    it("clears court numbers and deletes seeded rounds", async () => {
      const { service, repos } = buildService();
      repos.tournamentDrawnPairRepo.clearCourtNumbers.mockResolvedValue(ok(undefined));
      repos.pozoRoundRepo.deleteByTournament.mockResolvedValue(ok(undefined));

      const res = await service.clearCourtDraw("t1");
      expect(res).toEqual(ok(undefined));
      expect(repos.pozoRoundRepo.deleteByTournament).toHaveBeenCalledWith("t1");
    });

    it("propagates errors from clearCourtNumbers", async () => {
      const { service, repos } = buildService();
      repos.tournamentDrawnPairRepo.clearCourtNumbers.mockResolvedValue(err("boom"));

      const res = await service.clearCourtDraw("t1");
      expect(res).toEqual(err("boom"));
      expect(repos.pozoRoundRepo.deleteByTournament).not.toHaveBeenCalled();
    });
  });

  describe("seedRound1", () => {
    it("does nothing when round 1 already exists", async () => {
      const { service, repos } = buildService();
      repos.pozoRoundRepo.findRound1IfExists.mockResolvedValue(
        ok({ id: "r1" } as unknown as PozoRound),
      );

      const res = await service.seedRound1("t1");
      expect(res).toEqual(ok(undefined));
      expect(repos.pozoRoundRepo.createRound).not.toHaveBeenCalled();
    });

    it("does nothing when no pairs have a court assigned", async () => {
      const { service, repos } = buildService();
      repos.pozoRoundRepo.findRound1IfExists.mockResolvedValue(ok(null));
      repos.tournamentDrawnPairRepo.getSelectedWithCourt.mockResolvedValue(ok([]));

      const res = await service.seedRound1("t1");
      expect(res).toEqual(ok(undefined));
      expect(repos.pozoRoundRepo.createRound).not.toHaveBeenCalled();
    });

    it("creates round 1 and inserts its pairs", async () => {
      const { service, repos } = buildService();
      repos.pozoRoundRepo.findRound1IfExists.mockResolvedValue(ok(null));
      repos.tournamentDrawnPairRepo.getSelectedWithCourt.mockResolvedValue(
        ok([
          { id: "s1", drawn_pair_id: "d1", court_number: 1 },
          { id: "s2", drawn_pair_id: "d2", court_number: 2 },
          { id: "s3", drawn_pair_id: "d3", court_number: 3 },
        ] as unknown as TournamentDrawnPair[]),
      );
      repos.pozoRoundRepo.createRound.mockResolvedValue(
        ok({ id: "r1", round_number: 1 } as unknown as PozoRound),
      );
      repos.pozoRoundRepo.insertRoundPairs.mockResolvedValue(ok(undefined));

      const res = await service.seedRound1("t1");
      expect(res).toEqual(ok(undefined));
      expect(repos.pozoRoundRepo.createRound).toHaveBeenCalledWith({
        tournament_id: "t1",
        round_number: 1,
      });
      expect(repos.pozoRoundRepo.insertRoundPairs).toHaveBeenCalledWith([
        { round_id: "r1", drawn_pair_id: "d1", court_number: 1 },
        { round_id: "r1", drawn_pair_id: "d2", court_number: 2 },
        { round_id: "r1", drawn_pair_id: "d3", court_number: 3 },
      ]);
    });
  });
});