import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import PadelRacket from "@/components/PadelRacket";
import DeleteTournament from "./DeleteTournament";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("id, title, status, number_of_courts, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-gray-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PadelRacket className="w-9 h-9" />
            <span className="text-2xl font-bold text-primary">PozoPadel</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <div className="grid grid-cols-4 gap-3">
          <Link
            href="/pozos/nuevo"
            className="flex flex-col items-center gap-2 border border-gray-200 rounded-xl p-6 hover:border-primary hover:bg-blue-50 transition-colors"
          >
            <span className="text-3xl">🏟️</span>
            <span className="text-base font-medium text-foreground">Nuevo Pozo</span>
          </Link>
          <Link
            href="/jugadores"
            className="flex flex-col items-center gap-2 border border-gray-200 rounded-xl p-6 hover:border-primary hover:bg-blue-50 transition-colors"
          >
            <span className="text-3xl">👥</span>
            <span className="text-base font-medium text-foreground">Jugadores</span>
          </Link>
          <Link
            href="/sorteo"
            className="flex flex-col items-center gap-2 border border-gray-200 rounded-xl p-6 hover:border-primary hover:bg-blue-50 transition-colors"
          >
            <span className="text-3xl">🎾</span>
            <span className="text-base font-medium text-foreground">Sortear</span>
          </Link>
          <Link
            href="/historico"
            className="flex flex-col items-center gap-2 border border-gray-200 rounded-xl p-6 hover:border-primary hover:bg-blue-50 transition-colors"
          >
            <span className="text-3xl">📜</span>
            <span className="text-base font-medium text-foreground">Histórico</span>
          </Link>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Torneos</h2>

          {tournaments && tournaments.length > 0 ? (
            <div className="space-y-3">
              {tournaments.map((t) => (
                <Link
                  key={t.id}
                  href={`/pozos/${t.id}`}
                  className="block border border-gray-200 rounded-lg p-4 hover:border-primary transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-foreground">{t.title}</h3>
                    <DeleteTournament id={t.id} title={t.title} />
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {t.number_of_courts} pistas &middot; Creado{" "}
                    {new Date(t.created_at).toLocaleDateString("es-ES")}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">
              Aún no hay torneos. Crea uno para empezar.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
