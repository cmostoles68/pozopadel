# Motores de torneo — estado y plan de migración

## Situación actual

El proyecto gestiona los **pozos de pádel** mediante **dos motores de torneo que coexisten** y cubren la misma lógica (generación de rondas, asignación de pistas, avance de ronda, campeón):

### 1. Flujo **legacy** (motor `legacy-round-engine.ts`)

- Tablas: `tournament_players`, `rounds`, `matches`.
- Algoritmos: `generateRound1`, `generateNextRound`, `calculateMovements` (en `domain/algorithms/legacy-round-engine.ts` y `movements.ts`).
- Servicios: `TournamentService.startRound1 / finishRoundAndStartNext / finalizeLegacyTournament / getCurrentLegacyRoundWithMatches / getLegacyRounds`.
- UI: `TournamentView` + `CourtsGrid` (render que aún aparece bajo la página de detalle `/pozos/[id]`), y la vista `/pozos/[id]/admin`.
- **Uso real hoy:** las **API routes** (`/api/pozos/start`, `/api/pozos/finish-round`, `/api/pozos/finish`) delegan en el motor legacy, y la vista admin lee rondas/partidos legacy.

### 2. Flujo **pozo moderno** (motor `round-engine.ts`)

- Tablas: `drawn_pairs`, `tournament_drawn_pairs`, `pozo_rounds`, `pozo_round_pairs`, `pozo_match_history`, `champion`.
- Algoritmos: `pairPlayers`, `shuffleArray` (en `domain/algorithms/draw.ts`) y el motor de rondas del pozo.
- Servicios: `DrawService` y `RoundService`.
- UI: `PairSelector` + `CourtScoring` (marcador en vivo por pista, ranking en vivo, campeón) — **flujo protagonista de la aplicación**.

## Problema

La UI principal (`/pozos/[id]`) usa el flujo moderno (`CourtScoring`), pero las API routes y parte del backend siguen sobre el flujo legacy. Resultado:

- Dos caminos de escritura para la misma operación ("arrancar pozo", "cerrar ronda").
- Duplicación de algoritmos, DTOs, adaptadores y tablas.
- La página de detalle puede **renderizar dos veces** la competición (moderna + legacy) durante la transición.

## Plan de migración (hacia el motor moderno único)

1. **Reescribir las API routes sobre el motor moderno**: `/api/pozos/start` → usar `DrawService`/`RoundService` en lugar de `startRound1`; `/api/pozos/finish-round` → usar `RoundService.checkAndStartNextRound`; `/api/pozos/finish` → `finalizePozo`.
2. **Migrar la vista `/pozos/[id]/admin`** para leer `pozo_rounds`/`pozo_round_pairs` en lugar de `rounds`/`matches` legacy.
3. **Retirar el render legacy de `/pozos/[id]`** (bloque `TournamentView`) una vez la API route esté sobre el motor pozo.
4. **Migrar los tests** de `pozo-engine.unit.spec.ts` (que hoy prueban `generateRound1`) a los algoritmos del motor moderno.
5. **Eliminar** el código legacy: `legacy-round-engine.ts`, métodos legacy de `TournamentService`, adaptadores `LegacyRound`/`LegacyMatch`, `TournamentView`, `CourtsGrid` (o reconvertir), y las tablas `tournament_players`, `rounds`, `matches` (con su migración de borrado).

> ⚠️ Pendiente de decisión: ejecutar este plan (refactor destructivo de medio plazo) o mantener la deuda documentada en una primera iteración.
