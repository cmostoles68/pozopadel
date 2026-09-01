import type { IPozoRoundRepository } from "@/domain/repositories/round.repository";
import type { ITournamentRepository } from "@/domain/repositories/tournament.repository";
import type { IDrawnPairRepository } from "@/domain/repositories/pair.repository";
import type { IPlayerRepository } from "@/domain/repositories/player.repository";
import type { IMatchHistoryRepository } from "@/domain/repositories/match.repository";
import type { PozoRound } from "@/domain/entities/round";
import type { PozoRoundPair } from "@/domain/entities/match";
import type { CourtResultInput, SaveCourtResultResult, CheckAndStartNextResult, FinalizePozoResult } from "../dto/round.dto";
import { calculatePairMovements } from "@/domain/algorithms/movements";

export class RoundService {
  constructor(
    private pozoRoundRepo: IPozoRoundRepository,
    private tournamentRepo: ITournamentRepository,
    private drawnPairRepo: IDrawnPairRepository,
    private playerRepo: IPlayerRepository,
    private matchHistoryRepo: IMatchHistoryRepository,
  ) {}

  async getRounds(tournamentId: string): Promise<PozoRound[]> {
    return this.pozoRoundRepo.findByTournament(tournamentId);
  }

  async getActiveRound(tournamentId: string): Promise<PozoRound | null> {
    return this.pozoRoundRepo.findActiveByTournament(tournamentId);
  }

  async getRoundPairs(roundId: string): Promise<PozoRoundPair[]> {
    return this.pozoRoundRepo.findRoundPairs(roundId);
  }

  async saveCourtResult(
    roundId: string,
    courtNumber: number,
    results: CourtResultInput[],
    winnerDrawnPairId: string,
    userUuid: string,
  ): Promise<SaveCourtResultResult> {
    const round = await this.pozoRoundRepo.findById(roundId);
    if (!round) return { error: "Ronda no encontrada" };

    const rows = await this.pozoRoundRepo.findCourtPairs(roundId, courtNumber);
    if (rows.length === 0) return { error: "Pista no encontrada" };

    const scoreMap: Record<string, number> = {};
    for (const r of results) scoreMap[r.drawnPairId] = r.score;

    for (const row of rows) {
      const score = scoreMap[row.drawn_pair_id] ?? 0;
      await this.pozoRoundRepo.updatePairResult({
        pairId: row.id,
        winner_drawn_pair_id: winnerDrawnPairId,
        score_a: score,
      });
    }

    // Record match history
    await this.recordMatchHistory(
      round.tournament_id,
      round.id,
      round.round_number,
      courtNumber,
      rows.map((r) => r.drawn_pair_id),
      winnerDrawnPairId,
      scoreMap,
      userUuid,
    );

    return { ok: true };
  }

  private async recordMatchHistory(
    tournamentId: string,
    roundId: string,
    roundNumber: number,
    courtNumber: number,
    drawnPairIds: string[],
    winnerDrawnPairId: string,
    scoreMap: Record<string, number>,
    userUuid: string,
  ): Promise<void> {
    const allPairs = await this.drawnPairRepo.findAll(userUuid);

    const winnerPair = allPairs.find((p) => p.id === winnerDrawnPairId);
    const loserPair = allPairs.find(
      (p) => drawnPairIds.includes(p.id) && p.id !== winnerDrawnPairId,
    );

    if (!winnerPair || !loserPair) return;

    const playerIds = [
      winnerPair.player1_id,
      winnerPair.player2_id,
      loserPair.player1_id,
      loserPair.player2_id,
    ];

    const profiles = await this.playerRepo.findAll(userUuid);
    const profileById = new Map(profiles.map((p) => [p.id, p] as const));

    const playerData = new Map<
      string,
      { name: string | null; gender: string | null; hand: string | null; level: number | null }
    >();

    for (const id of playerIds) {
      const p = profileById.get(id);
      playerData.set(id, {
        name: p?.full_name ?? null,
        gender: p?.gender ?? null,
        hand: p?.dominant_hand ?? null,
        level: p?.level ?? null,
      });
    }

    await this.matchHistoryRepo.upsert({
      tournament_id: tournamentId,
      round_id: roundId,
      round_number: roundNumber,
      court_number: courtNumber,
      winner_player1_id: winnerPair.player1_id,
      winner_player2_id: winnerPair.player2_id,
      loser_player1_id: loserPair.player1_id,
      loser_player2_id: loserPair.player2_id,
      winner_drawn_pair_id: winnerPair.id,
      loser_drawn_pair_id: loserPair.id,
      playerData,
      score_winner: scoreMap[winnerPair.id] ?? null,
      score_loser: scoreMap[loserPair.id] ?? null,
      user_uuid: userUuid,
    });
  }

  async checkAndStartNextRound(
    tournamentId: string,
    roundId: string,
  ): Promise<CheckAndStartNextResult> {
    const round = await this.pozoRoundRepo.findById(roundId);
    if (!round || round.status === "finished") return { ok: true };

    const pairs = await this.pozoRoundRepo.findRoundPairs(roundId);
    if (pairs.length === 0) return { ok: true };

    const courts = Array.from(new Set(pairs.map((p) => p.court_number)));
    for (const court of courts) {
      const courtPairs = pairs.filter((p) => p.court_number === court);
      if (courtPairs.length < 2) return { ok: true };
      if (!courtPairs.every((p) => p.is_finished)) return { ok: true };
    }

    const tournament = await this.tournamentRepo.findById(tournamentId);
    if (!tournament) return { error: "Torneo no encontrado" };

    const results = courts.map((court) => {
      const courtPairs = pairs.filter((p) => p.court_number === court);
      const winnerPair = courtPairs.find((p) => p.winner_drawn_pair_id === p.drawn_pair_id);
      const loserPair = courtPairs.find((p) => p !== winnerPair) ?? null;
      return {
        court_number: court,
        winner_drawn_pair_id: winnerPair?.drawn_pair_id ?? "",
        loser_drawn_pair_id: loserPair?.drawn_pair_id ?? "",
      };
    });

    const movements = calculatePairMovements(results, tournament.number_of_courts);
    const nextAssignments = movements.map((m) => ({
      drawnPairId: m.drawn_pair_id,
      court: m.court_number,
    }));

    let nextRound: PozoRound;
    try {
      nextRound = await this.pozoRoundRepo.createRound({
        tournament_id: tournamentId,
        round_number: round.round_number + 1,
      });
    } catch {
      return { error: "No se pudo crear la siguiente ronda" };
    }

    try {
      await this.pozoRoundRepo.insertRoundPairs(
        nextAssignments.map((a) => ({
          round_id: nextRound.id,
          drawn_pair_id: a.drawnPairId,
          court_number: a.court,
        }))
      );
    } catch {
      await this.pozoRoundRepo.deleteRound(nextRound.id);
      return { error: "No se pudieron crear las parejas de la siguiente ronda" };
    }

    await this.pozoRoundRepo.updateStatus(roundId, "finished");

    return { ok: true, nextRoundNumber: nextRound.round_number };
  }

  async finalizePozo(tournamentId: string): Promise<FinalizePozoResult> {
    const rounds = await this.pozoRoundRepo.findByTournament(tournamentId);

    if (rounds.length === 0) {
      return { error: "No hay rondas para finalizar" };
    }

    // El campeón es quien gana la pista rey (1) en la última ronda jugada.
    // findByTournament ordena por round_number ascendente; recorremos de la
    // más reciente hacia atrás hasta encontrar una con ganador definido en la
    // pista rey (descarta la posible nueva ronda aún sin resultado).
    let champion: string | null = null;
    for (let i = rounds.length - 1; i >= 0; i--) {
      const court1Pairs = await this.pozoRoundRepo.findCourtPairs(rounds[i].id, 1);
      if (court1Pairs.length < 2) continue;
      const winner = court1Pairs.find(
        (p) => p.winner_drawn_pair_id === p.drawn_pair_id && p.is_finished,
      );
      if (winner) {
        champion = winner.drawn_pair_id;
        break;
      }
    }

    if (!champion) {
      return { error: "La pista 1 todavía no tiene un ganador definido" };
    }

    await this.tournamentRepo.updateChampion(tournamentId, champion);
    return { ok: true };
  }
}
