import type { ITournamentRepository } from "@/domain/repositories/tournament.repository";
import type { ILegacyRoundRepository } from "@/domain/repositories/round.repository";
import type { ILegacyMatchRepository } from "@/domain/repositories/match.repository";
import type { Tournament, TournamentPlayer } from "@/domain/entities/tournament";
import type { LegacyRound } from "@/domain/entities/round";
import type { LegacyMatch, RoundResult } from "@/domain/entities/match";
import type { CreateTournamentInput } from "../dto/tournament.dto";
import { generateRound1, generateNextRound, calculateMovements } from "@/domain/algorithms/legacy-round-engine";
import type { PlayerRow } from "@/domain/entities/player";

export class TournamentService {
  constructor(
    private tournamentRepo: ITournamentRepository,
    private legacyRoundRepo: ILegacyRoundRepository,
    private legacyMatchRepo: ILegacyMatchRepository,
    private getPlayerRowsForTournament: (
      tournamentPlayers: TournamentPlayer[]
    ) => Promise<PlayerRow[]>,
  ) {}

  async getById(id: string): Promise<Tournament | null> {
    return this.tournamentRepo.findById(id);
  }

  async getAll(): Promise<Tournament[]> {
    return this.tournamentRepo.findAll();
  }

  async create(input: CreateTournamentInput): Promise<Tournament> {
    return this.tournamentRepo.create({
      title: input.title,
      number_of_courts: input.numberOfCourts,
      minutes_per_round: input.minutesPerRound,
    });
  }

  async delete(id: string): Promise<void> {
    await this.tournamentRepo.delete(id);
  }

  async join(tournamentId: string, playerId?: string): Promise<void> {
    await this.tournamentRepo.joinTournament(tournamentId, playerId);
  }

  async getTournamentPlayers(tournamentId: string): Promise<TournamentPlayer[]> {
    return this.tournamentRepo.getTournamentPlayers(tournamentId);
  }

  async getLegacyRounds(tournamentId: string): Promise<LegacyRound[]> {
    return this.legacyRoundRepo.findByTournament(tournamentId);
  }

  async getCurrentLegacyRoundWithMatches(
    tournamentId: string
  ): Promise<{ round: LegacyRound; matches: LegacyMatch[] } | null> {
    return this.legacyRoundRepo.findCurrentRoundWithMatches(tournamentId);
  }

  async updateMatchScore(
    matchId: string,
    scoreA: number,
    scoreB: number
  ): Promise<void> {
    await this.legacyMatchRepo.updateScore(matchId, scoreA, scoreB);
  }

  async startRound1(
    tournamentId: string,
    method: "level" | "random" = "level"
  ): Promise<void> {
    const tournament = await this.tournamentRepo.findById(tournamentId);
    if (!tournament) throw new Error("Tournament not found");

    const tournamentPlayers = await this.tournamentRepo.getTournamentPlayers(tournamentId);
    const playerRows = await this.getPlayerRowsForTournament(tournamentPlayers);

    const matches = generateRound1(playerRows, tournament.number_of_courts, method);

    const round = await this.legacyRoundRepo.createRound({
      tournament_id: tournamentId,
      round_number: 1,
      status: "in_progress",
      start_time: new Date().toISOString(),
    });

    const matchInserts = matches
      .filter((m) => m.team_a.player1_id && m.team_b.player1_id)
      .map((m) => ({
        round_id: round.id,
        court_number: m.court_number,
        player1_id: m.team_a.player1_id,
        player2_id: m.team_a.player2_id,
        player3_id: m.team_b.player1_id,
        player4_id: m.team_b.player2_id,
      }));

    if (matchInserts.length > 0) {
      await this.legacyMatchRepo.insertMatches(matchInserts);
    }

    await this.tournamentRepo.updateStatus(tournamentId, "in_progress");
  }

  async finishRoundAndStartNext(
    tournamentId: string,
    finishedRoundId: string,
    roundResults: RoundResult[],
  ): Promise<void> {
    const tournament = await this.tournamentRepo.findById(tournamentId);
    if (!tournament) throw new Error("Tournament not found");

    const movements = calculateMovements(roundResults, tournament.number_of_courts);

    for (const m of movements) {
      await this.tournamentRepo.updatePlayerCourt(tournamentId, m.player_id, m.current_court);
    }

    const currentRound = await this.legacyRoundRepo.findById(finishedRoundId);
    const nextRoundNumber = (currentRound?.round_number ?? 0) + 1;

    const nextRound = await this.legacyRoundRepo.createRound({
      tournament_id: tournamentId,
      round_number: nextRoundNumber,
      status: "in_progress",
    });

    const currentPlayers = await this.tournamentRepo.getAllPlayersCourts(tournamentId);

    const playerRows: PlayerRow[] = currentPlayers.map((p) => ({
      player_id: p.player_id,
      level: 0,
      current_court: p.current_court,
      total_points: 0,
    }));

    const matches = generateNextRound(playerRows, roundResults, tournament.number_of_courts);

    const matchInserts = matches
      .filter((m) => m.team_a.player1_id && m.team_b.player1_id)
      .map((m) => ({
        round_id: nextRound.id,
        court_number: m.court_number,
        player1_id: m.team_a.player1_id,
        player2_id: m.team_a.player2_id,
        player3_id: m.team_b.player1_id,
        player4_id: m.team_b.player2_id,
      }));

    if (matchInserts.length > 0) {
      await this.legacyMatchRepo.insertMatches(matchInserts);
    }

    if (finishedRoundId) {
      await this.legacyRoundRepo.updateStatus(finishedRoundId, "finished");
    }
  }

  async finalizeLegacyTournament(tournamentId: string): Promise<void> {
    await this.tournamentRepo.updateStatus(tournamentId, "completed");
  }
}
