import Link from "next/link";
import AppShell from "@/components/AppShell";
import DeleteTournament from "./DeleteTournament";
import { createServices } from "@/infrastructure/service-factory";
import { getCurrentUserUuid } from "@/infrastructure/supabase/current-user";
import { requireResult } from "@/domain/result";

const CARDS = [
  { href: "/pozos/nuevo", icon: "add_circle", label: "Nuevo Torneo" },
];

export default async function DashboardPage() {
  const { tournamentService } = await createServices();
  const userUuid = await getCurrentUserUuid();
  const tournaments = requireResult(await tournamentService.getAll(userUuid));

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-10">
        <div className="grid grid-cols-2 sm:grid-cols-2 max-w-sm gap-4">
          {CARDS.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="glass-panel rounded-2xl p-6 flex flex-col items-center gap-3 hover:border-secondary-container transition-colors"
            >
              <span className="material-symbols-outlined text-secondary-container text-3xl">
                {card.icon}
              </span>
              <span className="text-sm font-medium text-on-surface">
                {card.label}
              </span>
            </Link>
          ))}
        </div>

        <section>
          <h2 className="font-display text-xl font-bold text-on-surface mb-4">
            Torneos
          </h2>
          {tournaments && tournaments.length > 0 ? (
            <div className="space-y-3">
              {tournaments.map((t) => (
                <Link
                  key={t.id}
                  href={`/pozos/${t.id}`}
                  className="glass-panel block rounded-2xl p-4 hover:border-secondary-container transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-on-surface">{t.title}</h3>
                    <DeleteTournament id={t.id} title={t.title} />
                  </div>
                  <p className="text-sm text-on-surface-variant mt-1">
                    {t.number_of_courts} pistas &middot; Creado{" "}
                    {new Date(t.created_at).toLocaleDateString("es-ES")}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant text-center py-8">
              Aún no hay torneos. Crea uno para empezar.
            </p>
          )}
        </section>
      </div>
    </AppShell>
  );
}
