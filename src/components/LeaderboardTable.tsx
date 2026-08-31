"use client";

import type { Database } from "@/infrastructure/supabase/database.types";

type TournamentPlayer =
  Database["public"]["Tables"]["tournament_players"]["Row"];
type Match = Database["public"]["Tables"]["matches"]["Row"];

interface PlayerNameMap {
  [playerId: string]: string;
}

interface LeaderboardEntry {
  playerId: string;
  name: string;
  currentCourt: number;
  totalPoints: number;
  gamesWon: number;
  gamesLost: number;
  gameDifference: number;
}

interface LeaderboardTableProps {
  tournamentPlayers: TournamentPlayer[];
  allMatches: Match[];
  playerNames: PlayerNameMap;
}

export default function LeaderboardTable({
  tournamentPlayers,
  allMatches,
  playerNames,
}: LeaderboardTableProps) {
  const stats = new Map<
    string,
    { gamesWon: number; gamesLost: number }
  >();

  for (const m of allMatches) {
    if (!m.is_finished) continue;

    const playersA = [m.player1_id, m.player2_id];
    const playersB = [m.player3_id, m.player4_id];

    for (const pid of playersA) {
      const cur = stats.get(pid) ?? {
        gamesWon: 0,
        gamesLost: 0,
      };
      cur.gamesWon += m.score_team_a;
      cur.gamesLost += m.score_team_b;
      stats.set(pid, cur);
    }

    for (const pid of playersB) {
      const cur = stats.get(pid) ?? {
        gamesWon: 0,
        gamesLost: 0,
      };
      cur.gamesWon += m.score_team_b;
      cur.gamesLost += m.score_team_a;
      stats.set(pid, cur);
    }
  }

  const entries: LeaderboardEntry[] = tournamentPlayers
    .map((tp) => {
      const s = stats.get(tp.player_id) ?? {
        gamesWon: 0,
        gamesLost: 0,
      };
      return {
        playerId: tp.player_id,
        name: playerNames[tp.player_id] ?? "Jugador",
        currentCourt: tp.current_court,
        totalPoints: tp.total_points,
        gamesWon: s.gamesWon,
        gamesLost: s.gamesLost,
        gameDifference: s.gamesWon - s.gamesLost,
      };
    })
    .sort(
      (a, b) =>
        b.totalPoints - a.totalPoints ||
        b.gameDifference - a.gameDifference
    );

  return (
    <div className="glass-panel rounded-2xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface-high">
            <th className="text-left px-3 py-2 font-medium text-on-surface-variant">
              #
            </th>
            <th className="text-left px-3 py-2 font-medium text-on-surface-variant">
              Pista
            </th>
            <th className="text-left px-3 py-2 font-medium text-on-surface-variant">
              Jugador
            </th>
            <th className="text-right px-3 py-2 font-medium text-on-surface-variant">
              Pts
            </th>
            <th className="text-right px-3 py-2 font-medium text-on-surface-variant">
              G
            </th>
            <th className="text-right px-3 py-2 font-medium text-on-surface-variant">
              P
            </th>
            <th className="text-right px-3 py-2 font-medium text-on-surface-variant">
              +/-
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <tr
              key={e.playerId}
              className={`border-t border-outline-variant/20 ${
                i === 0 ? "bg-surface/30" : i % 2 === 0 ? "bg-surface/10" : ""
              }`}
            >
              <td className="px-3 py-2 text-on-surface-variant">
                {i + 1}
              </td>
              <td className="px-3 py-2 font-medium text-on-surface">
                {e.currentCourt}
              </td>
              <td className="px-3 py-2 text-on-surface">
                {i === 0 ? "👑 " : ""}
                {e.name}
              </td>
              <td className="px-3 py-2 text-right font-bold text-on-surface">
                {e.totalPoints}
              </td>
              <td className="px-3 py-2 text-right text-secondary-fixed-dim">
                {e.gamesWon}
              </td>
              <td className="px-3 py-2 text-right text-error">
                {e.gamesLost}
              </td>
              <td
                className={`px-3 py-2 text-right font-medium ${
                  e.gameDifference > 0
                    ? "text-secondary-fixed-dim"
                    : e.gameDifference < 0
                      ? "text-error"
                      : "text-on-surface-variant"
                }`}
              >
                {e.gameDifference > 0 ? "+" : ""}
                {e.gameDifference}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
