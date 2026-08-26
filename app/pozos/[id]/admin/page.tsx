import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import AdminActions from "./AdminActions";

export default async function AdminPage(props: PageProps<"/pozos/[id]/admin">) {
  const { id } = await props.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", id)
    .single();

  if (!tournament) notFound();

  if (tournament.created_by !== user.id) redirect(`/pozos/${id}`);

  const { data: players } = await supabase
    .from("tournament_players")
    .select("player_id, current_court, total_points, profiles(full_name, level)")
    .eq("tournament_id", id)
    .order("current_court");

  const { data: rounds } = await supabase
    .from("rounds")
    .select("*")
    .eq("tournament_id", id)
    .order("round_number", { ascending: false });

  const currentRound = rounds?.find((r) => r.status === "in_progress");
  const pendingRound = rounds?.find((r) => r.status === "pending");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-gray-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/pozos/${id}`} className="text-gray-500 hover:text-foreground">
              ← Volver
            </Link>
            <h1 className="text-lg font-semibold text-foreground">Admin: {tournament.title}</h1>
          </div>
          <form action={signOut}>
            <button type="submit" className="text-sm text-gray-500 hover:text-foreground">
              Salir
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <section>
          <h2 className="text-sm font-semibold text-foreground mb-3">Jugadores ({players?.length ?? 0})</h2>
          {players && players.length > 0 ? (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-500">Pista</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-500">Nombre</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-500">Nivel</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-500">Puntos</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((p) => (
                    <tr key={p.player_id} className="border-t border-gray-100">
                      <td className="px-3 py-2 font-medium">{p.current_court}</td>
                      <td className="px-3 py-2">
                        {((p.profiles as unknown as { full_name: string })?.full_name) ?? "Jugador"}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-500">
                        {((p.profiles as unknown as { level: number })?.level) ?? "-"}
                      </td>
                      <td className="px-3 py-2 text-right font-medium">{p.total_points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No hay jugadores inscritos.</p>
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold text-foreground mb-3">Rondas</h2>
          {rounds && rounds.length > 0 ? (
            <div className="space-y-2">
              {rounds.map((r) => (
                <div
                  key={r.id}
                  className="border border-gray-200 rounded-lg px-3 py-2 flex items-center justify-between text-sm"
                >
                  <span>Ronda {r.round_number}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      r.status === "in_progress"
                        ? "bg-green-100 text-green-700"
                        : r.status === "finished"
                          ? "bg-gray-100 text-gray-600"
                          : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {r.status === "in_progress" ? "En curso" : r.status === "finished" ? "Finalizada" : "Pendiente"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No hay rondas creadas.</p>
          )}
        </section>

        <AdminActions
          tournamentId={id}
          tournamentStatus={tournament.status}
          playerCount={players?.length ?? 0}
          numberOfCourts={tournament.number_of_courts}
          hasCurrentRound={!!currentRound}
          hasPendingRound={!!pendingRound}
        />
      </main>
    </div>
  );
}
