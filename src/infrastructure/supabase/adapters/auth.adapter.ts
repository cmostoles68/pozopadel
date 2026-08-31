import type { IAuthRepository } from "@/domain/repositories/auth.repository";
import type { SupabaseClient } from "@supabase/supabase-js";

type Database = any;

export class SupabaseAuthAdapter implements IAuthRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  async getUser(): Promise<{ id: string } | null> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) return null;
    return { id: user.id };
  }

  async signInWithOtp(
    email: string,
    redirectTo: string
  ): Promise<{ error?: string }> {
    const { error } = await this.supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) return { error: error.message };
    return {};
  }

  async signInWithOAuth(
    provider: "google",
    redirectTo: string
  ): Promise<{ url?: string; error?: string }> {
    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
    if (error) return { error: error.message };
    return { url: data.url };
  }

  async signOut(): Promise<void> {
    await this.supabase.auth.signOut();
  }
}
