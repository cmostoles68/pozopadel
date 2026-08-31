export interface IAuthRepository {
  getUser(): Promise<{ id: string } | null>;
  signInWithOtp(email: string, redirectTo: string): Promise<{ error?: string }>;
  signInWithOAuth(
    provider: "google",
    redirectTo: string
  ): Promise<{ url?: string; error?: string }>;
  signOut(): Promise<void>;
}
