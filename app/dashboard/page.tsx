import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { signOut } from "../auth/actions";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const { data: myTournaments } = await supabase
    .from("tournaments")
    .select("id, title, status, number_of_courts, created_at")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false });

  const { data: joinedTournamentIds } = await supabase
    .from("tournament_players")
    .select("tournament_id")
    .eq("player_id", user.id);

  const joinedIds = joinedTournamentIds?.map((j) => j.tournament_id) ?? [];

  const { data: joinedTournaments } = joinedIds.length
    ? await supabase
        .from("tournaments")
        .select("id, title, status, number_of_courts, created_at")
        .in("id", joinedIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const statusLabel: Record<string, string> = {
    draft: "Borrador",
    in_progress: "En curso",
    completed: "Finalizado",
  };

  const statusColor: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    in_progress: "bg-green-100 text-green-700",
    completed: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-gray-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="text-xl font-bold text-primary">
            PozoPadel
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{profile?.full_name ?? user.email}</span>
            <form action={signOut}>
              <button type="submit" className="text-sm text-gray-500 hover:text-foreground">
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Mis Pozos</h2>
          <Link
            href="/pozos/nuevo"
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            + Nuevo Pozo
          </Link>
        </div>

        {myTournaments && myTournaments.length > 0 ? (
          <div className="space-y-3">
            {myTournaments.map((t) => (
              <Link
                key={t.id}
                href={`/pozos/${t.id}`}
                className="block border border-gray-200 rounded-lg p-4 hover:border-primary transition-colors"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-foreground">{t.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[t.status] ?? ""}`}>
                    {statusLabel[t.status] ?? t.status}
                  </span>
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
            Aún no has creado ningún pozo.
          </p>
        )}

        {joinedTournaments && joinedTournaments.length > 0 && (
          <>
            <h2 className="text-lg font-semibold text-foreground">Pozos donde participo</h2>
            <div className="space-y-3">
              {joinedTournaments.map((t) => (
                <Link
                  key={t.id}
                  href={`/pozos/${t.id}`}
                  className="block border border-gray-200 rounded-lg p-4 hover:border-primary transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-foreground">{t.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[t.status] ?? ""}`}>
                      {statusLabel[t.status] ?? t.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {t.number_of_courts} pistas &middot; Creado{" "}
                    {new Date(t.created_at).toLocaleDateString("es-ES")}
                  </p>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
