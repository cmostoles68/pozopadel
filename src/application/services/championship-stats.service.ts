import type { ITournamentRepository } from "@/domain/repositories/tournament.repository";
import type { IDrawnPairRepository } from "@/domain/repositories/pair.repository";
import type { IMatchHistoryRepository } from "@/domain/repositories/match.repository";
import type { Tournament } from "@/domain/entities/tournament";
import type { MatchHistoryRow } from "@/domain/entities/match";
import type { Result } from "@/domain/result";
import { ok } from "@/domain/result";
import { countChampionshipsByPairIds } from "@/domain/stats/championships";

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

  /** Campeones por jugador a partir del histórico de partidos y de los pares sorteados. */
  async countByDrawnPairs(
    userUuid: string,
  ): Promise<Result<Record<string, number>>> {
    const [tournamentsRes, historyRes] = await Promise.all([
      this.tournamentRepo.findAll(userUuid),
      this.matchHistoryRepo.findAll(userUuid),
    ]);
    if (!tournamentsRes.ok) return tournamentsRes;

    const championIds = tournamentsRes.data
      .map((t) => t.champion_drawn_pair_id)
      .filter((id): id is string => Boolean(id));

    const pairsRes = await this.drawnPairRepo.findByIdsWithProfiles(
      userUuid,
      championIds,
    );
    if (!pairsRes.ok) return pairsRes;

    const pairMembersById = new Map<string, [string, string]>();
    for (const p of pairsRes.data) {
      pairMembersById.set(p.id, [p.player1_id, p.player2_id]);
    }

    const championPairs: [string, string][] = [];
    for (const t of tournamentsRes.data) {
      const members = historyRes.ok
        ? this.findChampionMembers(historyRes.data, t)
        : undefined;
      if (members) {
        championPairs.push(members);
        continue;
      }
      if (t.champion_drawn_pair_id) {
        const pairMembers = pairMembersById.get(t.champion_drawn_pair_id);
        if (pairMembers) championPairs.push(pairMembers);
      }
    }

    return ok(countChampionshipsByPairIds(championPairs));
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
      const row = this.findChampionRow(historyRes.data, t);
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

  /**
   * Fila de histórico del torneo. Primero empareja por `tournament_id` (sobrevive
   * aunque las parejas se borren y `champion_drawn_pair_id` quede a null); como
   * fallback usa la pareja ganadora coincidente.
   */
  private findChampionRow(
    history: MatchHistoryRow[],
    tournament: Tournament,
  ): MatchHistoryRow | undefined {
    return (
      history.find((h) => h.tournament_id === tournament.id) ??
      (tournament.champion_drawn_pair_id
        ? history.find(
            (h) => h.winner_drawn_pair_id === tournament.champion_drawn_pair_id,
          )
        : undefined)
    );
  }

  private findChampionMembers(
    history: MatchHistoryRow[],
    tournament: Tournament,
  ): [string, string] | undefined {
    const row = this.findChampionRow(history, tournament);
    return row ? [row.winner_player1_id, row.winner_player2_id] : undefined;
  }
}
