"use client";

import type { Database } from "@/infrastructure/supabase/database.types";

type TournamentPlayer = Database["public"]["Tables"]["tournament_players"]["Row"];
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
  const stats = new Map<string, { gamesWon: number; gamesLost: number }>();

  for (const m of allMatches) {
    if (!m.is_finished) continue;

    const playersA = [m.player1_id, m.player2_id];
    const playersB = [m.player3_id, m.player4_id];

    for (const pid of playersA) {
      const cur = stats.get(pid) ?? { gamesWon: 0, gamesLost: 0 };
      cur.gamesWon += m.score_team_a;
      cur.gamesLost += m.score_team_b;
      stats.set(pid, cur);
    }

    for (const pid of playersB) {
      const cur = stats.get(pid) ?? { gamesWon: 0, gamesLost: 0 };
      cur.gamesWon += m.score_team_b;
      cur.gamesLost += m.score_team_a;
      stats.set(pid, cur);
    }
  }

  const entries: LeaderboardEntry[] = tournamentPlayers
    .map((tp) => {
      const s = stats.get(tp.player_id) ?? { gamesWon: 0, gamesLost: 0 };
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
    .sort((a, b) => b.totalPoints - a.totalPoints || b.gameDifference - a.gameDifference);

  return (
    <div className="border border-gray-200 rounded-lg overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left px-3 py-2 font-medium text-gray-500">#</th>
            <th className="text-left px-3 py-2 font-medium text-gray-500">Pista</th>
            <th className="text-left px-3 py-2 font-medium text-gray-500">Jugador</th>
            <th className="text-right px-3 py-2 font-medium text-gray-500">Pts</th>
            <th className="text-right px-3 py-2 font-medium text-gray-500">G</th>
            <th className="text-right px-3 py-2 font-medium text-gray-500">P</th>
            <th className="text-right px-3 py-2 font-medium text-gray-500">+/-</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <tr
              key={e.playerId}
              className={`border-t border-gray-100 ${i === 0 ? "bg-amber-50" : ""}`}
            >
              <td className="px-3 py-2 text-gray-400">{i + 1}</td>
              <td className="px-3 py-2 font-medium">{e.currentCourt}</td>
              <td className="px-3 py-2">
                {i === 0 ? "👑 " : ""}
                {e.name}
              </td>
              <td className="px-3 py-2 text-right font-bold">{e.totalPoints}</td>
              <td className="px-3 py-2 text-right text-green-600">{e.gamesWon}</td>
              <td className="px-3 py-2 text-right text-red-500">{e.gamesLost}</td>
              <td
                className={`px-3 py-2 text-right font-medium ${
                  e.gameDifference > 0
                    ? "text-green-600"
                    : e.gameDifference < 0
                      ? "text-red-500"
                      : "text-gray-400"
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
