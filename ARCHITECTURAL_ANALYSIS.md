# Pozopadel Architectural Analysis Report

**Analysis Date**: 2026-08-31  
**Project**: pozopadel (Padel Tournament Live Scoring System)  
**Scope**: Clean architecture assessment, code quality, dead code detection, flow documentation

---

## Executive Summary

The pozopadel project demonstrates a **solid foundational architecture** with proper layer separation (domain, application, infrastructure, presentation), but suffers from **critical design debt** stemming from two coexisting execution paths for tournament flows. This bifurcation creates maintenance burden, code duplication, and confusion about which APIs are active.

**Architectural Health Score: 5/10**

### Key Issues
1. ⚠️ **CRITICAL**: Dual flow architecture (legacy vs. modern "pozo" flow) causes parallel codebases
2. 🗑️ **CRITICAL**: Dead code APIs not referenced from UI layer
3. 📋 **HIGH**: Code duplication in movement calculation logic
4. 🔓 **HIGH**: Type safety gaps with `any` types in adapters
5. 🏗️ **MEDIUM**: Leaky abstractions - repositories exposed directly to UI

---

## 1. Clean Architecture Adherence

### Score: 6/10

### Positive Aspects
✅ **Good layer separation** - Domain, Application, Infrastructure, Presentation layers are well-defined:
- **Domain**: Pure business logic algorithms, entities, repository interfaces
- **Application**: Services orchestrating domain + repos, DTOs for input/output
- **Infrastructure**: Supabase adapters implementing repository contracts
- **Presentation**: Server components calling services via actions

✅ **Repository pattern implemented** - Abstract interfaces separate data access from business logic

✅ **Dependency injection** - Service factory centralizes service creation

### Issues

#### Issue 1.1: Leaky Abstractions - Repository Exposure to Presentation
**Location**: [src/infrastructure/service-factory.ts](src/infrastructure/service-factory.ts#L64-L74)  
**Severity**: HIGH

The service factory exposes repositories directly to presentation layer:

```typescript
return {
  // ... services ...
  // Exposed repos for read-heavy presentation pages that need direct queries
  matchHistoryRepo,
  legacyMatchRepo,
  legacyRoundRepo,
  tournamentRepo,
  drawnPairRepo,
  tournamentDrawnPairRepo,
  pozoRoundRepo,
  playerRepo,
  supabase,
};
```

**Problem**: The comment explicitly justifies bypassing the application layer for "read-heavy" queries. This breaks the abstraction boundary.

**Impact**:
- Presentation layer can execute raw queries without business logic validation
- Duplicates query logic that could live in services
- Makes it harder to change data access patterns (e.g., caching strategies)

**Evidence in UI**: [src/app/pozos/[id]/page.tsx](src/app/pozos/[id]/page.tsx#L16-L18) directly uses `tournamentDrawnPairRepo`:
```typescript
const [allPairs, selectedPairs] = await Promise.all([
  drawService.getDrawnPairsWithProfiles(),
  tournamentDrawnPairRepo.findByTournament(id), // ← Direct repo call
]);
```

**Recommendation**: Create read-focused query services:
```typescript
// New: src/application/services/tournament-query.service.ts
export class TournamentQueryService {
  async getSelectedPairsForTournament(tournamentId: string) {
    return this.tournamentDrawnPairRepo.findByTournament(tournamentId);
  }
}
```

#### Issue 1.2: Bidirectional Flow Data in Presentation
**Location**: [src/app/pozos/[id]/page.tsx](src/app/pozos/[id]/page.tsx#L23-L40)  
**Severity**: MEDIUM

The page loads **both** legacy and modern tournament data simultaneously:

```typescript
// Legacy flow data
const { round: currentRound, matches: currentMatches } =
  (await tournamentService.getCurrentLegacyRoundWithMatches(id)) ?? {
    round: null,
    matches: [],
  };

// Modern flow data
const pozoRounds = await roundService.getRounds(id);
```

Only the modern data is used for active tournament operations. The legacy data is displayed conditionally at the bottom but not actively maintained.

**Problem**: Creates cognitive load deciding which path is "real" and wastes queries on unused data.

---

## 2. The "Dual Flow" Architecture Problem

### Score: 2/10 (Critical Design Debt)

The codebase contains **two complete, parallel tournament execution paths** that diverged during development:

### Flow Comparison

| Aspect | Legacy Flow | Modern "Pozo" Flow |
|--------|------------|-------------------|
| **Data Model** | Individual players per match | Drawn pairs assigned to courts |
| **Entity** | `LegacyMatch`, `LegacyRound` | `PozoRoundPair`, `PozoRound` |
| **Repository** | `ILegacyRoundRepository`, `ILegacyMatchRepository` | `IPozoRoundRepository` |
| **Service** | `TournamentService.startRound1()`, `finishRoundAndStartNext()` | `DrawService.seedRound1()`, `RoundService.checkAndStartNextRound()` |
| **Movement Algorithm** | `calculateMovements()` (in legacy-round-engine.ts) | `calculatePairMovements()` (in movements.ts) |
| **Active UI** | Disabled/legacy view | CourtScoring component |
| **Status** | Abandoned API | Production flow |

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Tournament Creation                           │
├─────────────────────────────────────────────────────────────────┤
│                 → Tournament entity created                       │
└─────────────────────────┬───────────────────────────────────────┘
                          │
        ┌─────────────────┴─────────────────┐
        ▼                                   ▼
   ┌────────────────┐          ┌──────────────────┐
   │  LEGACY FLOW   │          │ MODERN FLOW      │
   │  (ABANDONED)   │          │  (PRODUCTION)    │
   └────────────────┘          └──────────────────┘
        │                             │
   (API Endpoint)              (Server Actions)
   POST /api/pozos/start       drawService.seedRound1()
        │                             ├─ drawService.drawCourts()
   TournamentService.            ├─ roundService.saveCourtResult()
   startRound1()                 └─ roundService.checkAndStartNextRound()
        │
   [Creates Legacy Rounds
    & Matches with players]
        │
   POST /api/pozos/finish-round ──→ [Unused]
   
   TournamentService.
   finishRoundAndStartNext()

   POST /api/pozos/finish ───────────→ [Unused]
   
   TournamentService.
   finalizeLegacyTournament()
```

### Dead Code Inventory

**🗑️ API Routes (Completely Unused)**

1. **[src/app/api/pozos/start/route.ts](src/app/api/pozos/start/route.ts)**
   - Calls: `tournamentService.startRound1()`
   - References: 0 (not called from UI or tests)
   - Lines: 44

2. **[src/app/api/pozos/finish-round/route.ts](src/app/api/pozos/finish-round/route.ts)**
   - Calls: `tournamentService.finishRoundAndStartNext()`
   - References: 0
   - Lines: 56

3. **[src/app/api/pozos/finish/route.ts](src/app/api/pozos/finish/route.ts)**
   - Calls: `tournamentService.finalizeLegacyTournament()`
   - References: 0
   - Lines: 39

**Total Dead API Code**: ~139 lines

**🗑️ Service Methods (Orphaned)**

1. **`TournamentService.startRound1()` [Line 67-103]**
   - Only called by: `POST /api/pozos/start` (dead endpoint)
   - ~37 lines

2. **`TournamentService.finishRoundAndStartNext()` [Line 104-157]**
   - Only called by: `POST /api/pozos/finish-round` (dead endpoint)
   - ~54 lines

3. **`TournamentService.finalizeLegacyTournament()` [Line 158-160]**
   - Only called by: `POST /api/pozos/finish` (dead endpoint)
   - ~3 lines

**Total Orphaned Service Code**: ~94 lines

**Legacy UI Component** (partially dead)

- **[src/app/pozos/[id]/TournamentView.tsx](src/app/pozos/[id]/TournamentView.tsx)**
  - Rendered only when `currentRound && currentMatches.length > 0`
  - This condition is almost never true in production (modern flow doesn't populate these)
  - Contains legacy match scoring UI (`CourtsGrid`, `updateMatchScore`)
  - ~37 lines

**Total Dead/Dormant UI**: ~37 lines

**Grand Total Dead Code**: ~270 lines (~3% of application code)

### Why Both Flows Exist

Based on code evolution, the legacy flow was the original implementation:
- Individual players assigned to courts (4-up format: P1, P2, P3, P4)
- Simple round-based progression with predetermined pairings
- Court movement logic based on per-player wins/losses

The modern "pozo" flow was added later to support:
- Pre-drawn pairs (enforced gender balance, partnership history constraints)
- Better separation of concerns (pair selection decoupled from tournament mechanics)
- More flexible pairing strategies

**Problem**: Old flow was never fully deleted, creating technical debt.

---

## 3. Code Quality & Best Practices

### Score: 6/10

#### Issue 3.1: Duplicated Movement Logic
**Locations**: 
- [src/domain/algorithms/legacy-round-engine.ts#L82-L108](src/domain/algorithms/legacy-round-engine.ts#L82-L108) - `calculateMovements()`
- [src/domain/algorithms/movements.ts#L32-L60](src/domain/algorithms/movements.ts#L32-L60) - `calculateMovements()` (same name!)
- [src/domain/algorithms/movements.ts#L1-L31](src/domain/algorithms/movements.ts#L1-L31) - `calculatePairMovements()`

**Severity**: HIGH  
**Type**: Code Duplication

The movement logic (determining which players/pairs advance/descend based on match results) is duplicated:

**Legacy** (individual players):
```typescript
export function calculateMovements(
  results: RoundResult[],
  numberOfCourts: number,
): { player_id: string; current_court: number }[] {
  const movements: { player_id: string; current_court: number }[] = [];
  for (const result of results) {
    const court = result.court_number;
    if (court === 1) {
      for (const pid of [result.loser.player1_id, result.loser.player2_id]) {
        if (pid) movements.push({ player_id: pid, current_court: 2 });
      }
    } else if (court < numberOfCourts) {
      for (const pid of [result.winner.player1_id, result.winner.player2_id]) {
        if (pid) movements.push({ player_id: pid, current_court: court - 1 });
      }
      // ...
    }
  }
  return movements;
}
```

**Modern** (drawn pairs):
```typescript
export function calculatePairMovements(
  results: PairCourtResult[],
  numberOfCourts: number,
): { drawn_pair_id: string; court_number: number }[] {
  const movements: { drawn_pair_id: string; court_number: number }[] = [];
  for (const result of results) {
    const court = result.court_number;
    if (numberOfCourts <= 1) {
      movements.push({ drawn_pair_id: result.winner_drawn_pair_id, court_number: 1 });
      movements.push({ drawn_pair_id: result.loser_drawn_pair_id, court_number: 1 });
    } else if (court === 1) {
      movements.push({ drawn_pair_id: result.winner_drawn_pair_id, court_number: 1 });
      movements.push({ drawn_pair_id: result.loser_drawn_pair_id, court_number: 2 });
    } // ...
  }
  return movements;
}
```

**Root Cause**: Same algorithm logic, different entity types. Could be unified into a generic function.

**Recommendation**:
```typescript
// Unified movement algorithm
export interface CourtMovement<T> {
  entityId: T;
  courtNumber: number;
}

export interface CourtResult<T> {
  courtNumber: number;
  winnerId: T;
  loserId: T;
}

export function calculateCourtMovements<T>(
  results: CourtResult<T>[],
  numberOfCourts: number,
): CourtMovement<T>[] {
  const movements: CourtMovement<T>[] = [];
  
  for (const result of results) {
    const court = result.courtNumber;
    
    if (numberOfCourts <= 1) {
      movements.push({ entityId: result.winnerId, courtNumber: 1 });
      movements.push({ entityId: result.loserId, courtNumber: 1 });
    } else if (court === 1) {
      movements.push({ entityId: result.winnerId, courtNumber: 1 });
      movements.push({ entityId: result.loserId, courtNumber: 2 });
    } else if (court < numberOfCourts) {
      movements.push({ entityId: result.winnerId, courtNumber: court - 1 });
      movements.push({ entityId: result.loserId, courtNumber: court + 1 });
    } else {
      movements.push({ entityId: result.winnerId, courtNumber: court - 1 });
      movements.push({ entityId: result.loserId, courtNumber: court });
    }
  }
  
  return movements;
}
```

#### Issue 3.2: Type Safety Gaps - `any` Types in Adapters
**Locations**: Multiple adapter files  
**Severity**: MEDIUM  
**Impact**: Defeats TypeScript's type checking at data access layer

Files using `type Database = any`:
1. [src/infrastructure/supabase/adapters/auth.adapter.ts#L4](src/infrastructure/supabase/adapters/auth.adapter.ts#L4)
2. [src/infrastructure/supabase/adapters/match.adapter.ts#L8](src/infrastructure/supabase/adapters/match.adapter.ts#L8)
3. [src/infrastructure/supabase/adapters/pair.adapter.ts#L8](src/infrastructure/supabase/adapters/pair.adapter.ts#L8)
4. [src/infrastructure/supabase/adapters/player.adapter.ts#L5](src/infrastructure/supabase/adapters/player.adapter.ts#L5)
5. [src/infrastructure/supabase/adapters/round.adapter.ts#L9](src/infrastructure/supabase/adapters/round.adapter.ts#L9)
6. [src/infrastructure/supabase/adapters/tournament.adapter.ts#L5](src/infrastructure/supabase/adapters/tournament.adapter.ts#L5)

**Problem Example**:
```typescript
type Database = any; // ← Should be the generated Supabase type

export class SupabasePlayerAdapter implements IPlayerRepository {
  constructor(private supabase: SupabaseClient<Database>) {}
  // All table/column names are now untyped
```

**Recommendation**: Use generated Supabase database types (should be in [src/infrastructure/supabase/database.types.ts](src/infrastructure/supabase/database.types.ts)):
```typescript
import type { Database } from "../database.types";

export class SupabasePlayerAdapter implements IPlayerRepository {
  constructor(private supabase: SupabaseClient<Database>) {}
  
  // Now supabase.from("profiles") is type-checked against Database schema
  async findAll(): Promise<Player[]> {
    const { data, error } = await this.supabase
      .from("profiles") // ← Validates table name
      .select("id, full_name, level, gender, dominant_hand") // ← Validates columns
      .returns<Player[]>();
    // ...
  }
}
```

#### Issue 3.3: Complex Pairing Logic with Low Testability
**Location**: [src/domain/algorithms/draw.ts#L34-L194](src/domain/algorithms/draw.ts#L34-L194)  
**Severity**: MEDIUM  
**Lines**: 160+ lines of deeply nested pairing logic

The `pairPlayers()` function handles multiple draw methods with complex swapping logic:
```typescript
export function pairPlayers(
  players: PlayerProfile[],
  method: DrawMethod, // "random" | "random_mix" | "level" | "level_mix"
  disallowedPairs: Set<string> = new Set(),
): Array<[PlayerProfile, PlayerProfile]> {
  // 160 lines of conditional nesting with 4+ levels deep
  // Complex swap logic: pairs.splice(), array swapping
  // Multiple break statements make flow hard to follow
}
```

**Problems**:
- Methods are entangled within single function
- Hard to test individual pairing strategy
- Swap fallback logic is implicit and hard to reason about

**Test Coverage**: [src/tests/draw-rules.unit.spec.ts](src/tests/draw-rules.unit.spec.ts) has only basic tests for gender balance, not comprehensive strategy testing.

**Recommendation**: Extract strategy pattern:
```typescript
interface PairingStrategy {
  pair(players: PlayerProfile[], disallowedPairs: Set<string>): Array<[PlayerProfile, PlayerProfile]>;
}

class RandomPairingStrategy implements PairingStrategy {
  pair(players: PlayerProfile[], disallowedPairs: Set<string>): Array<[PlayerProfile, PlayerProfile]> {
    // Only random logic here
  }
}

class LevelPairingStrategy implements PairingStrategy {
  pair(players: PlayerProfile[], disallowedPairs: Set<string>): Array<[PlayerProfile, PlayerProfile]> {
    // Only level-based logic
  }
}

export function pairPlayers(
  players: PlayerProfile[],
  method: DrawMethod,
  disallowedPairs: Set<string> = new Set(),
): Array<[PlayerProfile, PlayerProfile]> {
  const strategies: Record<DrawMethod, PairingStrategy> = {
    random: new RandomPairingStrategy(),
    level: new LevelPairingStrategy(),
    // ...
  };
  return strategies[method].pair(players, disallowedPairs);
}
```

#### Issue 3.4: Inconsistent Error Handling
**Severity**: MEDIUM

**Pattern 1** - String error returns (good for UI):
```typescript
// src/application/services/draw.service.ts
async drawPairs(method: DrawMethod): Promise<DrawPairsResult> {
  const validationError = getDrawValidationError(players.length);
  if (validationError) {
    return { error: validationError }; // ← String error
  }
  // ...
  return { ok: true, pairs: inserted, oddPlayer: oddPlayer?.full_name ?? null };
}
```

**Pattern 2** - Exception throws (sometimes caught):
```typescript
// src/application/services/tournament.service.ts
async startRound1(tournamentId: string, method: "level" | "random" = "level"): Promise<void> {
  const tournament = await this.tournamentRepo.findById(tournamentId);
  if (!tournament) throw new Error("Tournament not found"); // ← Throws
  // ...
}
```

**Pattern 3** - Try-catch in actions (wraps pattern 2):
```typescript
// src/app/pozos/actions.ts
export async function seedRound1(tournamentId: string) {
  const { drawService } = await createServices();
  try {
    await drawService.seedRound1(tournamentId);
    return { ok: true as const };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }
}
```

**Problem**: Inconsistent patterns make it unclear which service methods throw vs. return errors.

**Recommendation**: Standardize on Result type:
```typescript
export type Result<T, E = string> = 
  | { ok: true; data: T }
  | { ok: false; error: E };

// Usage
async drawPairs(method: DrawMethod): Promise<Result<DrawPairsOutput>> {
  const validationError = getDrawValidationError(players.length);
  if (validationError) {
    return { ok: false, error: validationError };
  }
  return { ok: true, data: { pairs: inserted, oddPlayer } };
}

// In actions - no try-catch needed
export async function seedRound1(tournamentId: string) {
  const { drawService } = await createServices();
  return drawService.seedRound1(tournamentId);
}
```

#### Issue 3.5: DTO Usage - Inconsistent and Partial
**Severity**: LOW-MEDIUM

**Current State**:
- ✅ Tournament creation uses DTO: `CreateTournamentInput` [Line 1](src/application/dto/tournament.dto.ts#L1)
- ❌ Most read operations bypass DTOs, return raw entities
- ❌ No DTO for player creation/update operations used in app
- ⚠️ DTOs exist but not enforced (can bypass with raw entity returns)

**Good DTOs**:
- [src/application/dto/tournament.dto.ts](src/application/dto/tournament.dto.ts) - `CreateTournamentInput`
- [src/application/dto/draw.dto.ts](src/application/dto/draw.dto.ts) - `DrawPairsResult`, `DrawCourtsResult`
- [src/application/dto/round.dto.ts](src/application/dto/round.dto.ts) - `SaveCourtResultResult`

**Missing DTOs**:
- Player creation/updates (used directly with `FormData` parsing in UI)
- Pair selection output (returns raw entities)
- Tournament player listing (no dedicated DTO)

---

## 4. Testing Gaps

### Score: 4/10

### Unit Tests ✅
- [src/tests/pozo-engine.unit.spec.ts](src/tests/pozo-engine.unit.spec.ts) - Good coverage of movement algorithms and pair generation
- [src/tests/draw-rules.unit.spec.ts](src/tests/draw-rules.unit.spec.ts) - Basic coverage of draw strategies
- [src/tests/championship.unit.spec.ts](src/tests/championships.unit.spec.ts)
- [src/tests/partnership-history.unit.spec.ts](src/tests/partnership-history.unit.spec.ts)

**Assessment**: Unit tests focus on algorithms in isolation. Good foundation.

### Integration Tests ❌
- **Missing**: Service-to-adapter integration tests
- **Missing**: Full tournament flow tests (create → draw → play → finalize)
- **Missing**: Error scenario testing

### E2E Tests ⚠️
- [tests/pozo-live.spec.ts](tests/pozo-live.spec.ts) - Tests live tournament UI
- [tests/pozo.spec.ts](tests/pozo.spec.ts)
- [tests/orden-pozos.spec.ts](tests/orden-pozos.spec.ts)

**Status**: E2E exists but very minimal. No comprehensive tournament flow coverage.

### Critical Path Coverage Gaps

**Not tested end-to-end**:
1. Full "modern flow": Pair draw → Court assignment → Round progression → Champion determination
2. Error scenarios: Insufficient players, invalid pair selections, concurrent updates
3. Boundary conditions: Single court tournaments, odd number of players
4. State transitions: Tournament status changes through lifecycle

**Recommendation**: Add integration test suite:
```typescript
// tests/integration/tournament-flow.spec.ts
describe("Tournament Pozo Flow", () => {
  it("should complete full tournament lifecycle", async () => {
    // 1. Create tournament
    const tournament = await tournamentService.create({
      title: "Test Torneo",
      numberOfCourts: 2,
      minutesPerRound: 20,
    });
    
    // 2. Add players
    // 3. Draw pairs
    // 4. Assign courts
    // 5. Play round 1
    // 6. Verify next round created correctly
    // 7. Finalize tournament
    // 8. Verify champion assigned
  });
});
```

---

## 5. Type Safety Assessment

### Score: 7/10

### Strengths ✅
- Strong entity typing (interfaces for Player, Match, Round, etc.)
- Repository interfaces provide contracts
- DTO types for service inputs/outputs
- TypeScript strict mode likely enabled (via tsconfig.json)

### Gaps ⚠️

#### Gap 5.1: Unsafe Casts
[src/infrastructure/supabase/adapters/tournament.adapter.ts#L12](src/infrastructure/supabase/adapters/tournament.adapter.ts#L12):
```typescript
return (data as Tournament) ?? null;
```

**Risk**: `data` could have missing/extra fields. Should validate:
```typescript
return data ? Tournament.parse(data) : null; // If using Zod
// or
if (!isValidTournament(data)) return null;
return data;
```

#### Gap 5.2: Generic `any` in Adapter Parameters
[src/infrastructure/supabase/adapters/pair.adapter.ts#L36](src/infrastructure/supabase/adapters/pair.adapter.ts#L36):
```typescript
((profiles ?? []) as any[]).map((p) => [p.id, p])
```

**Fix**:
```typescript
((profiles as ProfileRecord[]) ?? []).map((p) => [p.id, p])
```

#### Gap 5.3: Map Type in Service
[src/application/services/round.service.ts#L85-L87](src/application/services/round.service.ts#L85-L87):
```typescript
playerData: Map<
  string,
  { name: string | null; gender: string | null; ... }
>
```

**Risk**: Maps can't be serialized. Should use Record:
```typescript
playerData: Record<
  string,
  { name: string | null; gender: string | null; ... }
>
```

---

## 6. Dependency Injection & Service Factory

### Score: 7/10

**Positive**: Centralized factory pattern in [src/infrastructure/service-factory.ts](src/infrastructure/service-factory.ts) makes it easy to:
- Swap implementations (e.g., for testing)
- See all dependencies at once
- Add new services

**Issue**: Factory exposes repositories directly (covered in Section 1.1)

**Recommendation**: Separate query services from command services
```typescript
export async function createServices() {
  // ... existing adapters ...
  
  const queryService = new TournamentQueryService(
    tournamentRepo,
    pozoRoundRepo,
    tournamentDrawnPairRepo
  );
  
  return {
    // Commands
    tournamentService,
    drawService,
    roundService,
    
    // Queries (replaces direct repo exposure)
    tournamentQueryService: queryService,
    
    // Only expose repos for tests
    __adapters: process.env.NODE_ENV === 'test' ? { tournamentRepo, ... } : undefined,
  };
}
```

---

## 7. Unused Exports & Dead Files

### Potentially Unused

**Functions**:
- [src/domain/algorithms/draw.ts#L248-300+](src/domain/algorithms/draw.ts#L248-L300) - `computeWinningPartnerships()` - Used only in draw.service but unclear if this logic is needed for modern flow

**Legacy Repositories** (still referenced but only by dead code):
- `ILegacyRoundRepository` [Line 4-19](src/domain/repositories/round.repository.ts#L4-L19)
- `ILegacyMatchRepository` [Line 3-22](src/domain/repositories/match.repository.ts#L3-L22)

**Legacy Adapters**:
- `SupabaseLegacyRoundAdapter` [Line 11-88](src/infrastructure/supabase/adapters/round.adapter.ts#L11-L88)
- `SupabaseLegacyMatchAdapter` [Line 11-54](src/infrastructure/supabase/adapters/match.adapter.ts#L11-L54)

---

## 8. Code Metrics

### Size Analysis

| Layer | Files | Est. LOC | Status |
|-------|-------|---------|--------|
| Domain/Entities | 5 | ~200 | ✅ Clean, well-typed |
| Domain/Algorithms | 3 | ~650 | ⚠️ 160 LOC duplication in draw logic |
| Domain/Repositories | 6 | ~150 | ✅ Good interfaces |
| Application/Services | 5 | ~900 | ⚠️ 94 LOC dead code (legacy methods) |
| Application/DTOs | 4 | ~50 | ✅ Minimal |
| Infrastructure/Adapters | 6 | ~1100 | ⚠️ 139 LOC dead code (legacy adapters), `any` type issues |
| Infrastructure/Supabase | 3 | ~100 | ✅ Config/setup |
| Presentation/App | ~40 | ~2500 | ⚠️ Legacy flow components, direct repo access |
| **TOTAL** | **~80** | **~5650** | |

### Dead Code by Percentage
- Total project: ~5650 LOC
- Dead code: ~270 LOC
- **Ratio: ~4.8%** (above industry standard of <2%)

### Reference Tracking

**Files referencing legacy flow methods**:
- [src/app/api/pozos/start/route.ts](src/app/api/pozos/start/route.ts) → `TournamentService.startRound1()`
- [src/app/api/pozos/finish-round/route.ts](src/app/api/pozos/finish-round/route.ts) → `TournamentService.finishRoundAndStartNext()`
- [src/app/api/pozos/finish/route.ts](src/app/api/pozos/finish/route.ts) → `TournamentService.finalizeLegacyTournament()`

**Files NOT referencing legacy methods**:
- [src/app/pozos/actions.ts](src/app/pozos/actions.ts) - Uses modern DrawService and RoundService
- [src/app/pozos/[id]/page.tsx](src/app/pozos/[id]/page.tsx) - Reads legacy data but doesn't trigger legacy operations
- UI components - All use modern CourtScoring flow

---

## 9. Leaky Abstractions & Tight Coupling Issues

### Issue 9.1: Presentation Layer Knows About Tournament Entity Details
[src/app/pozos/[id]/page.tsx#L50-52](src/app/pozos/[id]/page.tsx#L50-L52):
```typescript
const champion =
  completed && tournament.champion_drawn_pair_id
    ? allPairs.find((p) => p.id === tournament.champion_drawn_pair_id) ?? null
    : null;
```

**Problem**: Presentation layer knows the internal relationship between tournaments and drawn pairs.

**Better**: Let service handle this:
```typescript
// In TournamentQueryService
async getChampion(tournamentId: string): Promise<PairInfo | null> {
  const tournament = await this.tournamentRepo.findById(tournamentId);
  if (!tournament?.champion_drawn_pair_id) return null;
  return this.drawnPairRepo.findById(tournament.champion_drawn_pair_id);
}
```

### Issue 9.2: Circular Dependencies Risk
The modern flow is well-layered, but `RoundService` depends on both:
- `IPozoRoundRepository` (round-specific)
- `IDrawnPairRepository` (pair-specific)
- `ITournamentRepository` (tournament-specific)
- `IPlayerRepository` (player-specific)
- `IMatchHistoryRepository` (history-specific)

This is 5 repository dependencies for one service. High fan-out suggests mixing concerns.

**Recommendation**: Consider `RoundOrchestrator` service:
```typescript
// Coordinates multiple repos without mixing business logic
export class RoundOrchestrator {
  constructor(
    private roundRepo: IPozoRoundRepository,
    private pairRepo: IDrawnPairRepository,
    private movementCalculator: MovementCalculator,
  ) {}
  
  async progressRound(roundId: string): Promise<void> {
    // Delegates to specific services instead of implementing logic
  }
}
```

---

## 10. Recommendations - Prioritized Roadmap

### CRITICAL (Do First)
1. **Delete Dead Legacy Flow APIs** (1-2 hours)
   - Remove `/api/pozos/start`, `/api/pozos/finish`, `/api/pozos/finish-round`
   - Remove `TournamentService.startRound1()`, `finishRoundAndStartNext()`, `finalizeLegacyTournament()`
   - Remove related test cases
   - **Impact**: Eliminates 270 LOC of confusion, clarifies execution path
   - **Risk**: Low (code is unused)

2. **Consolidate Movement Algorithms** (2-3 hours)
   - Create generic `calculateCourtMovements<T>()` function
   - Remove duplication between legacy and pair movements
   - **Impact**: Single source of truth for movement logic
   - **Risk**: Medium (refactoring algorithm logic)

3. **Fix Type Safety in Adapters** (1-2 hours)
   - Replace `type Database = any` with proper generated types
   - Remove `as any` casts
   - **Impact**: Compile-time validation at data access layer
   - **Risk**: Low (add stricter types, existing code should still work)

### HIGH (Do Next)
4. **Create Query Services** (2-3 hours)
   - Extract read operations from service factory exposure
   - Stop bypassing application layer in presentation
   - Add `TournamentQueryService`, `PlayerQueryService`, etc.
   - **Impact**: Restore abstraction boundaries
   - **Risk**: Medium (refactoring data flow)

5. **Remove Legacy UI Components** (1 hour)
   - Remove `TournamentView` or hide when legacy rounds don't exist
   - Stops fetching unused legacy round data
   - **Impact**: Cleaner UI, fewer queries
   - **Risk**: Low (unused component)

6. **Standardize Error Handling** (2-3 hours)
   - Implement Result<T, E> type across services
   - Remove inconsistent throw/return patterns
   - Update actions to not wrap in try-catch
   - **Impact**: Predictable error handling
   - **Risk**: Medium (behavioral change)

### MEDIUM (Polish)
7. **Add Integration Tests** (4-6 hours)
   - Test full tournament lifecycle end-to-end
   - Service-to-adapter integration tests
   - Error scenarios
   - **Impact**: Confidence in refactoring, catches regressions
   - **Risk**: None (only adds tests)

8. **Refactor Pairing Strategy** (3-4 hours)
   - Extract strategy pattern for `pairPlayers()`
   - Separate concerns, improve testability
   - **Impact**: More maintainable pairing logic
   - **Risk**: Medium (algorithm refactor)

9. **Add DTO Validation** (2-3 hours)
   - Introduce Zod or similar for runtime validation
   - Replace unsafe `as` casts
   - **Impact**: Type safety at runtime
   - **Risk**: Low (adds validation layer)

### LOW (Nice-to-Have)
10. **Separate Command/Query Services**
11. **Add API documentation** (OpenAPI/Swagger)
12. **Performance optimization** - Query batching, caching

---

## 11. Architecture Improvements (Long-term)

### Potential Refactoring - Modern Clean Architecture

```
src/
├── domain/
│   ├── entities/
│   │   ├── player.ts          ✅ (stable)
│   │   ├── tournament.ts       ✅ (stable)
│   │   └── pair.ts             ✅ (stable)
│   ├── value-objects/
│   │   └── court-movement.ts   (new: generic movement logic)
│   ├── repositories/
│   │   ├── round.repository.ts (remove Legacy interface)
│   │   ├── match.repository.ts (remove Legacy interface)
│   │   └── ...
│   └── services/               (new: pure business logic)
│       ├── tournament-rules.ts (movement logic, validation)
│       └── pairing-engine.ts   (strategy-based pairing)
├── application/
│   ├── services/
│   │   ├── draw.service.ts     ✅ (modern flow)
│   │   ├── round.service.ts    ✅ (modern flow)
│   │   ├── tournament-command.service.ts (new)
│   │   └── tournament-query.service.ts   (new: replaces repo exposure)
│   ├── use-cases/              (new: replaces current service structure)
│   │   ├── create-tournament.ts
│   │   ├── draw-pairs.ts
│   │   ├── play-round.ts
│   │   └── finalize-tournament.ts
│   └── dto/                    ✅ (expand with validation)
├── infrastructure/
│   └── supabase/
│       ├── adapters/           ✅ (fix type safety)
│       └── migrations/         ✅
└── presentation/
    ├── app/                    ✅ (remove legacy flow)
    ├── components/             ✅
    └── actions/                ✅ (cleaner with standardized errors)
```

---

## Summary Table

| Category | Score | Status | Primary Issues |
|----------|-------|--------|-----------------|
| **Architecture** | 5/10 | ⚠️ Fair | Dual flow, leaky abstractions |
| **Code Quality** | 6/10 | ⚠️ Fair | Duplication, type safety gaps |
| **Testing** | 4/10 | ❌ Poor | Missing integration/E2E tests |
| **Type Safety** | 7/10 | ✅ Good | Few gaps, easily fixed |
| **Dead Code** | 2/10 | ❌ Poor | 270 LOC unused |
| **Dependency Injection** | 7/10 | ✅ Good | Good pattern, one leak |

**Overall Health: 5.2/10** - Acceptable foundation with significant maintenance burden from dual architecture.

---

## Quick Wins (Can Do Today)

1. **Delete 3 dead API routes** → 30 minutes
2. **Remove dead service methods** → 15 minutes
3. **Hide legacy TournamentView** → 10 minutes
4. **Add `Database` type to 1 adapter as template** → 15 minutes

**Total**: ~1 hour to reduce dead code by ~30%

---

## Conclusion

The pozopadel codebase demonstrates **solid foundational architecture** with proper layer separation and clean repository patterns. However, it carries **significant technical debt** in the form of abandoned legacy tournament flow code that should be removed. The presence of two coexisting flows creates cognitive overhead and maintenance burden.

**Key priorities**:
1. Remove legacy flow completely
2. Consolidate duplicated movement logic  
3. Fix type safety in adapters
4. Restore abstraction boundaries by removing repository exposure
5. Add comprehensive integration tests

With these improvements, the architecture would score **7-8/10** and become significantly more maintainable.
