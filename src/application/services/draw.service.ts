import type { IDrawnPairRepository, ITournamentDrawnPairRepository } from "@/domain/repositories/pair.repository";
import type { IPlayerRepository } from "@/domain/repositories/player.repository";
import type { IMatchHistoryRepository } from "@/domain/repositories/match.repository";
import type { IPozoRoundRepository } from "@/domain/repositories/round.repository";
import type { ITournamentRepository } from "@/domain/repositories/tournament.repository";
import type { DrawMethod } from "@/domain/entities/pair";
import type { TournamentDrawnPair } from "@/domain/entities/pair";
import type { Result } from "@/domain/result";
import { err } from "@/domain/result";
import { pairPlayers, shuffleArray, getDrawValidationError } from "@/domain/algorithms/draw";

export interface DrawnPairResult {
  id: string;
  pair_number: number;
  player1_id: string;
  player2_id: string;
  draw_method: string;
}

export class DrawService {
  constructor(
    private drawnPairRepo: IDrawnPairRepository,
    private tournamentDrawnPairRepo: ITournamentDrawnPairRepository,
    private playerRepo: IPlayerRepository,
    private matchHistoryRepo: IMatchHistoryRepository,
    private pozoRoundRepo: IPozoRoundRepository,
    private tournamentRepo: ITournamentRepository,
  ) {}

  async drawPairs(
    method: DrawMethod,
    userUuid: string,
  ): Promise<Result<{ pairs: DrawnPairResult[]; oddPlayer: string | null }>> {
    const players = await this.playerRepo.findProfiles(userUuid);
    if (!players.ok) return players;

    const validationError = getDrawValidationError(players.data.length);
    if (validationError) {
      return err(validationError);
    }

    const cleared = await this.drawnPairRepo.deleteAll(userUuid);
    if (!cleared.ok) return cleared;

    const winningPartnerships = await this.matchHistoryRepo.findWinningPartnerships(userUuid);
    if (!winningPartnerships.ok) return winningPartnerships;

    const disallowedPairs = new Set(
      winningPartnerships.data.map((p) => [p.a, p.b].sort().join("|"))
    );

    const paired = pairPlayers(players.data, method, disallowedPairs);

    const pairsToInsert = paired.map(([a, b], i) => ({
      pair_number: i + 1,
      player1_id: a.id,
      player2_id: b.id,
      draw_method: method,
    }));

    if (pairsToInsert.length === 0) {
      return { ok: true, data: { pairs: [], oddPlayer: players.data[0]?.full_name ?? null } };
    }

    const inserted = await this.drawnPairRepo.insert(pairsToInsert, userUuid);
    if (!inserted.ok) return inserted;

    const usedCount = paired.length * 2;
    const oddPlayer =
      players.data.length - usedCount > 0
        ? players.data.find(
            (p) => !paired.some(([a, b]) => a.id === p.id || b.id === p.id),
          )
        : null;

    return {
      ok: true,
      data: {
        pairs: inserted.data.map((p) => ({
          id: p.id,
          pair_number: p.pair_number,
          player1_id: p.player1_id,
          player2_id: p.player2_id,
          draw_method: p.draw_method,
        })),
        oddPlayer: oddPlayer?.full_name ?? null,
      },
    };
  }

  async clearPairs(userUuid: string): Promise<Result<void>> {
    return this.drawnPairRepo.deleteAll(userUuid);
  }

  async getDrawnPairsWithProfiles(userUuid: string) {
    return this.drawnPairRepo.findAllWithProfiles(userUuid);
  }

  async selectPair(tournamentId: string, drawnPairId: string): Promise<Result<void>> {
    return this.tournamentDrawnPairRepo.selectPair(tournamentId, drawnPairId);
  }

  async deselectPair(tournamentId: string, drawnPairId: string): Promise<Result<void>> {
    return this.tournamentDrawnPairRepo.deselectPair(tournamentId, drawnPairId);
  }

  async selectAllPairs(tournamentId: string, userUuid: string): Promise<Result<void>> {
    const allPairs = await this.drawnPairRepo.findAll(userUuid);
    if (!allPairs.ok) return allPairs;
    const allPairIds = allPairs.data.map((p) => p.id);
    return this.tournamentDrawnPairRepo.selectAllPairs(tournamentId, allPairIds);
  }

  async drawCourts(tournamentId: string, userUuid: string): Promise<Result<void>> {
    const tournament = await this.tournamentRepo.findById(tournamentId, userUuid);
    if (!tournament.ok) return tournament;
    if (!tournament.data) return err("Torneo no encontrado");

    const selected = await this.tournamentDrawnPairRepo.findByTournament(tournamentId);
    if (!selected.ok) return selected;

    if (!selected.data || selected.data.length === 0) {
      return err("No hay parejas seleccionadas");
    }

    const maxPairs = tournament.data.number_of_courts * 2;
    if (selected.data.length > maxPairs) {
      return err(
        `Hay ${selected.data.length} parejas pero solo ${tournament.data.number_of_courts} pistas (caben ${maxPairs}). Elimina alguna pareja o añade pistas.`,
      );
    }

    const shuffled = shuffleArray(selected.data);

    const updates = shuffled.map((pair, i) => ({
      id: pair.id,
      court_number: Math.floor(i / 2) + 1,
    }));

    for (const u of updates) {
      const res = await this.tournamentDrawnPairRepo.updateCourtNumber(u.id, u.court_number);
      if (!res.ok) return res;
    }

    return { ok: true, data: undefined };
  }

  async clearCourtDraw(tournamentId: string): Promise<Result<void>> {
    const cleared = await this.tournamentDrawnPairRepo.clearCourtNumbers(tournamentId);
    if (!cleared.ok) return cleared;
    return this.pozoRoundRepo.deleteByTournament(tournamentId);
  }

  async seedRound1(tournamentId: string): Promise<Result<void>> {
    const existing = await this.pozoRoundRepo.findRound1IfExists(tournamentId);
    if (!existing.ok) return existing;
    if (existing.data) return { ok: true, data: undefined };

    const courts = await this.tournamentDrawnPairRepo.getSelectedWithCourt(tournamentId);
    if (!courts.ok) return courts;
    if (courts.data.length === 0) return { ok: true, data: undefined };

    const round = await this.pozoRoundRepo.createRound({
      tournament_id: tournamentId,
      round_number: 1,
    });
    if (!round.ok) return round;

    const inserted = await this.pozoRoundRepo.insertRoundPairs(
      courts.data
        .filter((c): c is TournamentDrawnPair & { court_number: number } => c.court_number !== null)
        .map((c) => ({
          round_id: round.data.id,
          drawn_pair_id: c.drawn_pair_id,
          court_number: c.court_number,
        }))
    );
    return inserted;
  }
}