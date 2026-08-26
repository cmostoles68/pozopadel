"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function signInWithMagicLink(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(":54321", ":3000")}/dashboard`,
    },
  });

  if (error) {
    redirect("/auth/login?error=" + encodeURIComponent(error.message));
  }

  redirect("/auth/login?sent=true");
}

export async function signInWithGoogle() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(":54321", ":3000")}/auth/callback`,
    },
  });

  if (error) {
    redirect("/auth/login?error=" + encodeURIComponent(error.message));
  }

  if (data.url) {
    redirect(data.url);
  }
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}
