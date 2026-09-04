"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { loginAsGuest, loginAsAdmin } = useAuth();

  const [selected, setSelected] = useState<"guest" | "admin" | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function enterGuest() {
    setSelected("guest");
    await loginAsGuest();
    router.push("/dashboard");
  }

  async function confirmAdmin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const ok = await loginAsAdmin(password);
    if (ok) {
      router.push("/dashboard");
    } else {
      setError("Contraseña incorrecta.");
      setPassword("");
    }
  }

  return (
    <div className="min-h-screen bg-background pattern-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md glass-panel rounded-3xl p-8 space-y-8">
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold text-on-surface">
            PadelElite
          </h1>
          <p className="text-on-surface-variant mt-2">
            Elige cómo quieres entrar
          </p>
        </div>

        {selected === null ? (
          <div className="space-y-4">
            <button
              onClick={enterGuest}
              className="w-full bg-primary text-on-primary py-4 rounded-2xl font-medium hover:bg-white transition-colors"
            >
              <span className="block text-lg">Entrar como Invitado</span>
              <span className="text-sm text-on-primary/70">
                Funcionalidad completa con límites de uso
              </span>
            </button>

            <button
              onClick={() => setSelected("admin")}
              className="w-full border border-outline-variant bg-surface-highest text-on-surface py-4 rounded-2xl font-medium hover:bg-surface-high transition-colors"
            >
              <span className="block text-lg">Entrar como Admin</span>
              <span className="block text-sm text-on-surface-variant">
                Requiere contraseña
              </span>
            </button>
          </div>
        ) : selected === "admin" ? (
          <form onSubmit={confirmAdmin} className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-on-surface mb-1"
              >
                Contraseña de administrador
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                placeholder="••••"
                className="w-full px-4 py-3 bg-surface-highest border border-outline-variant rounded-xl text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-secondary-container"
              />
            </div>

            {error && (
              <div className="bg-error-container/20 border border-error/30 text-error rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setPassword("");
                  setError(null);
                }}
                className="px-4 py-3 rounded-xl border border-outline-variant text-on-surface-variant hover:bg-surface-high transition-colors"
              >
                Volver
              </button>
              <button
                type="submit"
                className="flex-1 bg-secondary-container text-on-secondary-container py-3 rounded-xl font-medium hover:bg-white transition-colors"
              >
                Entrar
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}
