import type {
  IDrawnPairRepository,
  ITournamentDrawnPairRepository,
} from "@/domain/repositories/pair.repository";
import type { DrawnPair, TournamentDrawnPair, DrawMethod } from "@/domain/entities/pair";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ok, err } from "@/domain/result";

type Database = any;


export class SupabaseDrawnPairAdapter implements IDrawnPairRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  async findAll(userUuid: string) {
    const { data } = await this.supabase
      .from("drawn_pairs")
      .select("*")
      .eq("user_uuid", userUuid)
      .order("pair_number");
    return ok((data ?? []) as DrawnPair[]);
  }

  async findAllWithProfiles(userUuid: string) {
    const pairs = await this.findAll(userUuid);
    if (!pairs.ok) return pairs;
    if (pairs.data.length === 0) return ok([]);

    const playerIds = Array.from(
      new Set(pairs.data.flatMap((p) => [p.player1_id, p.player2_id]))
    );

    const { data: profiles } = await this.supabase
      .from("profiles")
      .select("id, full_name, level, dominant_hand")
      .in("id", playerIds)
      .eq("user_uuid", userUuid);

    const profileMap = new Map(
      ((profiles ?? []) as any[]).map((p) => [p.id, p])
    );

    return ok(
      pairs.data.map((p) => {
        const p1 = profileMap.get(p.player1_id);
        const p2 = profileMap.get(p.player2_id);
        const avg = p1?.level && p2?.level ? (p1.level + p2.level) / 2 : 0;
        const isLefty =
          p1?.dominant_hand === "LEFT" || p2?.dominant_hand === "LEFT";
        return {
          id: p.id,
          pair_number: p.pair_number,
          draw_method: p.draw_method,
          player1_id: p.player1_id,
          player2_id: p.player2_id,
          player1_name: p1?.full_name ?? "Jugador",
          player2_name: p2?.full_name ?? "Jugador",
          player1_hand: p1?.dominant_hand ?? null,
          player2_hand: p2?.dominant_hand ?? null,
          player1_level: p1?.level ?? null,
          player2_level: p2?.level ?? null,
          avg_level: avg,
          is_lefty: isLefty,
        };
      })
    );
  }

  async deleteAll(userUuid: string) {
    const { error } = await this.supabase
      .from("drawn_pairs")
      .delete()
      .eq("user_uuid", userUuid);
    if (error) return err(error.message);
    return ok(undefined);
  }

  async insert(
    pairs: {
      pair_number: number;
      player1_id: string;
      player2_id: string;
      draw_method: DrawMethod;
    }[],
    userUuid: string
  ) {
    const { data, error } = await this.supabase
      .from("drawn_pairs")
      .insert(pairs.map((p) => ({ ...p, user_uuid: userUuid })))
      .select("*");
    if (error) return err(error.message);
    return ok((data ?? []) as DrawnPair[]);
  }
}

export class SupabaseTournamentDrawnPairAdapter implements ITournamentDrawnPairRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  async findByTournament(tournamentId: string) {
    const { data } = await this.supabase
      .from("tournament_drawn_pairs")
      .select("*")
      .eq("tournament_id", tournamentId);
    return ok((data ?? []) as TournamentDrawnPair[]);
  }

  async selectPair(tournamentId: string, drawnPairId: string) {
    const { error } = await this.supabase.from("tournament_drawn_pairs").insert({
      tournament_id: tournamentId,
      drawn_pair_id: drawnPairId,
    });
    if (error) return err(error.message);
    return ok(undefined);
  }

  async deselectPair(tournamentId: string, drawnPairId: string) {
    const { error } = await this.supabase
      .from("tournament_drawn_pairs")
      .delete()
      .eq("tournament_id", tournamentId)
      .eq("drawn_pair_id", drawnPairId);
    if (error) return err(error.message);
    return ok(undefined);
  }

  async selectAllPairs(
    tournamentId: string,
    allPairIds: string[]
  ) {
    const { data: selected } = await this.supabase
      .from("tournament_drawn_pairs")
      .select("drawn_pair_id")
      .eq("tournament_id", tournamentId);
    const selectedIds = new Set((selected ?? []).map((s) => s.drawn_pair_id));
    const toInsert = allPairIds.filter((id) => !selectedIds.has(id));

    if (toInsert.length === 0) return ok(undefined);

    const { error } = await this.supabase
      .from("tournament_drawn_pairs")
      .insert(toInsert.map((id) => ({ tournament_id: tournamentId, drawn_pair_id: id })));
    if (error) return err(error.message);
    return ok(undefined);
  }

  async updateCourtNumber(id: string, courtNumber: number) {
    const { error } = await this.supabase
      .from("tournament_drawn_pairs")
      .update({ court_number: courtNumber })
      .eq("id", id);
    if (error) return err(error.message);
    return ok(undefined);
  }

  async clearCourtNumbers(tournamentId: string) {
    const { error } = await this.supabase
      .from("tournament_drawn_pairs")
      .update({ court_number: null })
      .eq("tournament_id", tournamentId)
      .not("court_number", "is", null);
    if (error) return err(error.message);
    return ok(undefined);
  }

  async getSelectedWithCourt(tournamentId: string) {
    const { data } = await this.supabase
      .from("tournament_drawn_pairs")
      .select("id, drawn_pair_id, court_number")
      .eq("tournament_id", tournamentId)
      .not("court_number", "is", null);
    return ok((data ?? []) as TournamentDrawnPair[]);
  }
}