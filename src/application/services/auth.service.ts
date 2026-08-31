import type { IAuthRepository } from "@/domain/repositories/auth.repository";

export class AuthService {
  constructor(private authRepo: IAuthRepository) {}

  async getUser(): Promise<{ id: string } | null> {
    return this.authRepo.getUser();
  }

  async signInWithOtp(email: string, redirectTo: string): Promise<{ error?: string }> {
    return this.authRepo.signInWithOtp(email, redirectTo);
  }

  async signInWithOAuth(
    provider: "google",
    redirectTo: string
  ): Promise<{ url?: string; error?: string }> {
    return this.authRepo.signInWithOAuth(provider, redirectTo);
  }

  async signOut(): Promise<void> {
    return this.authRepo.signOut();
  }
}
