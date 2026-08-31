"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signInWithMagicLink, signInWithGoogle } from "../actions";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const sent = searchParams.get("sent");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    try {
      await signInWithMagicLink(formData);
    } catch {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch {
      setLoading(false);
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
            Inicia sesión para continuar
          </p>
        </div>

        {error && (
          <div className="bg-error-container/20 border border-error/30 text-error rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {sent && (
          <div className="bg-secondary-container/20 border border-secondary-container/50 text-on-secondary-container rounded-xl px-4 py-3 text-sm">
            Revisa tu correo para el enlace de acceso.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-on-surface mb-1"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="tu@email.com"
              className="w-full px-4 py-3 bg-surface-highest border border-outline-variant rounded-xl text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-secondary-container"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-on-primary py-3 rounded-xl font-medium hover:bg-white transition-colors disabled:opacity-50"
          >
            {loading
              ? "Enviando..."
              : "Enviar enlace mágico"}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-outline-variant" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-surface px-2 text-on-surface-variant">
              o
            </span>
          </div>
        </div>

        <button
          onClick={handleGoogle}
          disabled={loading}
          className="w-full border border-outline-variant bg-surface-highest text-on-surface py-3 rounded-xl font-medium hover:bg-surface-high transition-colors disabled:opacity-50"
        >
          Continuar con Google
        </button>
      </div>
    </div>
  );
}
