import type { ITournamentRepository } from "@/domain/repositories/tournament.repository";
import type { IDrawnPairRepository } from "@/domain/repositories/pair.repository";
import type { IMatchHistoryRepository } from "@/domain/repositories/match.repository";
import type { Result } from "@/domain/result";
import { ok } from "@/domain/result";
import {
  countChampionshipsByDrawnPairIds,
  countChampionshipsByPairIds,
} from "@/domain/stats/championships";

export interface HistoryChampionPlayer {
  id: string;
  name: string | null;
}

export interface HistoryChampionPair {
  player1: HistoryChampionPlayer;
  player2: HistoryChampionPlayer;
}

export interface HistoryChampionshipStats {
  /** Conteo de campeonatos por jugador (ids crudos del histórico). */
  counts: Record<string, number>;
  /** Pareja campeona resuelta por torneo (null si no aplica). */
  championsByTournament: Map<string, HistoryChampionPair | null>;
}

/**
 * Agregaciones de "campeones" de los pozos completados. Encapsula los dos
 * orígenes (torneos + pares sorteados, e histórico de partidos) para que la
 * presentación consuma el resultado ya calculado.
 */
export class ChampionshipStatsService {
  constructor(
    private tournamentRepo: ITournamentRepository,
    private drawnPairRepo: IDrawnPairRepository,
    private matchHistoryRepo: IMatchHistoryRepository,
  ) {}

  /** Campeones por jugador a partir de los pares sorteados de los torneos. */
  async countByDrawnPairs(
    userUuid: string,
  ): Promise<Result<Record<string, number>>> {
    const [tournamentsRes, pairsRes] = await Promise.all([
      this.tournamentRepo.findAll(userUuid),
      this.drawnPairRepo.findAllWithProfiles(userUuid),
    ]);
    if (!tournamentsRes.ok) return tournamentsRes;
    if (!pairsRes.ok) return pairsRes;

    const pairMembersById = new Map<string, [string, string]>();
    for (const p of pairsRes.data) {
      pairMembersById.set(p.id, [p.player1_id, p.player2_id]);
    }

    return ok(
      countChampionshipsByDrawnPairIds(
        tournamentsRes.data.map((t) => t.champion_drawn_pair_id),
        pairMembersById,
      ),
    );
  }

  /** Campeones por torneo y conteos desde el histórico de partidos. */
  async countByHistory(
    userUuid: string,
  ): Promise<Result<HistoryChampionshipStats>> {
    const [historyRes, tournamentsRes] = await Promise.all([
      this.matchHistoryRepo.findAll(userUuid),
      this.tournamentRepo.findAll(userUuid),
    ]);
    if (!historyRes.ok) return historyRes;
    if (!tournamentsRes.ok) return tournamentsRes;

    const championsByTournament = new Map<string, HistoryChampionPair | null>();
    const championPairs: [string, string][] = [];

    for (const t of tournamentsRes.data) {
      if (!t.champion_drawn_pair_id) {
        championsByTournament.set(t.id, null);
        continue;
      }
      const row = historyRes.data.find(
        (h) => h.winner_drawn_pair_id === t.champion_drawn_pair_id,
      );
      if (!row) {
        championsByTournament.set(t.id, null);
        continue;
      }
      const champion: HistoryChampionPair = {
        player1: {
          id: row.winner_player1_id,
          name: row.winner_player1_name,
        },
        player2: {
          id: row.winner_player2_id,
          name: row.winner_player2_name,
        },
      };
      championsByTournament.set(t.id, champion);
      championPairs.push([champion.player1.id, champion.player2.id]);
    }

    return ok({
      counts: countChampionshipsByPairIds(championPairs),
      championsByTournament,
    });
  }
}
