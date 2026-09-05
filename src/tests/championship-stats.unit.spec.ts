import { describe, it, expect, vi } from "vitest";
import { ChampionshipStatsService } from "../application/services/championship-stats.service";
import { ok, err } from "../domain/result";

type Mock = { [k: string]: ReturnType<typeof vi.fn> };

function buildService(overrides?: {
  tournamentErr?: string;
  historyErr?: string;
  pairsErr?: string;
}) {
  const repos: Record<string, Mock> = {
    tournamentRepo: {
      findAll: vi.fn(async () =>
        overrides?.tournamentErr
          ? err(overrides.tournamentErr)
          : ok(tournaments),
      ),
    },
    drawnPairRepo: {
      findAllWithProfiles: vi.fn(async () =>
        overrides?.pairsErr ? err(overrides.pairsErr) : ok(pairs),
      ),
    },
    matchHistoryRepo: {
      findAll: vi.fn(async () =>
        overrides?.historyErr ? err(overrides.historyErr) : ok(history),
      ),
    },
  };
  return new ChampionshipStatsService(
    repos.tournamentRepo as never,
    repos.drawnPairRepo as never,
    repos.matchHistoryRepo as never,
  );
}

const tournaments = [
  { id: "T1", champion_drawn_pair_id: "P1", title: "Pozo 1" },
  { id: "T2", champion_drawn_pair_id: "P2", title: "Pozo 2" },
  { id: "T3", champion_drawn_pair_id: null, title: "Pozo 3" },
];

const pairs = [
  { id: "P1", player1_id: "A", player2_id: "B" },
  { id: "P2", player1_id: "B", player2_id: "C" },
  { id: "P3", player1_id: "C", player2_id: "D" },
];

const history = [
  {
    tournament_id: "T1",
    winner_drawn_pair_id: "P1",
    winner_player1_id: "A",
    winner_player1_name: "Ana",
    winner_player2_id: "B",
    winner_player2_name: "Bea",
  },
  {
    tournament_id: "T4",
    winner_drawn_pair_id: "P99",
    winner_player1_id: "X",
    winner_player1_name: null,
    winner_player2_id: "Y",
    winner_player2_name: null,
  },
];

describe("ChampionshipStatsService", () => {
  it("cuenta campeonatos por jugador desde los pares sorteados (pares repetidos suman)", async () => {
    const service = buildService();
    const result = await service.countByDrawnPairs("user-1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual({ A: 1, B: 2, C: 1 });
  });

  it("ignora torneos sin campeón y pares cuyo id no está en el mapa", async () => {
    const service = buildService();
    const result = await service.countByDrawnPairs("user-1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // T3 sin campeón no aporta; P3 (nunca campeón) no cuenta
    expect(result.data["D"]).toBeUndefined();
    expect(result.data).toEqual({ A: 1, B: 2, C: 1 });
  });

  it("propaga el error del repositorio de torneos", async () => {
    const service = buildService({ tournamentErr: "boom torneos" });
    const result = await service.countByDrawnPairs("user-1");
    expect(result).toEqual(err("boom torneos"));
  });

  it("resuelve la pareja campeona de cada torneo desde el histórico y cuenta", async () => {
    const service = buildService();
    const result = await service.countByHistory("user-1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { counts, championsByTournament } = result.data;

    const t1 = championsByTournament.get("T1");
    expect(t1).not.toBeNull();
    expect(t1?.player1).toEqual({ id: "A", name: "Ana" });
    expect(t1?.player2).toEqual({ id: "B", name: "Bea" });
    expect(championsByTournament.get("T2")).toBeNull();
    expect(championsByTournament.get("T3")).toBeNull();

    // solo el campeón resuelto cuenta (T1: A+B)
    expect(counts).toEqual({ A: 1, B: 1 });
  });

  it("marca torneo como sin campeón si no hay partido con su pareja ganadora", async () => {
    const service = buildService();
    const result = await service.countByHistory("user-1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.championsByTournament.get("T2")).toBeNull();
    // T2 a pesar de tener champion pair no la cuenta (no hay partido)
    expect(result.data.counts["B"]).toBe(1);
  });

  it("propaga el error del repositorio de histórico", async () => {
    const service = buildService({ historyErr: "boom histórico" });
    const result = await service.countByHistory("user-1");
    expect(result).toEqual(err("boom histórico"));
  });
});
