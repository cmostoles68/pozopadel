import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import PadelRacket from "@/components/PadelRacket";
import SorteoClient from "./SorteoClient";

export default async function SorteoPage() {
  const supabase = await createClient();

  const { data: pairs } = await supabase
    .from("drawn_pairs")
    .select(`
      id, pair_number, player1_id, player2_id, draw_method,
      p1:profiles!drawn_pairs_player1_id_fkey(full_name, level, gender, dominant_hand),
      p2:profiles!drawn_pairs_player2_id_fkey(full_name, level, gender, dominant_hand)
    `)
    .order("pair_number");

  const { data: players } = await supabase
    .from("profiles")
    .select("id, full_name, level")
    .order("full_name");

  const activeMethod = pairs && pairs.length > 0 ? pairs[0].draw_method : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-gray-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-lg text-gray-500 hover:text-foreground">
              ← Volver
            </Link>
            <div className="flex items-center gap-2">
              <PadelRacket className="w-8 h-8" />
              <h1 className="text-2xl font-semibold text-foreground">Sortear Parejas</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <SorteoClient pairs={pairs ?? []} playerCount={players?.length ?? 0} activeMethod={activeMethod} />
      </main>
    </div>
  );
}
