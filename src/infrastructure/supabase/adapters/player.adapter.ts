import type { IPlayerRepository } from "@/domain/repositories/player.repository";
import type { Player, PlayerProfile } from "@/domain/entities/player";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ok } from "@/domain/result";
import { safeErr } from "@/application/errors";
import type { Database } from "../database.types";

export class SupabasePlayerAdapter implements IPlayerRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  async findAll(userUuid: string) {
    const { data } = await this.supabase
      .from("profiles")
      .select("*")
      .eq("user_uuid", userUuid)
      .order("full_name");
    return ok((data ?? []) as Player[]);
  }

  async findProfiles(userUuid: string) {
    const { data } = await this.supabase
      .from("profiles")
      .select("id, full_name, level, gender, dominant_hand")
      .eq("user_uuid", userUuid);
    return ok((data ?? []) as PlayerProfile[]);
  }

  async findById(id: string) {
    const { data } = await this.supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();
    return ok((data as Player | null) ?? null);
  }

  async create(data: {
    id?: string;
    full_name: string;
    gender: string;
    dominant_hand: string;
    level: number;
    user_uuid: string;
  }) {
    const { error } = await this.supabase.from("profiles").insert(data);
    if (error) return safeErr(error);
    return ok(undefined);
  }

  async update(
    id: string,
    data: { full_name: string; gender: string; dominant_hand: string; level: number },
    userUuid: string
  ) {
    const { error } = await this.supabase
      .from("profiles")
      .update(data)
      .eq("id", id)
      .eq("user_uuid", userUuid);
    if (error) return safeErr(error);
    return ok(undefined);
  }

  async delete(id: string, userUuid: string) {
    const { error } = await this.supabase
      .from("profiles")
      .delete()
      .eq("id", id)
      .eq("user_uuid", userUuid);
    if (error) return safeErr(error);
    return ok(undefined);
  }

  async deleteAll(userUuid: string) {
    const { error } = await this.supabase
      .from("profiles")
      .delete()
      .eq("user_uuid", userUuid);
    if (error) return safeErr(error);
    return ok(undefined);
  }

  async exists(id: string) {
    const { data } = await this.supabase
      .from("profiles")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    return ok(!!data);
  }
}