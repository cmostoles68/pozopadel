import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background pattern-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md glass-panel rounded-3xl p-8 space-y-5 text-center">
        <span className="material-symbols-outlined text-secondary-container text-5xl inline-block">
          search_off
        </span>
        <h1 className="font-display text-2xl font-bold text-on-surface">
          Página no encontrada
        </h1>
        <p className="text-on-surface-variant">
          La página que buscas no existe o ya no está disponible.
        </p>
        <Link
          href="/dashboard"
          className="inline-block rounded-full bg-secondary-container text-on-secondary-container px-8 py-3 font-display font-semibold hover:bg-white transition-colors"
        >
          Ir al panel
        </Link>
      </div>
    </div>
  );
}
