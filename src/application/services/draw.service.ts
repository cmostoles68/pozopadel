import type { IDrawnPairRepository, ITournamentDrawnPairRepository } from "@/domain/repositories/pair.repository";
import type { IPlayerRepository } from "@/domain/repositories/player.repository";
import type { IMatchHistoryRepository } from "@/domain/repositories/match.repository";
import type { IPozoRoundRepository } from "@/domain/repositories/round.repository";
import type { ITournamentRepository } from "@/domain/repositories/tournament.repository";
import type { DrawMethod } from "@/domain/entities/pair";
import type { TournamentDrawnPair } from "@/domain/entities/pair";
import type { DrawPairsResult, DrawCourtsResult } from "../dto/draw.dto";
import { pairPlayers, shuffleArray } from "@/domain/algorithms/draw";

export class DrawService {
  constructor(
    private drawnPairRepo: IDrawnPairRepository,
    private tournamentDrawnPairRepo: ITournamentDrawnPairRepository,
    private playerRepo: IPlayerRepository,
    private matchHistoryRepo: IMatchHistoryRepository,
    private pozoRoundRepo: IPozoRoundRepository,
    private tournamentRepo: ITournamentRepository,
  ) {}

  async drawPairs(method: DrawMethod): Promise<DrawPairsResult> {
    const players = await this.playerRepo.findProfiles();
    if (players.length < 2) {
      return { error: "Se necesitan al menos 2 jugadores para sortear parejas." };
    }

    await this.drawnPairRepo.deleteAll();

    const winningPartnerships = await this.matchHistoryRepo.findWinningPartnerships();
    const disallowedPairs = new Set(
      winningPartnerships.map((p) => [p.a, p.b].sort().join("|"))
    );

    const paired = pairPlayers(players, method, disallowedPairs);

    const pairsToInsert = paired.map(([a, b], i) => ({
      pair_number: i + 1,
      player1_id: a.id,
      player2_id: b.id,
      draw_method: method,
    }));

    const inserted = await this.drawnPairRepo.insert(pairsToInsert);

    const usedCount = paired.length * 2;
    const oddPlayer =
      players.length - usedCount > 0
        ? players.find(
            (p) => !paired.some(([a, b]) => a.id === p.id || b.id === p.id),
          )
        : null;

    return {
      ok: true,
      pairs: inserted,
      oddPlayer: oddPlayer?.full_name ?? null,
    };
  }

  async clearPairs(): Promise<void> {
    await this.drawnPairRepo.deleteAll();
  }

  async getDrawnPairsWithProfiles() {
    return this.drawnPairRepo.findAllWithProfiles();
  }

  async selectPair(tournamentId: string, drawnPairId: string): Promise<void> {
    await this.tournamentDrawnPairRepo.selectPair(tournamentId, drawnPairId);
  }

  async deselectPair(tournamentId: string, drawnPairId: string): Promise<void> {
    await this.tournamentDrawnPairRepo.deselectPair(tournamentId, drawnPairId);
  }

  async selectAllPairs(tournamentId: string): Promise<void> {
    const allPairs = await this.drawnPairRepo.findAll();
    const allPairIds = allPairs.map((p) => p.id);
    await this.tournamentDrawnPairRepo.selectAllPairs(tournamentId, allPairIds);
  }

  async drawCourts(tournamentId: string): Promise<DrawCourtsResult> {
    const tournament = await this.tournamentRepo.findById(tournamentId);
    if (!tournament) return { error: "Torneo no encontrado" };

    const selected = await this.tournamentDrawnPairRepo.findByTournament(tournamentId);

    if (!selected || selected.length === 0) {
      return { error: "No hay parejas seleccionadas" };
    }

    const maxPairs = tournament.number_of_courts * 2;
    if (selected.length > maxPairs) {
      return {
        error: `Hay ${selected.length} parejas pero solo ${tournament.number_of_courts} pistas (caben ${maxPairs}). Elimina alguna pareja o añade pistas.`,
      };
    }

    const shuffled = shuffleArray(selected);

    const updates = shuffled.map((pair, i) => ({
      id: pair.id,
      court_number: Math.floor(i / 2) + 1,
    }));

    for (const u of updates) {
      await this.tournamentDrawnPairRepo.updateCourtNumber(u.id, u.court_number);
    }

    return { ok: true };
  }

  async clearCourtDraw(tournamentId: string): Promise<void> {
    await this.tournamentDrawnPairRepo.clearCourtNumbers(tournamentId);
    await this.pozoRoundRepo.deleteByTournament(tournamentId);
  }

  async seedRound1(tournamentId: string): Promise<void> {
    const existing = await this.pozoRoundRepo.findRound1IfExists(tournamentId);
    if (existing) return;

    const courts = await this.tournamentDrawnPairRepo.getSelectedWithCourt(tournamentId);
    if (courts.length === 0) return;

    const round = await this.pozoRoundRepo.createRound({
      tournament_id: tournamentId,
      round_number: 1,
    });

    await this.pozoRoundRepo.insertRoundPairs(
      courts
        .filter((c): c is TournamentDrawnPair & { court_number: number } => c.court_number !== null)
        .map((c) => ({
          round_id: round.id,
          drawn_pair_id: c.drawn_pair_id,
          court_number: c.court_number,
        }))
    );
  }
}
