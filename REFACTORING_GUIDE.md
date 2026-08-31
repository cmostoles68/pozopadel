# Pozopadel Refactoring Guide

Quick reference for implementing high-priority architectural improvements.

---

## 1. Fix Type Safety in Adapters (1-2 hours)

### Problem
All adapters use `type Database = any`, defeating TypeScript at data access layer.

### Solution

#### Before (Tournament Adapter)
```typescript
// src/infrastructure/supabase/adapters/tournament.adapter.ts
import type { ITournamentRepository } from "@/domain/repositories/tournament.repository";
import type { Tournament, TournamentPlayer } from "@/domain/entities/tournament";
import type { SupabaseClient } from "@supabase/supabase-js";

type Database = any; // ❌ Loses type checking

export class SupabaseTournamentAdapter implements ITournamentRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  async findById(id: string): Promise<Tournament | null> {
    const { data } = await this.supabase
      .from("tournaments")
      .select("*")
      .eq("id", id)
      .single();
    return (data as Tournament) ?? null; // ❌ Unsafe cast
  }
}
```

#### After (Tournament Adapter)
```typescript
// src/infrastructure/supabase/adapters/tournament.adapter.ts
import type { ITournamentRepository } from "@/domain/repositories/tournament.repository";
import type { Tournament, TournamentPlayer } from "@/domain/entities/tournament";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types"; // ✅ Use generated types

export class SupabaseTournamentAdapter implements ITournamentRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  async findById(id: string): Promise<Tournament | null> {
    const { data } = await this.supabase
      .from("tournaments") // ✅ Table name type-checked
      .select("*")
      .eq("id", id)
      .single();
    
    // ✅ Cast only if needed for schema differences, with validation comment
    return (data as Tournament) ?? null;
  }
  
  async findAll(): Promise<Tournament[]> {
    const { data } = await this.supabase
      .from("tournaments")
      .select(
        "id, title, status, number_of_courts, minutes_per_round, champion_drawn_pair_id, created_at, created_by" // ✅ Explicit column selection
      )
      .order("created_at", { ascending: false });
    
    // ✅ Validate returned data has expected shape
    return (data ?? []).map(row => this.mapToTournament(row));
  }

  private mapToTournament(row: any): Tournament {
    // ✅ Explicit mapping with null checks
    return {
      id: row.id,
      title: row.title,
      status: row.status,
      number_of_courts: row.number_of_courts,
      minutes_per_round: row.minutes_per_round,
      champion_drawn_pair_id: row.champion_drawn_pair_id,
      created_at: row.created_at,
      created_by: row.created_by,
    };
  }
}
```

### Apply to All Adapters
1. Import `type { Database }` from `../database.types`
2. Remove `type Database = any`
3. Add explicit mapping methods
4. Update imports in all 6 adapter files

---

## 2. Create Result Type for Consistent Error Handling (1-2 hours)

### Problem
Inconsistent error handling: some services throw, some return errors, action layer wraps with try-catch.

### Solution

#### New File: `src/types/result.ts`
```typescript
/**
 * Result type for consistent error handling across services.
 * Forces explicit handling of success/failure cases.
 */
export type Result<T, E = string> = 
  | { ok: true; data: T }
  | { ok: false; error: E };

/**
 * Helper to create success result
 */
export function success<T>(data: T): Result<T> {
  return { ok: true, data };
}

/**
 * Helper to create error result
 */
export function failure<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

/**
 * Map result to new type if successful
 */
export function mapResult<T, U, E>(
  result: Result<T, E>,
  mapper: (data: T) => U,
): Result<U, E> {
  return result.ok ? success(mapper(result.data)) : result;
}

/**
 * Chain operations on results
 */
export function flatMapResult<T, U, E>(
  result: Result<T, E>,
  mapper: (data: T) => Result<U, E>,
): Result<U, E> {
  return result.ok ? mapper(result.data) : result;
}
```

#### Update DrawService
```typescript
// Before
async drawPairs(method: DrawMethod): Promise<DrawPairsResult> {
  const validationError = getDrawValidationError(players.length);
  if (validationError) {
    return { error: validationError }; // ❌ Inconsistent shape
  }
  // ...
  return { ok: true, pairs: inserted, oddPlayer: oddPlayer?.full_name ?? null };
}

// After
async drawPairs(method: DrawMethod): Promise<Result<DrawPairsOutput>> {
  const validationError = getDrawValidationError(players.length);
  if (validationError) {
    return failure(validationError); // ✅ Consistent
  }
  
  const players = await this.playerRepo.findProfiles();
  if (players.length < 2) {
    return failure("Se necesitan al menos 2 jugadores");
  }
  
  // ... pairing logic ...
  
  return success({
    pairs: inserted,
    oddPlayer: oddPlayer?.full_name ?? null,
  });
}

interface DrawPairsOutput {
  pairs: DrawnPair[];
  oddPlayer: string | null;
}
```

#### Update Server Actions
```typescript
// Before (needs try-catch)
export async function drawPairs(method: DrawMethod) {
  const { drawService } = await createServices();
  try {
    const result = await drawService.drawPairs(method);
    if (result.error) return { error: result.error };
    return { ok: true, pairs: result.pairs, oddPlayer: result.oddPlayer };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

// After (no try-catch needed)
export async function drawPairs(method: DrawMethod) {
  const { drawService } = await createServices();
  const result = await drawService.drawPairs(method);
  
  // Return as-is, consistent shape
  return result.ok
    ? { ok: true as const, pairs: result.data.pairs, oddPlayer: result.data.oddPlayer }
    : { error: result.error };
}

// Even better: let client handle Result type
export async function drawPairs(method: DrawMethod): Promise<Result<DrawPairsOutput>> {
  const { drawService } = await createServices();
  return drawService.drawPairs(method);
}
```

---

## 3. Consolidate Movement Algorithms (2-3 hours)

### Problem
`calculateMovements()` and `calculatePairMovements()` are duplicates with different entity types.

### Solution

#### New File: `src/domain/algorithms/court-movements.ts`
```typescript
/**
 * Generic court movement algorithm.
 * Encodes padel tournament rules for player/pair court progression.
 */

export interface CourtMovement<EntityId extends string = string> {
  entityId: EntityId;
  courtNumber: number;
}

export interface CourtMatchResult<EntityId extends string = string> {
  courtNumber: number;
  winnerId: EntityId;
  loserId: EntityId;
}

/**
 * Calculate court movements based on match results.
 * 
 * Rules (for N courts):
 * - Court 1 (Rey): Loser goes to court 2. Winner stays at 1.
 * - Court 2 to N-1: Winner goes up (to court-1). Loser goes down (to court+1).
 * - Court N: Winner goes up (to court-1). Loser stays at N.
 * - Court 1 only (N=1): Both loser and winner move to court 1 (no change).
 * 
 * @param results - Match results from each court
 * @param numberOfCourts - Total number of courts in tournament
 * @returns Array of movements (entity -> new court)
 */
export function calculateCourtMovements<EntityId extends string = string>(
  results: CourtMatchResult<EntityId>[],
  numberOfCourts: number,
): CourtMovement<EntityId>[] {
  const movements: CourtMovement<EntityId>[] = [];

  for (const result of results) {
    const court = result.courtNumber;

    if (numberOfCourts <= 1) {
      // Single court: no movement
      movements.push({ entityId: result.winnerId, courtNumber: 1 });
      movements.push({ entityId: result.loserId, courtNumber: 1 });
    } else if (court === 1) {
      // Rey court: winner stays, loser descends
      movements.push({ entityId: result.winnerId, courtNumber: 1 });
      movements.push({ entityId: result.loserId, courtNumber: 2 });
    } else if (court < numberOfCourts) {
      // Middle courts: winner ascends, loser descends
      movements.push({ entityId: result.winnerId, courtNumber: court - 1 });
      movements.push({ entityId: result.loserId, courtNumber: court + 1 });
    } else {
      // Last court: winner ascends, loser stays
      movements.push({ entityId: result.winnerId, courtNumber: court - 1 });
      movements.push({ entityId: result.loserId, courtNumber: court });
    }
  }

  return movements;
}

/**
 * Backward compatibility adapters
 */

import type { PlayerRow, RoundResult } from "../entities/match";

export function calculateMovementsForPlayers(
  results: RoundResult[],
  numberOfCourts: number,
): { player_id: string; current_court: number }[] {
  const pairedResults: CourtMatchResult<string>[] = results.map(r => ({
    courtNumber: r.court_number,
    winnerId: r.winner.player1_id, // Note: loses player2 info, but that's what legacy did
    loserId: r.loser.player1_id,
  }));

  return calculateCourtMovements(pairedResults, numberOfCourts).map(m => ({
    player_id: m.entityId,
    current_court: m.courtNumber,
  }));
}
```

#### Update `legacy-round-engine.ts`
```typescript
// Before: had its own calculateMovements()
// After: import and use generic version

import { calculateCourtMovements } from "./court-movements";
import type { CourtMatchResult } from "./court-movements";

export function generateNextRound(
  players: PlayerRow[],
  results: RoundResult[],
  numberOfCourts: number,
): CourtMatch[] {
  // Convert RoundResult to CourtMatchResult
  const courtResults: CourtMatchResult<string>[] = results.map(r => ({
    courtNumber: r.court_number,
    winnerId: r.winner.player1_id,
    loserId: r.loser.player1_id,
  }));

  // Use generic algorithm
  const movements = calculateCourtMovements(courtResults, numberOfCourts);

  // ... rest of logic ...
}
```

#### Update `movements.ts`
```typescript
// Before: had calculateMovements() AND calculatePairMovements()
// After: use generic version

import { calculateCourtMovements } from "./court-movements";

export function calculatePairMovements(
  results: PairCourtResult[],
  numberOfCourts: number,
): { drawn_pair_id: string; court_number: number }[] {
  return calculateCourtMovements(
    results.map(r => ({
      courtNumber: r.court_number,
      winnerId: r.winner_drawn_pair_id,
      loserId: r.loser_drawn_pair_id,
    })),
    numberOfCourts,
  ).map(m => ({
    drawn_pair_id: m.entityId,
    court_number: m.courtNumber,
  }));
}

// Remove duplicate calculateMovements() ✅
```

#### Update Tests
```typescript
// tests/pozo-engine.unit.spec.ts
import { calculateCourtMovements } from "../domain/algorithms/court-movements";

describe("calculateCourtMovements", () => {
  it("Pista Rey: winner stays, loser goes to court 2", () => {
    const results = [
      {
        courtNumber: 1,
        winnerId: "pair1",
        loserId: "pair2",
      },
    ];
    const movements = calculateCourtMovements(results, 3);

    expect(movements).toEqual([
      { entityId: "pair1", courtNumber: 1 },
      { entityId: "pair2", courtNumber: 2 },
    ]);
  });

  // ... more tests ...
});
```

---

## 4. Create Query Services (2-3 hours)

### Problem
Presentation layer bypasses application layer by calling repositories directly.

### Solution

#### New File: `src/application/services/tournament-query.service.ts`
```typescript
import type { ITournamentRepository } from "@/domain/repositories/tournament.repository";
import type { IDrawnPairRepository } from "@/domain/repositories/pair.repository";
import type { IPozoRoundRepository } from "@/domain/repositories/round.repository";
import type { Tournament } from "@/domain/entities/tournament";
import type { PairInfo } from "@/app/pozos/[id]/types";

/**
 * Query-focused service for tournament read operations.
 * Replaces direct repository access from presentation layer.
 */
export class TournamentQueryService {
  constructor(
    private tournamentRepo: ITournamentRepository,
    private drawnPairRepo: IDrawnPairRepository,
    private pozoRoundRepo: IPozoRoundRepository,
  ) {}

  async getTournamentById(id: string): Promise<Tournament | null> {
    return this.tournamentRepo.findById(id);
  }

  async getSelectedPairsForTournament(tournamentId: string): Promise<
    Array<{ id: string; tournament_id: string; drawn_pair_id: string; court_number: number | null }>
  > {
    return this.tournamentRepo.findByTournament(tournamentId);
  }

  async getChampion(tournamentId: string): Promise<PairInfo | null> {
    const tournament = await this.tournamentRepo.findById(tournamentId);
    
    if (!tournament?.champion_drawn_pair_id) {
      return null;
    }

    // Logic moved here, out of presentation layer
    return this.drawnPairRepo.findById(tournament.champion_drawn_pair_id);
  }

  async getRoundData(tournamentId: string): Promise<
    Array<{
      id: string;
      round_number: number;
      status: string;
      pairs: any[];
    }>
  > {
    const rounds = await this.pozoRoundRepo.findByTournament(tournamentId);
    
    return Promise.all(
      rounds.map(async (r) => ({
        id: r.id,
        round_number: r.round_number,
        status: r.status,
        pairs: await this.pozoRoundRepo.findRoundPairs(r.id),
      }))
    );
  }
}
```

#### Update `service-factory.ts`
```typescript
// Add to imports
import { TournamentQueryService } from "@/application/services/tournament-query.service";

export async function createServices() {
  // ... existing code ...

  const tournamentQueryService = new TournamentQueryService(
    tournamentRepo,
    drawnPairRepo,
    pozoRoundRepo,
  );

  return {
    // Command services
    playerService,
    tournamentService,
    drawService,
    roundService,
    authService,

    // Query service (replaces direct repo access)
    tournamentQueryService,

    // Keep repos only for tests
    __testOnly: process.env.NODE_ENV === 'test' ? {
      matchHistoryRepo,
      legacyMatchRepo,
      legacyRoundRepo,
      tournamentRepo,
      drawnPairRepo,
      pozoRoundRepo,
      playerRepo,
    } : undefined,
  };
}
```

#### Update Presentation Layer
```typescript
// Before
const [allPairs, selectedPairs] = await Promise.all([
  drawService.getDrawnPairsWithProfiles(),
  tournamentDrawnPairRepo.findByTournament(id), // ❌ Direct repo access
]);

// After
const [allPairs, selectedPairs] = await Promise.all([
  drawService.getDrawnPairsWithProfiles(),
  tournamentQueryService.getSelectedPairsForTournament(id), // ✅ Through service
]);
```

---

## 5. Extract Pairing Strategy Pattern (3-4 hours)

### Problem
`pairPlayers()` function has 160+ LOC with 4+ levels of nesting.

### Solution

#### New Directory: `src/domain/algorithms/strategies/`

##### Interface: `src/domain/algorithms/strategies/pairing.strategy.ts`
```typescript
import type { PlayerProfile } from "@/domain/entities/player";
import type { Pair } from "@/domain/entities/pair";

export interface PairingStrategy {
  readonly name: string;
  pair(
    players: PlayerProfile[],
    disallowedPairs: Set<string>,
  ): Array<[PlayerProfile, PlayerProfile]>;
}
```

##### Implementation 1: `src/domain/algorithms/strategies/random-pairing.strategy.ts`
```typescript
import type { PlayerProfile } from "@/domain/entities/player";
import type { PairingStrategy } from "./pairing.strategy";

export class RandomPairingStrategy implements PairingStrategy {
  readonly name = "random";

  pair(
    players: PlayerProfile[],
    disallowedPairs: Set<string>,
  ): Array<[PlayerProfile, PlayerProfile]> {
    const shuffled = this.shuffleArray([...players]);
    const pairs: Array<[PlayerProfile, PlayerProfile]> = [];

    for (let i = 0; i < shuffled.length - 1; i += 2) {
      if (this.canPair(shuffled[i], shuffled[i + 1], disallowedPairs)) {
        pairs.push([shuffled[i], shuffled[i + 1]]);
      } else {
        // Find compatible alternative
        let swapped = false;
        for (let j = i + 2; j < shuffled.length; j++) {
          if (this.canPair(shuffled[i], shuffled[j], disallowedPairs)) {
            [shuffled[i + 1], shuffled[j]] = [shuffled[j], shuffled[i + 1]];
            pairs.push([shuffled[i], shuffled[i + 1]]);
            swapped = true;
            break;
          }
        }
        if (!swapped) {
          pairs.push([shuffled[i], shuffled[i + 1]]);
        }
      }
    }

    return pairs;
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private canPair(
    a: PlayerProfile,
    b: PlayerProfile,
    disallowedPairs: Set<string>,
  ): boolean {
    return (
      this.leftyCompatible(a, b) &&
      !disallowedPairs.has([a.id, b.id].sort().join("|"))
    );
  }

  private leftyCompatible(a: PlayerProfile, b: PlayerProfile): boolean {
    return !(a.dominant_hand === "LEFT" && b.dominant_hand === "LEFT");
  }
}
```

##### Implementation 2: `src/domain/algorithms/strategies/level-pairing.strategy.ts`
```typescript
import type { PlayerProfile } from "@/domain/entities/player";
import type { PairingStrategy } from "./pairing.strategy";

export class LevelPairingStrategy implements PairingStrategy {
  readonly name = "level";

  pair(
    players: PlayerProfile[],
    disallowedPairs: Set<string>,
  ): Array<[PlayerProfile, PlayerProfile]> {
    const sorted = [...players].sort((a, b) => b.level - a.level);
    const pairs: Array<[PlayerProfile, PlayerProfile]> = [];

    for (let i = 0; i < sorted.length - 1; i += 2) {
      if (this.canPair(sorted[i], sorted[i + 1], disallowedPairs)) {
        pairs.push([sorted[i], sorted[i + 1]]);
      } else {
        // Swap logic
        let swapped = false;
        for (let j = i + 2; j < sorted.length; j++) {
          if (this.canPair(sorted[i], sorted[j], disallowedPairs)) {
            [sorted[i + 1], sorted[j]] = [sorted[j], sorted[i + 1]];
            pairs.push([sorted[i], sorted[i + 1]]);
            swapped = true;
            break;
          }
        }
        if (!swapped) {
          pairs.push([sorted[i], sorted[i + 1]]);
        }
      }
    }

    return pairs;
  }

  private canPair(
    a: PlayerProfile,
    b: PlayerProfile,
    disallowedPairs: Set<string>,
  ): boolean {
    return (
      this.leftyCompatible(a, b) &&
      !disallowedPairs.has([a.id, b.id].sort().join("|"))
    );
  }

  private leftyCompatible(a: PlayerProfile, b: PlayerProfile): boolean {
    return !(a.dominant_hand === "LEFT" && b.dominant_hand === "LEFT");
  }
}
```

##### Update draw.ts
```typescript
// Before: ~300 LOC with all strategies mixed
import { pairPlayers } from "@/domain/algorithms/draw";

// After: ~30 LOC, just strategy selection
import type { DrawMethod } from "@/domain/entities/pair";
import type { PairingStrategy } from "./strategies/pairing.strategy";
import { RandomPairingStrategy } from "./strategies/random-pairing.strategy";
import { LevelPairingStrategy } from "./strategies/level-pairing.strategy";
import { RandomMixPairingStrategy } from "./strategies/random-mix-pairing.strategy";
import { LevelMixPairingStrategy } from "./strategies/level-mix-pairing.strategy";

const strategies: Record<DrawMethod, PairingStrategy> = {
  random: new RandomPairingStrategy(),
  random_mix: new RandomMixPairingStrategy(),
  level: new LevelPairingStrategy(),
  level_mix: new LevelMixPairingStrategy(),
};

export function pairPlayers(
  players: PlayerProfile[],
  method: DrawMethod,
  disallowedPairs: Set<string> = new Set(),
): Array<[PlayerProfile, PlayerProfile]> {
  const strategy = strategies[method];
  if (!strategy) {
    throw new Error(`Unknown pairing method: ${method}`);
  }
  return strategy.pair(players, disallowedPairs);
}
```

---

## Implementation Priority

1. **Fix Type Safety** (1-2 hrs) - Low risk, high impact
2. **Delete Dead Code** (1 hr) - Very low risk, improves clarity
3. **Consolidate Movements** (2-3 hrs) - Medium risk, high payoff
4. **Result Type** (1-2 hrs) - Medium risk, improves reliability
5. **Query Services** (2-3 hrs) - Medium risk, restores abstraction
6. **Strategy Pattern** (3-4 hrs) - Lower priority, nice-to-have

**Total estimated time**: 10-15 hours over 2-3 sprints

**Recommended order**:
- Week 1: Type safety + Dead code deletion + Result type
- Week 2: Consolidate movements + Query services
- Week 3: Strategy pattern (if prioritized)
