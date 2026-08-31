import type { IPlayerRepository } from "@/domain/repositories/player.repository";
import type { Player, PlayerProfile } from "@/domain/entities/player";
import type { SupabaseClient } from "@supabase/supabase-js";

type Database = any;

export class SupabasePlayerAdapter implements IPlayerRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  async findAll(): Promise<Player[]> {
    const { data } = await this.supabase
      .from("profiles")
      .select("*")
      .order("full_name");
    return (data ?? []) as Player[];
  }

  async findProfiles(): Promise<PlayerProfile[]> {
    const { data } = await this.supabase
      .from("profiles")
      .select("id, full_name, level, gender, dominant_hand");
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
  }): Promise<void> {
    const { error } = await this.supabase.from("profiles").insert(data);
    if (error) throw new Error(error.message);
  }

  async update(
    id: string,
    data: { full_name: string; gender: string; dominant_hand: string; level: number }
  ): Promise<void> {
    const { error } = await this.supabase
      .from("profiles")
      .update(data)
      .eq("id", id);
    if (error) throw new Error(error.message);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("profiles")
      .delete()
      .eq("id", id);
    if (error) throw new Error(error.message);
  }

  async deleteAll(): Promise<void> {
    const { error } = await this.supabase
      .from("profiles")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
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
