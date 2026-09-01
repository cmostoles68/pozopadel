import type { IPozoRoundRepository } from "@/domain/repositories/round.repository";
import type { ITournamentRepository } from "@/domain/repositories/tournament.repository";
import type { IDrawnPairRepository } from "@/domain/repositories/pair.repository";
import type { IPlayerRepository } from "@/domain/repositories/player.repository";
import type { IMatchHistoryRepository } from "@/domain/repositories/match.repository";
import type { PozoRound } from "@/domain/entities/round";
import type { PozoRoundPair } from "@/domain/entities/match";
import type { CourtResultInput } from "../dto/round.dto";
import type { Result } from "@/domain/result";
import { err } from "@/domain/result";
import { calculatePairMovements } from "@/domain/algorithms/movements";

export class RoundService {
  constructor(
    private pozoRoundRepo: IPozoRoundRepository,
    private tournamentRepo: ITournamentRepository,
    private drawnPairRepo: IDrawnPairRepository,
    private playerRepo: IPlayerRepository,
    private matchHistoryRepo: IMatchHistoryRepository,
  ) {}

  async getRounds(tournamentId: string): Promise<Result<PozoRound[]>> {
    return this.pozoRoundRepo.findByTournament(tournamentId);
  }

  async getActiveRound(tournamentId: string): Promise<Result<PozoRound | null>> {
    return this.pozoRoundRepo.findActiveByTournament(tournamentId);
  }

  async getRoundPairs(roundId: string): Promise<Result<PozoRoundPair[]>> {
    return this.pozoRoundRepo.findRoundPairs(roundId);
  }

  async saveCourtResult(
    roundId: string,
    courtNumber: number,
    results: CourtResultInput[],
    winnerDrawnPairId: string,
    userUuid: string,
  ): Promise<Result<void>> {
    const round = await this.pozoRoundRepo.findById(roundId);
    if (!round.ok) return round;
    if (!round.data) return err("Ronda no encontrada");

    const rows = await this.pozoRoundRepo.findCourtPairs(roundId, courtNumber);
    if (!rows.ok) return rows;
    if (rows.data.length === 0) return err("Pista no encontrada");

    const scoreMap: Record<string, number> = {};
    for (const r of results) scoreMap[r.drawnPairId] = r.score;

    for (const row of rows.data) {
      const score = scoreMap[row.drawn_pair_id] ?? 0;
      const res = await this.pozoRoundRepo.updatePairResult({
        pairId: row.id,
        winner_drawn_pair_id: winnerDrawnPairId,
        score_a: score,
      });
      if (!res.ok) return res;
    }

    // Record match history
    const historyRes = await this.recordMatchHistory(
      round.data.tournament_id,
      round.data.id,
      round.data.round_number,
      courtNumber,
      rows.data.map((r) => r.drawn_pair_id),
      winnerDrawnPairId,
      scoreMap,
      userUuid,
    );
    if (!historyRes.ok) return historyRes;

    return { ok: true, data: undefined };
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
  ): Promise<Result<void>> {
    const allPairs = await this.drawnPairRepo.findAll(userUuid);
    if (!allPairs.ok) return allPairs;

    const winnerPair = allPairs.data.find((p) => p.id === winnerDrawnPairId);
    const loserPair = allPairs.data.find(
      (p) => drawnPairIds.includes(p.id) && p.id !== winnerDrawnPairId,
    );

    if (!winnerPair || !loserPair) return { ok: true, data: undefined };

    const playerIds = [
      winnerPair.player1_id,
      winnerPair.player2_id,
      loserPair.player1_id,
      loserPair.player2_id,
    ];

    const profiles = await this.playerRepo.findAll(userUuid);
    if (!profiles.ok) return profiles;
    const profileById = new Map(profiles.data.map((p) => [p.id, p] as const));

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

    return this.matchHistoryRepo.upsert({
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
    userUuid: string,
  ): Promise<Result<{ nextRoundNumber?: number }>> {
    const round = await this.pozoRoundRepo.findById(roundId);
    if (!round.ok) return round;
    if (!round.data || round.data.status === "finished") {
      return { ok: true, data: {} };
    }

    const pairs = await this.pozoRoundRepo.findRoundPairs(roundId);
    if (!pairs.ok) return pairs;
    if (pairs.data.length === 0) return { ok: true, data: {} };

    const courts = Array.from(new Set(pairs.data.map((p) => p.court_number)));
    for (const court of courts) {
      const courtPairs = pairs.data.filter((p) => p.court_number === court);
      if (courtPairs.length < 2) return { ok: true, data: {} };
      if (!courtPairs.every((p) => p.is_finished)) return { ok: true, data: {} };
    }

    const tournament = await this.tournamentRepo.findById(tournamentId, userUuid);
    if (!tournament.ok) return tournament;
    if (!tournament.data) return err("Torneo no encontrado");

    const results = courts.map((court) => {
      const courtPairs = pairs.data.filter((p) => p.court_number === court);
      const winnerPair = courtPairs.find((p) => p.winner_drawn_pair_id === p.drawn_pair_id);
      const loserPair = courtPairs.find((p) => p !== winnerPair) ?? null;
      return {
        court_number: court,
        winner_drawn_pair_id: winnerPair?.drawn_pair_id ?? "",
        loser_drawn_pair_id: loserPair?.drawn_pair_id ?? "",
      };
    });

    const movements = calculatePairMovements(results, tournament.data.number_of_courts);
    const nextAssignments = movements.map((m) => ({
      drawnPairId: m.drawn_pair_id,
      court: m.court_number,
    }));

    const nextRound = await this.pozoRoundRepo.createRound({
      tournament_id: tournamentId,
      round_number: round.data.round_number + 1,
    });
    if (!nextRound.ok) return nextRound;

    const inserted = await this.pozoRoundRepo.insertRoundPairs(
      nextAssignments.map((a) => ({
        round_id: nextRound.data.id,
        drawn_pair_id: a.drawnPairId,
        court_number: a.court,
      }))
    );
    if (!inserted.ok) {
      await this.pozoRoundRepo.deleteRound(nextRound.data.id);
      return inserted;
    }

    const statusRes = await this.pozoRoundRepo.updateStatus(roundId, "finished");
    if (!statusRes.ok) return statusRes;

    return { ok: true, data: { nextRoundNumber: nextRound.data.round_number } };
  }

  async finalizePozo(tournamentId: string, userUuid: string): Promise<Result<void>> {
    const rounds = await this.pozoRoundRepo.findByTournament(tournamentId);
    if (!rounds.ok) return rounds;

    if (rounds.data.length === 0) {
      return err("No hay rondas para finalizar");
    }

    // El campeón es quien gana la pista rey (1) en la última ronda jugada.
    // findByTournament ordena por round_number ascendente; recorremos de la
    // más reciente hacia atrás hasta encontrar una con ganador definido en la
    // pista rey (descarta la posible nueva ronda aún sin resultado).
    let champion: string | null = null;
    for (let i = rounds.data.length - 1; i >= 0; i--) {
      const court1Pairs = await this.pozoRoundRepo.findCourtPairs(rounds.data[i].id, 1);
      if (!court1Pairs.ok) return court1Pairs;
      if (court1Pairs.data.length < 2) continue;
      const winner = court1Pairs.data.find(
        (p) => p.winner_drawn_pair_id === p.drawn_pair_id && p.is_finished,
      );
      if (winner) {
        champion = winner.drawn_pair_id;
        break;
      }
    }

    if (!champion) {
      return err("La pista 1 todavía no tiene un ganador definido");
    }

    return this.tournamentRepo.updateChampion(tournamentId, userUuid, champion);
  }
}