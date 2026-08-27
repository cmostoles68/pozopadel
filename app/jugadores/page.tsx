import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import PadelRacket from "@/components/PadelRacket";
import PlayerForm from "./PlayerForm";
import DeletePlayer from "./DeletePlayer";

export default async function JugadoresPage() {
  const supabase = await createClient();

  const { data: players } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name");

  const levelLabel = (level: number) => {
    if (level <= 2.5) return { text: "Principiante", color: "bg-gray-100 text-gray-700" };
    if (level <= 4.5) return { text: "Intermedio", color: "bg-blue-100 text-blue-700" };
    if (level <= 6.5) return { text: "Avanzado", color: "bg-green-100 text-green-700" };
    return { text: "Expert", color: "bg-yellow-100 text-yellow-700" };
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-gray-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-500 hover:text-foreground">
              ← Volver
            </Link>
            <div className="flex items-center gap-2">
              <PadelRacket className="w-6 h-6" />
              <h1 className="text-lg font-semibold text-foreground">Jugadores</h1>
            </div>
          </div>
          <span className="text-sm text-gray-500">{players?.length ?? 0} jugadores</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <PlayerForm />

        {players && players.length > 0 ? (
          <div className="space-y-3">
            {players.map((p) => {
              const lvl = levelLabel(p.level);
              return (
                <div
                  key={p.id}
                  className="border border-gray-200 rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-foreground">{p.full_name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${lvl.color}`}>
                        {lvl.text}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {p.gender === "MALE" ? "Hombre" : "Mujer"} &middot;{" "}
                      {p.dominant_hand === "RIGHT" ? "Diestro" : "Zurdo"} &middot; Nivel{" "}
                      {p.level}
                    </p>
                  </div>
                  <DeletePlayer id={p.id} />
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-8">
            Aún no hay jugadores. Añade el primero.
          </p>
        )}
      </main>
    </div>
  );
}
