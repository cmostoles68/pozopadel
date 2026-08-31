"use server";

import { redirect } from "next/navigation";
import { createServices } from "@/infrastructure/service-factory";

export async function signInWithMagicLink(formData: FormData) {
  const { authService } = await createServices();
  const email = formData.get("email") as string;
  const redirectTo = `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(":54321", ":3000")}/dashboard`;

  const result = await authService.signInWithOtp(email, redirectTo);

  if (result.error) {
    redirect("/auth/login?error=" + encodeURIComponent(result.error));
  }

  redirect("/auth/login?sent=true");
}

export async function signInWithGoogle() {
  const { authService } = await createServices();
  const redirectTo = `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(":54321", ":3000")}/auth/callback`;

  const result = await authService.signInWithOAuth("google", redirectTo);

  if (result.error) {
    redirect("/auth/login?error=" + encodeURIComponent(result.error));
  }

  if (result.url) {
    redirect(result.url);
  }
}

export async function signOut() {
  const { authService } = await createServices();
  await authService.signOut();
  redirect("/auth/login");
}
