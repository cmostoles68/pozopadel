import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { joinPozo } from "../actions";
import RealtimeView from "./RealtimeView";

export default async function PozoPage(props: PageProps<"/pozos/[id]">) {
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

  const { data: isPlayer } = await supabase
    .from("tournament_players")
    .select("id")
    .eq("tournament_id", id)
    .eq("player_id", user.id)
    .maybeSingle();

  const { data: players } = await supabase
    .from("tournament_players")
    .select("player_id, current_court, total_points, profiles(full_name, level)")
    .eq("tournament_id", id)
    .order("current_court");

  const { data: currentRound } = await supabase
    .from("rounds")
    .select("*")
    .eq("tournament_id", id)
    .in("status", ["in_progress", "pending"])
    .order("round_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: matches } = currentRound
    ? await supabase
        .from("matches")
        .select("*")
        .eq("round_id", currentRound.id)
        .order("court_number")
    : { data: [] };

  const isOwner = tournament.created_by === user.id;

  const statusLabel: Record<string, string> = {
    draft: "Borrador",
    in_progress: "En curso",
    completed: "Finalizado",
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-gray-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-500 hover:text-foreground">
              ← Volver
            </Link>
            <h1 className="text-lg font-semibold text-foreground">{tournament.title}</h1>
          </div>
          {isOwner && (
            <Link
              href={`/pozos/${id}/admin`}
              className="text-sm text-primary hover:text-primary-dark"
            >
              Admin
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>{tournament.number_of_courts} pistas</span>
          <span>{tournament.minutes_per_round} min/ronda</span>
          <span>{players?.length ?? 0} jugadores</span>
          <span className="font-medium text-foreground">{statusLabel[tournament.status]}</span>
        </div>

        {!isPlayer && tournament.status === "draft" && (
          <form action={joinPozo.bind(null, id)}>
            <button
              type="submit"
              className="bg-primary text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
            >
              Unirse al pozo
            </button>
          </form>
        )}

        {players && players.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3">Clasificación</h2>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-500">Pista</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-500">Jugador</th>
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
          </div>
        )}

        {currentRound && matches && (
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3">
              Ronda {currentRound.round_number}
            </h2>
            <RealtimeView
              roundId={currentRound.id}
              initialMatches={matches}
              tournamentId={id}
            />
          </div>
        )}

        {(!players || players.length === 0) && tournament.status === "draft" && (
          <p className="text-sm text-gray-500 text-center py-8">
            Esperando jugadores...
          </p>
        )}
      </main>
    </div>
  );
}
