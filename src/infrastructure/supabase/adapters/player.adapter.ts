import type { IPlayerRepository } from "@/domain/repositories/player.repository";
import type { Player, PlayerProfile } from "@/domain/entities/player";
import type { SupabaseClient } from "@supabase/supabase-js";

type Database = any;

export class SupabasePlayerAdapter implements IPlayerRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  async findAll(userUuid: string): Promise<Player[]> {
    const { data } = await this.supabase
      .from("profiles")
      .select("*")
      .eq("user_uuid", userUuid)
      .order("full_name");
    return (data ?? []) as Player[];
  }

  async findProfiles(userUuid: string): Promise<PlayerProfile[]> {
    const { data } = await this.supabase
      .from("profiles")
      .select("id, full_name, level, gender, dominant_hand")
      .eq("user_uuid", userUuid);
    return (data ?? []) as PlayerProfile[];
  }

  async findById(id: string): Promise<Player | null> {
    const { data } = await this.supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();
    return (data as Player) ?? null;
  }

  async create(data: {
    id?: string;
    full_name: string;
    gender: string;
    dominant_hand: string;
    level: number;
    user_uuid: string;
  }): Promise<void> {
    const { error } = await this.supabase.from("profiles").insert(data);
    if (error) throw new Error(error.message);
  }

  async update(
    id: string,
    data: { full_name: string; gender: string; dominant_hand: string; level: number },
    userUuid: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from("profiles")
      .update(data)
      .eq("id", id)
      .eq("user_uuid", userUuid);
    if (error) throw new Error(error.message);
  }

  async delete(id: string, userUuid: string): Promise<void> {
    const { error } = await this.supabase
      .from("profiles")
      .delete()
      .eq("id", id)
      .eq("user_uuid", userUuid);
    if (error) throw new Error(error.message);
  }

  async deleteAll(userUuid: string): Promise<void> {
    const { error } = await this.supabase
      .from("profiles")
      .delete()
      .eq("user_uuid", userUuid);
    if (error) throw new Error(error.message);
  }

  async exists(id: string): Promise<boolean> {
    const { data } = await this.supabase
      .from("profiles")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    return !!data;
  }
}
