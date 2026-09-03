import type { IMatchHistoryRepository } from "@/domain/repositories/match.repository";
import type { MatchHistoryRow } from "@/domain/entities/match";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ok } from "@/domain/result";
import { safeErr } from "@/application/errors";
import type { Database } from "../database.types";

export class SupabaseMatchHistoryAdapter implements IMatchHistoryRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  async upsert(data: {
    tournament_id: string | null;
    round_id: string | null;
    round_number: number | null;
    court_number: number;
    winner_player1_id: string;
    winner_player2_id: string;
    loser_player1_id: string;
    loser_player2_id: string;
    winner_drawn_pair_id: string;
    loser_drawn_pair_id: string;
    playerData: Map<
      string,
      {
        name: string | null;
        gender: string | null;
        hand: string | null;
        level: number | null;
      }
    >;
    score_winner: number | null;
    score_loser: number | null;
    user_uuid: string;
  }) {
    const d = (id: string) => {
      const p = data.playerData.get(id);
      return {
        name: p?.name ?? null,
        gender: p?.gender ?? null,
        hand: p?.hand ?? null,
        level: p?.level != null ? Number(p.level) : null,
      };
    };

    const w1 = d(data.winner_player1_id);
    const w2 = d(data.winner_player2_id);
    const l1 = d(data.loser_player1_id);
    const l2 = d(data.loser_player2_id);

    const { error } = await this.supabase.from("pozo_match_history").upsert(
      {
        tournament_id: data.tournament_id,
        round_id: data.round_id,
        round_number: data.round_number,
        court_number: data.court_number,
        user_uuid: data.user_uuid,
        winner_player1_id: data.winner_player1_id,
        winner_player2_id: data.winner_player2_id,
        loser_player1_id: data.loser_player1_id,
        loser_player2_id: data.loser_player2_id,
        winner_player1_name: w1.name,
        winner_player1_gender: w1.gender,
        winner_player1_hand: w1.hand,
        winner_player1_level: w1.level,
        winner_player2_name: w2.name,
        winner_player2_gender: w2.gender,
        winner_player2_hand: w2.hand,
        winner_player2_level: w2.level,
        loser_player1_name: l1.name,
        loser_player1_gender: l1.gender,
        loser_player1_hand: l1.hand,
        loser_player1_level: l1.level,
        loser_player2_name: l2.name,
        loser_player2_gender: l2.gender,
        loser_player2_hand: l2.hand,
        loser_player2_level: l2.level,
        winner_drawn_pair_id: data.winner_drawn_pair_id,
        loser_drawn_pair_id: data.loser_drawn_pair_id,
        score_winner: data.score_winner,
        score_loser: data.score_loser,
      },
      { onConflict: "tournament_id,round_id,court_number" },
    );
    if (error) return safeErr(error);
    return ok(undefined);
  }

  async findAll(userUuid: string) {
    const { data } = await this.supabase
      .from("pozo_match_history")
      .select("*")
      .eq("user_uuid", userUuid)
      .order("created_at", { ascending: false });
    return ok((data ?? []) as MatchHistoryRow[]);
  }

  async findByTournament(tournamentId: string, userUuid: string) {
    const { data } = await this.supabase
      .from("pozo_match_history")
      .select("*")
      .eq("tournament_id", tournamentId)
      .eq("user_uuid", userUuid);
    return ok((data ?? []) as MatchHistoryRow[]);
  }

  async findWinningPartnerships(
    userUuid: string,
    minMatches = 2,
    minWinRate = 0.7,
  ) {
    const { data: history } = await this.supabase
      .from("pozo_match_history")
      .select(
        "winner_player1_id, winner_player2_id, loser_player1_id, loser_player2_id",
      )
      .eq("user_uuid", userUuid);
    if (!history || history.length === 0) return ok([]);

    const key = (a: string, b: string) => [a, b].sort().join("|");
    const wins = new Map<string, number>();
    const totals = new Map<string, number>();

    const bump = (ids: [string, string], win: boolean) => {
      const k = key(ids[0], ids[1]);
      totals.set(k, (totals.get(k) ?? 0) + 1);
      if (win) wins.set(k, (wins.get(k) ?? 0) + 1);
    };

    for (const m of history) {
      bump([m.winner_player1_id, m.winner_player2_id], true);
      bump([m.loser_player1_id, m.loser_player2_id], false);
    }

    const result: { a: string; b: string; wins: number; total: number; winRate: number }[] = [];
    for (const [k, total] of totals) {
      if (total < minMatches) continue;
      const w = wins.get(k) ?? 0;
      const winRate = w / total;
      if (winRate >= minWinRate) {
        const [a, b] = k.split("|");
        result.push({ a, b, wins: w, total, winRate });
      }
    }
    return ok(result);
  }
}