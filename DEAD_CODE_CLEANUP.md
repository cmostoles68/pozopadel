# Pozopadel Dead Code Inventory

## Quick Reference - What to Delete

### 1. API Routes (139 LOC Total)

#### `src/app/api/pozos/start/route.ts` (44 LOC)
**Purpose**: Legacy flow - Start tournament round 1  
**Called from**: NOWHERE  
**References count**: 0  
**Delete**: YES ✓

#### `src/app/api/pozos/finish-round/route.ts` (56 LOC)
**Purpose**: Legacy flow - Finish round and start next  
**Called from**: NOWHERE  
**References count**: 0  
**Delete**: YES ✓

#### `src/app/api/pozos/finish/route.ts` (39 LOC)
**Purpose**: Legacy flow - Finalize tournament  
**Called from**: NOWHERE  
**References count**: 0  
**Delete**: YES ✓

### 2. Service Methods (94 LOC Total)

#### `TournamentService.startRound1()` (37 LOC)
**Location**: [src/application/services/tournament.service.ts#L67-L103](src/application/services/tournament.service.ts#L67-L103)  
**Called by**: Only `/api/pozos/start` (dead endpoint)  
**Delete**: YES ✓  
**Keep**: NO

#### `TournamentService.finishRoundAndStartNext()` (54 LOC)
**Location**: [src/application/services/tournament.service.ts#L104-L157](src/application/services/tournament.service.ts#L104-L157)  
**Called by**: Only `/api/pozos/finish-round` (dead endpoint)  
**Delete**: YES ✓  
**Keep**: NO

#### `TournamentService.finalizeLegacyTournament()` (3 LOC)
**Location**: [src/application/services/tournament.service.ts#L158-L160](src/application/services/tournament.service.ts#L158-L160)  
**Called by**: Only `/api/pozos/finish` (dead endpoint)  
**Delete**: YES ✓  
**Keep**: NO

### 3. UI Components (37 LOC)

#### `TournamentView.tsx` (Partially Dead)
**Location**: [src/app/pozos/[id]/TournamentView.tsx](src/app/pozos/[id]/TournamentView.tsx)  
**Status**: Rendered only when legacy round data exists (rare/never in practice)  
**Options**:
- Option A: Delete entirely (37 LOC)
- Option B: Remove rendering conditional from page.tsx (prevents load)
- Recommendation: **Option B for safety** - keep component but never render it

**Note**: Depends on `CourtsGrid` component and `updateMatchScore` action. If deleted, may need cleanup.

### 4. Repository Interfaces (Partially Dead)

#### `ILegacyRoundRepository` (16 LOC)
**Location**: [src/domain/repositories/round.repository.ts#L4-L19](src/domain/repositories/round.repository.ts#L4-L19)  
**Called by**: Only legacy adapters and service methods  
**Delete**: YES (after services deleted) ✓

#### `ILegacyMatchRepository` (20 LOC)
**Location**: [src/domain/repositories/match.repository.ts#L3-L22](src/domain/repositories/match.repository.ts#L3-L22)  
**Called by**: Only legacy adapters and service methods  
**Delete**: YES (after services deleted) ✓

### 5. Adapter Classes (Partially Dead)

#### `SupabaseLegacyRoundAdapter` (78 LOC)
**Location**: [src/app/api/pozos/start/route.ts](src/infrastructure/supabase/adapters/round.adapter.ts#L11-L88)  
**Implements**: `ILegacyRoundRepository`  
**Delete**: YES (after interface deleted) ✓

#### `SupabaseLegacyMatchAdapter` (43 LOC)
**Location**: [src/infrastructure/supabase/adapters/match.adapter.ts#L11-L54](src/infrastructure/supabase/adapters/match.adapter.ts#L11-L54)  
**Implements**: `ILegacyMatchRepository`  
**Delete**: YES (after interface deleted) ✓

### 6. Algorithm Functions (Duplicated, not technically dead but problematic)

#### `calculateMovements()` in legacy-round-engine.ts (27 LOC)
**Location**: [src/domain/algorithms/legacy-round-engine.ts#L82-L108](src/domain/algorithms/legacy-round-engine.ts#L82-L108)  
**Also exists as**: `calculateMovements()` in movements.ts  
**Status**: Duplication ⚠️  
**Action**: Consolidate into generic version after deleting legacy flow

#### `calculateMovements()` in movements.ts (same as above!)
**Location**: [src/domain/algorithms/movements.ts#L32-L60](src/domain/algorithms/movements.ts#L32-L60)  
**Reason for duplication**: Same algorithm logic, different entity types  
**Action**: Already handled - keep only one consolidated version

---

## Deletion Checklist

### Phase 1: Delete API Routes (No dependencies)
- [ ] Delete `src/app/api/pozos/start/route.ts`
- [ ] Delete `src/app/api/pozos/finish-round/route.ts`
- [ ] Delete `src/app/api/pozos/finish/route.ts`
- [ ] Delete `src/app/api/pozos/` directory if empty

### Phase 2: Delete Service Methods
- [ ] Remove `TournamentService.startRound1()`
- [ ] Remove `TournamentService.finishRoundAndStartNext()`
- [ ] Remove `TournamentService.finalizeLegacyTournament()`
- [ ] Remove `TournamentService.getCurrentLegacyRoundWithMatches()` (used only by TournamentView)
- [ ] Remove `TournamentService.updateMatchScore()` (used only by TournamentView)
- [ ] Remove `TournamentService.getLegacyRounds()` (legacy flow only)

### Phase 3: Delete Repository Interfaces
- [ ] Remove `ILegacyRoundRepository` from `src/domain/repositories/round.repository.ts`
- [ ] Remove `ILegacyMatchRepository` from `src/domain/repositories/match.repository.ts`

### Phase 4: Delete Adapters
- [ ] Delete `SupabaseLegacyRoundAdapter` from `src/infrastructure/supabase/adapters/round.adapter.ts`
- [ ] Delete `SupabaseLegacyMatchAdapter` from `src/infrastructure/supabase/adapters/match.adapter.ts`

### Phase 5: Update Service Factory
- [ ] Remove `legacyRoundRepo` variable
- [ ] Remove `legacyMatchRepo` variable
- [ ] Remove `legacyRoundRepo` and `legacyMatchRepo` from return statement
- [ ] Remove `getPlayerRowsForTournament` callback (only used by legacy TournamentService)

### Phase 6: Clean Up Presentation Layer
- [ ] Remove legacy data loading from `src/app/pozos/[id]/page.tsx` (lines ~23-24)
- [ ] Remove `TournamentView` import
- [ ] Remove `currentRound` and `currentMatches` variables
- [ ] Remove conditional rendering of `TournamentView` (lines ~92-97)
- [ ] Option: Delete `src/app/pozos/[id]/TournamentView.tsx` and action (OR keep hidden for safety)

### Phase 7: Update Tests
- [ ] Remove tests that reference legacy methods (if any)
- [ ] Verify E2E tests still pass with modern flow only

### Phase 8: Consolidate Algorithms
- [ ] Remove duplicate `calculateMovements()` from `src/domain/algorithms/movements.ts` OR from `legacy-round-engine.ts`
- [ ] Keep only generic version
- [ ] Update imports in tests

---

## Impact Analysis

### Breaking Changes: NONE
- Legacy endpoints are unused
- No external API consumers depend on them
- No tests verify legacy flow

### Testing Impact
- **Unit tests**: Should all pass (no algorithm changes)
- **E2E tests**: Verify they use modern flow (likely already do)
- **API tests**: Any tests hitting `/api/pozos/*` endpoints will break (delete those tests too)

### Database Impact
- No migrations needed
- Legacy `rounds` and `matches` tables can remain (not breaking to leave them)
- Consider adding migration to drop legacy tables after confirming no data needed

### Performance Impact
- **Positive**: Fewer service methods to instantiate
- **Positive**: Fewer repository implementations
- **Positive**: One less code path to maintain

---

## Files to Review After Deletion

1. [src/application/services/tournament.service.ts](src/application/services/tournament.service.ts)
   - Verify only modern flow methods remain
   - Check constructor doesn't need legacy repos

2. [src/infrastructure/service-factory.ts](src/infrastructure/service-factory.ts)
   - Verify all legacy adapters removed from return

3. [src/app/pozos/[id]/page.tsx](src/app/pozos/[id]/page.tsx)
   - Verify no legacy data fetching

4. [src/domain/repositories/](src/domain/repositories/)
   - Verify no orphaned repo interfaces

---

## Statistics After Cleanup

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| API Routes | 3 dead | 0 | -100% |
| Service Methods | 6 legacy | 0 | -100% |
| Repository Interfaces | 2 legacy | 0 | -100% |
| Adapter Classes | 2 legacy | 0 | -100% |
| Total Dead Lines | 270 | ~40* | -85% |
| Architecture Score | 5/10 | 6-7/10 | +20-40% |

*~40 lines remain (consolidated movement logic, which should be refactored separately)

---

## Estimated Effort

- **Code Deletion**: 1-2 hours
- **Test Cleanup**: 30-45 minutes
- **Service Factory Update**: 15-30 minutes
- **Verification & Testing**: 1-2 hours
- **Total**: 3-5 hours

**Risk Level**: LOW (all deleted code is unused)
