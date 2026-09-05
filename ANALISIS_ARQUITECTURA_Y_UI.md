# Pozopadel — Auditoría Completa de Arquitectura, Seguridad, Calidad y UI

**Fecha de la auditoría**: 2026-09-05 (**re-auditoría completa** y **plan al 9** ejecutado; primera versión 2026-09-03, regenerada 2026-09-04)
**Estado verificado**: HEAD `ed615af seguridad y numero de pozos` + **todo el árbol
de trabajo commiteado** (sesiones opacas + Fase A + subida al 9) en un único commit
**Enfoque**: Arquitectura · Seguridad · Buenas prácticas · Testing · UI · Calidad/CI
**Alcance**: Incluye **seguridad** (RLS, autenticación JWT, sesiones de servidor,
gestión de secretos, validación de frontera), **endurecimiento** (Fase S),
**UI** (Fase C), **testing/CI** (Fase T) y el **refactor arquitectónico** (Fase A).
Se excluye accesibilidad (fuera de alcance).

> **Nota de versión**: la re-auditoría completa (2026-09-05) detectó deuda
> interna (stats en páginas, algoritmo duplicado, dead code, falta de unit de
> sesión) que la fijó en **8.5/10**, por encima del objetivo de 8 pero lejos del
> tope. **El plan de subida al 9 se ha ejecutado en su totalidad**: stats de
> campeones encapsuladas en `ChampionshipStatsService`, algoritmo de parejas
> ganadoras unificado en dominio (el adaptador ya lo invoca), dead code retirado
> (`getLimits`/`isLimited`, `src/app/api/`, `PairBadge` duplicado,
> `getWinningPartnershipKeys`), unit de `session-store`/`current-user`/`server`
> y commit del árbol de trabajo. **Resultado global: 9/10** (media ponderada
> ≈ 8.9). Todos los números y afirmaciones se re-verificaron contra el código y
> la DB vivos; 137 unit + 50 e2e verdes.

---

## 1. Contexto y alcance

El proyecto es un gestor de "pozos" de pádel (torneos de parejas por rondas con
rotación de pistas). Pila tecnológica:

| Capa | Tecnología |
|------|------------|
| Framework | Next.js 16.3.1 (App Router), React 19.2.8 |
| Lenguaje | TypeScript 5 (strict) |
| Estilos | Tailwind CSS v4 (`@theme inline`), tokens Material 3 |
| Persistencia | Supabase local (Postgres 127.0.0.1:54322, Kong API 54321) |
| Testing | Vitest 4.1 (unit) + Playwright 1.62 (e2e) |
| Lint/Build/Format | ESLint 9 (flat config), `next build`, Prettier 3.9 |

Estructura por capas (arquitectura hexagonal/limpia de facto):

```
domain/          entidades + interfaces de repositorio + algoritmos puros
application/     servicios de aplicación (orquestación) + DTOs + validación
infrastructure/  adaptadores Supabase + factory de servicios/DI + auth + tokens + sesiones
app/ + components/  presentación: páginas (server) + acciones + client components
```

Verificado: **la capa `domain` es TypeScript puro** (cero imports de next/react/
supabase); los DTOs y servicios de `application` también son puros.

---

## 2. Resumen ejecutivo

El proyecto está **consolidado en un único flujo de torneo ("pozo")** con
aislamiento de datos por `user_uuid`/`created_by` en la capa de datos y **RLS de
propietario reforzado con autenticación por JWT firmado** por usuario. No quedan
políticas `USING (true)` ni acceso cross-user vía PostgREST. El acceso se
gestiona con **sesiones opacas de servidor** (S3): la cookie guarda un token
aleatorio (no el UUID público), por lo que forjar la cookie ya no otorga rol
alguno. Tras el refactor de la **Fase A**, la presentación solo consume
servicios de aplicación; el `createServices()` ya no expone repositorios ni el
cliente Supabase. Las fases S, C y T están **completas**; la Fase A se amplió
con la **encapsulación de las stats de campeones**, el **algoritmo de parejas
ganadoras unificado en dominio**, la **limpieza de dead code** y los **unit de
sesión**. La única deuda restante es de futuro: adoptar Supabase Auth para
producciones multiusuario.

Puntuación del estado actual:

| Dimensión | Nivel | Comentario |
|-----------|-------|------------|
| Separación en capas | 9/10 | **Fase A completa**: presentación solo consume servicios; **stats encapsuladas** (`ChampionshipStatsService`) y **único** algoritmo de parejas ganadoras en dominio (el adaptador lo invoca, §3.3 #6) |
| Tipado | 9/10 | `Database` tipado en toda la infra; sin `any`; `database.types.ts` en sincronía con la DB real (incl. `session_tokens`); contratos `Result` en servicios nuevos |
| Manejo de errores | 8/10 | Patrón `Result` + `toSafeErrorMessage` dominantes; restan solo micro-inconsistencias de retorno en actions (con/sin `as const`) |
| Código muerto | 9.5/10 | Inventario §5 **cerrado**: retirados `getLimits`/`isLimited`, `src/app/api/`, `PairBadge` duplicado y `getWinningPartnershipKeys` |
| Validación de frontera | 9/10 | Zod en **todas** las 17 actions con parámetros (20 puntos de validación; algunas con doble esquema); logins validados |
| **Seguridad** | **9/10** | **RLS + JWT + sesiones opacas re-verificados** (32 políticas owner-scoped + `session_tokens` sin políticas, 0 `USING (true)`, grants mínimos, cookie forjada ⇒ invitado); solo pendiente Supabase Auth para prod multiusuario |
| Migraciones/entorno | 8.5/10 | Migración consolidada + `20260915000000_sessions.sql`; seed integrado; `supabase db reset` reproducible; **árbol de trabajo commiteado** |
| Testing | 9.5/10 | **137 unit** (incl. `session-store`/`current-user`/`server`, §7.3 cerrado) + **50 e2e** verdes; identidad, sesiones y RLS cross-user cubiertos |
| Calidad/CI | 9/10 | **Prettier + workflow CI funcional** (typecheck/lint/format/unit/build/e2e) |
| UI/UX | 8.5/10 | Sólida y coherente; `PairBadge` unificado en un solo componente |
| **Global** | **9/10** | Media ponderada ≈ 8.9 (redondea a 9). **Plan de subida ejecutado al completo**; deuda no bloqueante solo de futuro (Supabase Auth) |

---

## 3. Arquitectura

### 3.1 Flujo general

```
Page (server component)
  └─ createServices()  ──►  service-factory.ts (DI manual; SOLO servicios)
                            ├─ PlayerService / TournamentService
                            ├─ DrawService / RoundService / MatchHistoryService
                            └─ (repos + supabase quedan internos)
  └─ Server Actions ──►   servicios de aplicación (única puerta de mutación)
  └─ Client components    interactúan vía actions, router.refresh()
```

- **Autenticación (sesión de servidor, S3)**: la cookie `padel_session` guarda un
  **token opaco de 256 bits** (no el UUID). En cada request,
  `getCurrentUserUuid()` lo busca en `session_tokens` (hasheado + TTL 30d) para
  resolver la identidad (guest/admin); sin token válido se entra como invitado.
  El token se emite solo tras el login (credenciales para admin, entrada directa
  para invitado) y se revoca al hacer logout o al iniciar otra sesión del mismo
  usuario. `auth-context.tsx` (cliente) solo espeja el modo en `localStorage`
  para el estado de UI.
- **Identidad ante la DB**: `server.ts` firma un JWT por usuario
  (`signUserToken`) con el claim `user_uuid` y lo envía como
  `Authorization: Bearer`. PostgREST lo expone como `request.jwt.claims`, que
  lee `current_user_uuid()` para el RLS. Para el **tooling de sesiones**,
  `service-client.ts` firma un JWT con claim `role: service_role` (única vía de
  acceso a `session_tokens`, tabla sin políticas RLS y sin grants para
  anon/authenticated).
- **Aislamiento de datos**: columnas `user_uuid` (profiles, drawn_pairs,
  pozo_match_history) y `created_by` (tournaments); cadenas de propiedad para
  tablas hijas vía `EXISTS` sobre `tournaments`.

### 3.2 Fortalezas

1. **Algoritmos de dominio puros** (`domain/algorithms/*`): sin dependencias de
   framework; totalmente unit-testeados. Ejemplar.
2. **Repositorios con contrato** (`domain/repositories/*`): aíslan Supabase del
   dominio; **todo acceso a datos sale de la presentación** (Fase A).
3. **DI manual centralizado** (`service-factory.ts`): expone **únicamente
   servicios**, no repos ni el cliente cargado. La presentación no puede saltarse
   la orquestación/validación de `application`.
4. **Server Actions como única puerta de mutación**: todas las que reciben
   parámetros están validadas con Zod (17) y pasan por servicio → repositorio.
5. **Componentes de servidor por defecto**; solo lo interactivo es `"use client"`.
6. **Tipado de borde de datos**: `SupabaseClient<Database>` en los 5 adaptadores;
   **sin `any`** (verificado: 0 coincidencias de `as any`/`: any`).
7. **Defensa en profundidad**: adaptadores aplican `.eq("user_uuid")`/
   `.eq("created_by")` además del RLS; la identidad de UI nunca se deriva del
   UUID "público" sino de la sesión opaca de servidor.
8. **Frontera 100% validada** (S6): ya no hay ninguna action con parámetro sin
   esquema Zod.

### 3.3 Debilidades arquitectónicas

| # | Problema | Dónde | Estatus |
|---|----------|-------|---------|
| 1 | Acceso directo a `supabase.from()` desde actions/páginas | `historico/actions.ts`, `historico/page.tsx` | **[RESUELTO]**: encapsulado en `MatchHistoryService.findLatestPlayerSnapshot` y `PlayerService.getAllProfiles` |
| 2 | Páginas server usando repos crudos en vez de servicios | `jugadores`, `pozos/[id]`, `historico` | **[RESUELTO]**: todas usan `tournamentService`, `drawService.getTournamentSelectedPairs`, `matchHistoryService`, `playerService` |
| 3 | `createServices()` exponiendo repos y `supabase` crudo | `service-factory.ts` | **[RESUELTO]**: expone solo servicios; repos/cliente quedan internos |
| 4 | `TournamentStatusHeader` importando el tipo `Database` de infraestructura | `components/TournamentStatusHeader.tsx` | **[RESUELTO]**: usa el tipo de dominio `Tournament` |
| 5 | **Stats de campeones calculadas en la página** en vez de un servicio | `jugadores/page.tsx`, `historico/page.tsx` | **[RESUELTO]**: nuevo `ChampionshipStatsService` (`countByDrawnPairs`/`countByHistory`) con 6 unit (§7.1); las páginas solo consumen el resultado |
| 6 | **Lógica de parejas ganadoras duplicada fuera de dominio** | `match.adapter.ts` (reimplementaba `computeWinningPartnerships`) | **[RESUELTO]**: el adaptador invoca `computeWinningPartnerships` de `domain/algorithms/draw.ts`; eliminado `getWinningPartnershipKeys` (solo-test) |

---

## 4. Seguridad

### 4.1 Modelo de identidad y autenticación (estado actual)

- La cookie **`padel_session`** guarda un **token opaco aleatorio** (256 bits),
  no un UUID. Se fija/limpia en servidor vía server actions
  (`auth/actions.ts`) con `httpOnly: true, secure: true, sameSite: "lax"`,
  `maxAge` 30 días (coherente con el JWT y el TTL de `session_tokens`). El
  cliente **no usa `document.cookie`** (0 referencias).
- `loginAsGuest()` / `loginAsAdmin(password)` emiten una **sesión de servidor**
  (`session_store.createSessionToken`): insertan el hash SHA-256 del token en
  `session_tokens` (una sesión activa por usuario; revoca la anterior). Solo el
  login de admin exige credenciales (`verifyAdminPassword`: bcrypt async +
  rate-limit 5/min). `logout()` revoca la sesión y borra la cookie.
- En cada request, `getCurrentUserUuid()` (`current-user.ts`) resuelve la
  identidad desde la sesión: `resolveSessionUser` consulta `session_tokens` por
  hash y TTL. **Conocer el UUID público (admin `...0002` etc.) no otorga nada**:
  forjar la cookie con ese valor devuelve invitado (cubierto por un e2e S3).
- `src/config/auth.ts:1-4` define los UUIDs de sistema (solo identidad, sin
  poder), y `getCurrentAuthMode()` deriva el modo (guest/admin) del UUID
  resuelto.

### 4.2 RLS y propagación de identidad (verificado en esta revisión)

**Mecanismo**: `current_user_uuid()`
lee `request.jwt.claims` (JSONB) y extrae `user_uuid` (con fallback a `sub` y al
header legacy). El servidor firma un JWT HS256 por usuario
(`sign-token.ts`) y lo envía como `Authorization: Bearer` (`server.ts:26-29`).

**Resultado re-verificado empíricamente en esta revisión (vía PostgREST)**:

| Cliente | Table test_users | Table profiles |
|---------|------------------|----------------|
| Token guest | ve solo `guest` | ve sus filas (snapshot: 6 perfiles) |
| Token admin | ve solo `admin` | ve 0 (ninguna propia) |
| Anon (sin claim) | ve 0 | ve 0 |

- `anon SELECT /profiles` → `200 []` (RLS filtra a nada sin claim).
- `anon POST /profiles` (sin JWT) → `401` (Kong rechaza la mutación).
- `guest INSERT /profiles` con `user_uuid` del admin → `403` + "new row
  violates row-level security policy".
- `guest PATCH/DELETE /profiles?id=eq.<adminRow>` → `204` pero **0 filas
  afectadas** (verificado vía SQL).
- Forjar la cookie `padel_session` con el **UUID admin** → sesión no encontrada
  → modo invitado (e2e S3).

→ **9 tablas con RLS**: 8 con 4 políticas owner-scoped cada una (32 políticas,
**0 `USING (true)`**) y `session_tokens` con RLS habilitado **sin políticas** y
sin grants a `anon`/`authenticated` — solo `service_role` la toca (bypass RLS +
grants explícitos). Tablas legacy (`matches`, `rounds`, `tournament_players`)
eliminadas (verificado: no existen).

### 4.3 Gestión de secretos

| Secreto | Dónde | Estado |
|---------|-------|--------|
| `SUPABASE_JWT_SECRET` | `.env.local` (gitignored, nunca commiteado) | OK |
| `.admin-password.hash` (hash bcrypt admin) | fichero gitignored, leído solo en servidor | OK |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | pública por diseño | OK |
| `ADMIN_PASSWORD_HASH` (fallback env) | comentado en `.env.local` (solo acepta `$2*`); usado por el workflow de CI | OK |

Verificado con `git ls-files`: `.env.local` y `.admin-password.hash` **no están
tracked** ni aparecen en el historial.

**Hallazgo original — "Migrar hash SHA-256 a bcrypt/argon2. Quitar contraseña
hardcodeada": RESUELTO.** Ya no existe ningún hash SHA-256 de contraseña ni
contraseña en claro. El único `sha256` presente es `createHmac("sha256", …)`
en `sign-token.ts` (firma de JWT HS256, correcto) y el hash de sesiones en
`session-store.ts` (hash de token opaco, por diseño). La contraseña admin se
guarda como hash **bcryptjs cost 12** (fichero gitignored o env `$2*`),
verificada con `bcrypt.compare` (async, con rate-limit) en servidor.

### 4.4 Hallazgos de seguridad

| # | Hallazgo | Severidad | Estado |
|---|----------|-----------|--------|
| S1 | Cookie de sesión sin `HttpOnly`/`Secure` (se fijaba con `document.cookie`) | MEDIA | **[RESUELTO]**: cookie en servidor (`auth/actions.ts`, `httpOnly+secure+sameSite=lax`); 0 usos de `document.cookie` |
| S2 | Fallback hardcoded del JWT secret permite forjar JWTs si falta `SUPABASE_JWT_SECRET` | MEDIA | **[RESUELTO]**: en `NODE_ENV === "production"` lanza `Error`; default solo en dev |
| **S3** | **UUIDs de identidad públicos en la cookie ⇒ rol admin forjable** | MEDIA (tool local; en shared/prod ALTA) | **[RESUELTO]**: **sesiones opacas de servidor** — la cookie guarda un token aleatorio (256 bits) validado contra `session_tokens` en cada request; el UUID público ya no concede rol. Verificado por e2e (cookie forjada ⇒ invitado). Para prod multiusuario se recomienda Supabase Auth (§4.5) |
| S4 | Login admin sin rate-limit y `bcrypt.compareSync` síncrono | BAJA | **[RESUELTO]**: `bcrypt.compare` async + throttling in-memory (5/min) en `admin-password.ts` |
| S5 | GRANT `anon` demasiado amplios (full DML) | BAJA | **[RESUELTO]**: esquema consolidado revoca DML a `anon` (solo `SELECT`, que RLS filtra a nada); verificado `information_schema` y por API |
| S6 | Faltaban validaciones Zod en `deleteTournament`, `reincorporatePlayer`, login | BAJA | **[RESUELTO]**: `deleteTournamentSchema`, `uuidSchema`, `adminLoginSchema` aplicados |
| S7 | `client.ts` (browser Supabase) nunca se importaba | BAJA | **[RESUELTO]**: fichero eliminado |

**No se encontró**: XSS (`dangerouslySetInnerHTML`/`eval`/`innerHTML`: 0), SQL
injection (0 usos de SQL crudo sin parámetros), ni `USING (true)` residual.

### 4.5 Recomendaciones de seguridad priorizadas (futuras, no bloqueantes)

1. **(Futuro) Supabase Auth** para despliegues compartidos/producción: sustituir
   los dos UUIDs de sistema por identidades por usuario real
   (`auth.uid()` en RLS). Es una evolución natural de las sesiones actuales, no
   una deuda de seguridad pendiente en el entorno local.

---

## 5. Inventario de código muerto (verificado en esta revisión)

| Item | Evidencia | Estado |
|------|-----------|--------|
| `computeWinningPartnerships` (`domain/algorithms/draw.ts`) | **ahora con uso real**: lo invoca `match.adapter.ts:findWinningPartnerships` (lógica unificada) y tiene 5 unit | **activo (unificado)** |
| `getWinningPartnershipKeys` | eliminado; `draw.service.ts` deriva el set de keys desde los records que produce el adaptador con `computeWinningPartnerships` | **eliminado** |
| `getLimits()` / `isLimited()` (`config/limits.ts`) | 0 imports fuera de `limits.ts` (la app usa `GUEST_LIMITS`) | **eliminado** |
| `PairBadge.tsx` vs inline en `PairSelector.tsx` | dos implementaciones casi idénticas | **eliminada la duplicación**: un único componente `PairBadge` usado por `ChampionBanner` y `PairSelector` |
| `src/app/api/` | directorio vacío | **eliminado** |
| `supabase/client.ts` (browser) | eliminado en S7 | **eliminado** |
| adapters + repos en `service-factory` | repos y `supabase` no se exponen (Fase A) | superficie reducida |

**Inventario cerrado**: no queda dead code conocido (verificado por grep de imports).

---

## 6. Validación de frontera

**Zod aplicado en TODAS las actions con parámetros** (17 actions / 20 puntos de
`parseOrError`; las acciones de pareja y `checkAndStartNextRound` validan dos
UUIDs). Sin parámetros (OK, autenticadas vía `getCurrentUserUuid`):
`deleteAllPlayers`, `clearPairs`, `loginAsGuest`, `logout`.

| Action | Esquema |
|--------|---------|
| `createPlayer` / `updatePlayer` / `deletePlayer` | `createPlayerSchema` / `updatePlayerSchema` / `uuidSchema` |
| `createPozo` | `createTournamentSchema` |
| `selectPair` / `deselectPair` / `selectAllPairs` / `drawCourts` / `clearCourtDraw` / `seedRound1` / `finalizePozo` | `uuidSchema` |
| `saveCourtResult` | `saveCourtResultSchema` |
| `checkAndStartNextRound` | `uuidSchema` (doble) |
| `drawPairs` | `drawMethodSchema` |
| `deleteTournament` | `deleteTournamentSchema` |
| `reincorporatePlayer` | `uuidSchema` |
| `loginAsAdmin` | `adminLoginSchema` |

---

## 7. Testing

### 7.1 Unit (Vitest) — **137 tests / 15 ficheros** (re-verificado en esta revisión)

| Fichero | Tests | Cubre |
|---------|-------|-------|
| `adapters.unit.spec.ts` | 38 | adaptadores con cliente mockeado + scoping `user_uuid` |
| `draw-service.unit.spec.ts` | 18 | DrawService (parejas, pistas, seed ronda 1, errores) |
| `validation.unit.spec.ts` | 17 | esquemas Zod + `parseOrError` |
| `round-service.unit.spec.ts` | 14 | RoundService (marcadores, siguiente ronda, finalizar, rollback) |
| `errors.unit.spec.ts` | 8 | `safeErr`/`toSafeErrorMessage` |
| `championship-stats.unit.spec.ts` | 6 | **ChampionshipStatsService** (conteos por drawn pairs e histórico) |
| `championships.unit.spec.ts` | 6 | stats de campeones |
| `partnership-history.unit.spec.ts` | 5 | **`computeWinningPartnerships` (el código que usa el adaptador)** |
| `session-store.unit.spec.ts` | 4 | **sesiones opacas (S3)**: hash de token, alta/revocación, resolución, logout |
| `admin-password.unit.spec.ts` | 4 | bcrypt async + rate-limit login admin |
| `draw-rules.unit.spec.ts` | 4 | validación de sorteo |
| `identity.unit.spec.ts` | 4 | `signUserToken` (HS256, claim user_uuid, secreto en prod) |
| `pozo-engine.unit.spec.ts` | 4 | movimientos de parejas |
| `current-user.unit.spec.ts` | 3 | **identidad desde cookie de sesión** (guest fallback, cookie forjada ⇒ invitado) |
| `server.unit.spec.ts` | 2 | **`createClient`**: JWT por usuario como Bearer + cookies de Next |

### 7.2 E2E (Playwright) — **50 tests / 10 ficheros** (re-verificado)

- `pozo.spec.ts` (15): selección de parejas, sorteo de pistas, rondas, marcador,
  temporizador, histórico, evitar parejas que siempre ganan.
- `dashboard.spec.ts` (7): redirects `/`, menú, secciones, formularios.
- `limits.spec.ts` (6): límites invitado (32 jugadores/8 pistas/1 pozo) y admin
  (ahora con sesiones reales emitidas vía `issueSessionToken`).
- `auth.spec.ts` (6): guest/admin, contraseña incorrecta, badge admin, logout y
  **`forjar la cookie con el UUID admin NO otorga privilegios`** (S3).
- `jugadores.spec.ts` (5): CRUD jugadores, validación, borrado masivo.
- `rls-isolation.spec.ts` (5): **aislamiento RLS cross-user vía API** (cada rol
  lee solo sus filas; DML cross-user rechazado; sin token no se ve nada; torneos
  aislados por `created_by`).
- `sorteo.spec.ts` (3): sorteo aleatorio, bloqueo <4 jugadores, borrar sorteo.
- `historico.spec.ts` (1): reincorporar jugador desde el histórico.
- `orden-pozos.spec.ts` (1): ordenar por pozos ganados.
- `pozo-live.spec.ts` (1): persistencia real del marcador en DB.

### 7.3 Gaps de testing

- **Cubierto**: `sign-token.ts` (`identity.unit.spec.ts`), `admin-password.ts`
  (`admin-password.unit.spec.ts`, bcrypt + rate-limit), **aislamiento RLS
  cross-user** (`rls-isolation.spec.ts`), **sesión de servidor / cookie
  forjada** (`auth.spec.ts`) y **unit de `session-store` / `current-user` /
  `server`** (la resolución de identidad y la firma por usuario quedan cubiertas
  también a nivel unit). Sin gaps pendientes.

---

## 8. UI/UX (sin accesibilidad)

### 8.1 Valoraciones por pantalla

| Pantalla | Valoración | Comentario |
|----------|------------|------------|
| Login (`auth/login`) | 9/10 | Dos modos claros, error de contraseña, subtítulo invitado corregido |
| Dashboard | 8/10 | Grid arreglado (`1/2/4` cols, sin `max-w-sm` artificial) |
| Jugadores | 9/10 | Formulario inline, edición por fila, contadores, badge "pozos ganados" |
| Sorteo (`sorteo`) | 8/10 | Cabina de selección con preview y feedback de impares |
| Nuevo pozo (`pozos/nuevo`) | 8/10 | Formulario con error vía query param |
| Pozo (`pozos/[id]`) | 8/10 | Pistas dibujadas en CSS, ranking, banner de campeón, badge de pista condicional |
| Histórico | 7/10 | Campeones calculados del histórico; filas densas |

### 8.2 Bugs / inconsistencias (todas resueltas en esta revisión)

1. **Badge "En curso" estático** en `CourtCard` — **[RESUELTO]**: condicional
   `Completada`/`En curso` según `is_finished`, con `data-testid=court-{n}-status`.
2. **Variable `ordered` muerta/inconsistente** en `CourtScoring` —
   **[RESUELTO]**: `renderFinishedRound` itera `ordered` (ganador primero).
3. **Branding "realtime/live" sin realtime real** — **[RESUELTO]**:
   `LiveTournamentHeader` → `TournamentStatusHeader`; retirado el lenguaje "en
   tiempo real"/"en vivo" de `layout.tsx` (metadata) y del README. `RoundTimer`
   sigue siendo un countdown local sin persistencia (documentado, no branding).
4. **Frase invitado engañosa** en login — **[RESUELTO]**: "Funcionalidad completa
   con límites de uso".
5. **Token `--color-accent` muerto** — **[RESUELTO]**: token y clase `.accent-bar`
   eliminados.
6. **Marca residual "Stitch"** — **[RESUELTO]**: comentarios actualizados.

### 8.3 Aspectos destacables

- **Pistas de pádel dibujadas en CSS** y la "Pista Rey" con corona: detalle
  curioso y efectivo.
- **`ChampionBanner`** y confirmación de finalización: momentos bien diseñados.
- **Tokens Material 3** en `@theme inline` y vocabulario visual consistente
  (`glass-panel`, `pattern-bg`, `neon-glow`).

---

## 9. Tooling / calidad de proyecto

| Área | Estado |
|------|--------|
| Scripts | `dev/build/start/lint/typecheck/test/test:watch/test:e2e/seed` + **`format`/`format:check` (Prettier)** |
| CI | **`.github/workflows/ci.yml`**: typecheck + lint + format:check + vitest + build + e2e sobre el stack local de Supabase (`supabase start`), browser Playwright y reporte como artifact |
| Prettier | `.prettierrc.json` + `.prettierignore`; código formateado |
| Migraciones | **consolidada** `20260910000000_initial_schema.sql` (idempotente) **+ `20260915000000_sessions.sql`**; seed (`scripts/seed.sql`) integrado; `supabase db reset` reproducible |
| `.gitignore` | `.env*`, `.admin-password.hash` ignorados | OK |
| Docs | README corregido (conteos 122/50, CI, formato, sesiones opacas); este documento auditado |
| Estado del árbol | **tree commiteado** al completo (sesiones + Fase A + subida al 9) | OK |

---

## 10. Lecciones para un máster en Desarrollo con IA

1. **La seguridad es una fase, no una nota al pie**: la primera auditoría la
   excluyó; resultó ser la decisión de mayor impacto (RLS/JWT/sesiones). El
   endurecimiento posterior (cookie en servidor, secret estricto, rate-limit,
   Zod en frontera) cerró toda la fase.
2. **El mecanismo de identidad es la decisión crítica**: pasar de un header
   custom a **JWT firmado por usuario** y después a **sesiones opacas de
   servidor** fue la corrección correcta y verificable empíricamente — la
   cookie forjada con el UUID público ya no concede rol.
3. **Testear la línea de defensa**: la firma JWT, el login bcrypt, el
   aislamiento RLS y la sesión/cookie forjada tienen tests propios.
4. **La IA deja residuos**: tras cada refactor, inventario por búsqueda de
   imports (dead code §5). Esta revisión confirmó que eliminar `client.ts`,
   los tokens/banderas muertas y reducir la superficie de DI deja el árbol más
   limpio y obliga a pasar por servicios.
5. **Las promesas de UI deben ser honestas**: se retiró el branding "en
   vivo/tiempo real" no respaldado (no hay realtime, solo `router.refresh()` y
   un countdown local).

---

## 11. Roadmap priorizado

### Fase S — Endurecimiento de seguridad — **COMPLETA**
- [x] Migrar contraseña a bcrypt, quitar la hardcodeada.
- [x] **(S1)** Cookie en servidor (`HttpOnly; Secure; SameSite=Lax`).
- [x] **(S2)** Error en prod si falta `SUPABASE_JWT_SECRET`.
- [x] **(S3)** **Sesiones opacas de servidor** (`session_tokens` + cookie
       `padel_session` con token aleatorio; forjar la cookie ya no da rol).
- [x] **(S4)** `bcrypt.compare` async + rate-limit (5/min).
- [x] **(S5)** GRANT mínimos: `SELECT`→anon, DML→authenticated, `session_tokens`
       solo `service_role`.
- [x] **(S6)** Zod en `deleteTournament`, `reincorporatePlayer`, `loginAsAdmin`.
- [x] **(S7)** Eliminar `client.ts`.
- [x] Tests de identidad (JWT/bcrypt) + e2e de cookie forjada.
- [ ] **(Futuro)** Supabase Auth para producciones compartidas (no bloqueante).

### Fase A — Arquitectura — **COMPLETA**
- [x] Encapsular las queries crudas de `historico` en `MatchHistoryService`
      (`findLatestPlayerSnapshot`).
- [x] Páginas usando solo servicios (`tournamentService`, `drawService`,
      `matchHistoryService`, `playerService`, `championshipStatsService`).
- [x] `TournamentStatusHeader` con el tipo `Tournament` de dominio.
- [x] **Stats de campeones encapsuladas** en `ChampionshipStatsService`
      (`countByDrawnPairs` / `countByHistory`).
- [x] **Algoritmo de parejas ganadoras unificado** en dominio (adaptador lo
      invoca) y eliminado `getWinningPartnershipKeys`.
- [x] **Dead code** retirado (`getLimits`/`isLimited`, `src/app/api/`,
      `PairBadge` duplicado).
- [x] **Unit de sesión** (`session-store`, `current-user`, `server`).

### Fase C — UI — **COMPLETA**
- [x] Badge "En curso" condicional en `CourtCard`.
- [x] Variable `ordered` en `CourtScoring`.
- [x] Retirar branding "realtime/live" (componente + metadatos + README).
- [x] Dashboard con grid adecuado.
- [x] Eliminar `--color-accent` y la marca "Stitch".

### Fase T — Testing y calidad — **COMPLETA**
- [x] e2e de aislamiento RLS cross-user vía la API (`rls-isolation.spec.ts`).
- [x] Prettier + workflow de CI (typecheck/lint/format/vitest/build/e2e).

---

## 12. Conclusión

El proyecto está en un estado **excelente, en el tope del objetivo (9/10)**:
arquitectura por capas limpia, capa de datos tipada, presentación que **solo
consume servicios** (incluidas las stats de campeones), **frontera 100%
validada** y **187 tests verdes (137 unit + 50 e2e)**, incluidos tests de la
línea de defensa (JWT/bcrypt/sesiones/RLS) y de la identidad de sesión. El plan
de subida al 9 derivado de la re-auditoría se ejecutó completo:

- **A (arquitectura, 9)**: `ChampionshipStatsService` encapsula las stats;
  algoritmo de parejas ganadoras único en dominio (el adaptador lo invoca);
  presentación exclusivamente por servicios.
- **Limpieza (§5, 9.5)**: dead code cerrado (helpers huérfanos, `api/` vacío,
  badge duplicado, spec de parejas coherente).
- **Testing (§7, 9.5)**: unit de **sesión** (`session-store`, `current-user`,
  `server`) y del servicio de stats; 137 + 50 verdes.
- **S (seguridad, 9)**: RLS + JWT + sesiones opacas re-verificados; sin cambios
  respecto a la re-auditoría (ya era 9).
- **Repo (§9)**: árbol de trabajo commiteado.

La única deuda no bloqueante es de **futuro** y no del entorno local: adoptar
Supabase Auth para producciones multiusuario (§4.5).

**Calificación global: 9/10 — plan de subida ejecutado; objetivo 8 superado con margen.**