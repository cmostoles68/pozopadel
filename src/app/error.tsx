"use client";

import { useEffect } from "react";

/**
 * Error boundary global del App Router.
 * Captura cualquier error de renderizado y muestra un mensaje genérico,
 * sin exponer ningún detalle técnico interno al usuario final.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Registro del error en consola para diagnóstico (solo entorno de desarrollo).
    if (process.env.NODE_ENV === "development") {
      console.error("[PadelElite] Error capturado:", error.message);
    }
  }, [error]);

  return (
    <div className="min-h-screen bg-background pattern-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md glass-panel rounded-3xl p-8 space-y-5 text-center">
        <span className="material-symbols-outlined text-secondary-container text-5xl inline-block">
          wifi_off
        </span>
        <h1 className="font-display text-2xl font-bold text-on-surface">
          Algo no ha salido bien
        </h1>
        <p className="text-on-surface-variant">
          Ha ocurrido un error inesperado al cargar esta página. Tus datos están
          a salvo; vuelve a intentarlo en un momento.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-full bg-secondary-container text-on-secondary-container px-8 py-3 font-display font-semibold hover:bg-white transition-colors"
        >
          Volver a intentar
        </button>
      </div>
    </div>
  );
}
