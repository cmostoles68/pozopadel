# Pozopadel — Auditoría Completa de Arquitectura, Seguridad, Calidad y UI

**Fecha de la auditoría**: 2026-09-03
**Estado verificado**: HEAD `ae81aac cifradopassword` + cambios de seguridad RLS/JWT aplicados
**Enfoque**: Arquitectura · Seguridad · Buenas prácticas · Testing · UI
**Alcance**: Incluye por primera vez **seguridad** (RLS, autenticación JWT, gestión de secretos, validación de frontera). Se excluye accesibilidad (fuera de alcance de este análisis).

> **Nota de versión**: Este documento sustituye a la versión anterior
> (`ANALISIS_ARQUITECTURA_Y_UI.md` del 01/09), que **excluía deliberadamente la
> seguridad** ("análisis en progreso"). Desde entonces se completó la fase de
> seguridad: RLS de propietario en todas las tablas + propagación de identidad
> por JWT firmado por usuario. Esta auditoría cubre el estado **actual** del
> código y de la base de datos.

---

## 1. Contexto y alcance

El proyecto es un gestor de "pozos" de pádel (torneos de parejas por rondas con
rotación de pistas). Pila tecnológica:

| Capa | Tecnología |
|------|------------|
| Framework | Next.js 16.3.1 (App Router), React 19.2.8 |
| Lenguaje | TypeScript 5 (strict) |
| Estilos | Tailwind CSS v4 (`@theme inline`), tokens Material 3 |
| Persistencia | Supabase local (Postgres 127.0.0.1:54322) |
| Testing | Vitest 4 (unit) + Playwright (e2e) |
| Lint/Build | ESLint 9 (flat config), `next build` |

Estructura por capas (arquitectura hexagonal/limpia de facto):

```
domain/          entidades + interfaces de repositorio + algoritmos puros
application/     servicios de aplicación (orquestación) + DTOs + validación
infrastructure/  adaptadores Supabase + factory de servicios/DI + auth + tokens
app/ + components/  presentación: páginas (server) + acciones + client components
```

Verificado: **la capa `domain` es TypeScript puro** (cero imports de next/react/
supabase); los DTOs y servicios de `application` también son puros.

---

## 2. Resumen ejecutivo

El proyecto está **consolidado en un único flujo de torneo ("pozo")** con
aislamiento de datos por `user_uuid`/`created_by` en la capa de datos y, desde
esta fase, **RLS de propietario reforzado con autenticación por JWT firmado**
por usuario. Ya no hay políticas `USING (true)` ni acceso cross-user vía
PostgREST.

Puntuación del estado actual:

| Dimensión | Nivel | Comentario |
|-----------|-------|------------|
| Separación en capas | 8/10 | Sólida; persisten accesos directos a repos/supabase desde la presentación |
| Tipado | 8/10 | `Database` tipado en toda la capa de infra; sin `any`; `database.types.ts` en sincronía con la DB real |
| Manejo de errores | 7/10 | Patrón `Result` dominante; restan inconsistencias menores y actions sin `as const` |
| Código muerto | 6/10 | Quedan funciones/helpers huérfanos y un `Client` de browser sin usar |
| Validación de frontera | 8/10 | Zod en la mayoría de actions; faltan 3 actions con parámetro |
| **Seguridad** | **8/10** | **RLS de propietario + JWT por usuario efectivos**; persisten mejoras de endurecimiento (ver §4) |
| Migraciones/entorno | 7/10 | Migraciones con prefijo `YYYYMMDDHHMMSS`; `supabase db reset` reproducible |
| Testing | 9/10 | 114 unit + 44 e2e verdes; **falta test del módulo de JWT/identidad** |
| UI/UX | 8/10 | Sólida y coherente; estado "live/realtime" engañoso y pequeños residuos |
| **Global** | **7.9/10** | Deuda acotada; seguridad y capa de datos tipada; falta CI y endurecer edge cases |

---

## 3. Arquitectura

### 3.1 Flujo general

```
Page (server component)
  └─ createServices()  ──►  service-factory.ts (DI manual)
                          ├─ DomainRepos (.adapter.ts) ◄── Supabase client
                          ├─ ApplicationServices (Player/Tournament/Draw/Round)
  └─ Server Actions ──►   servicios + repositorios
  └─ Client components    interactúan vía actions, router.refresh()
```

- **Autenticación**: cookie `padel_uuid` guarda el UUID (guest `...0001` /
  admin `...0002`); `getCurrentUserUuid()` resuelve la identidad (default:
  invitado). `getCurrentAuthMode()` devuelve `guest`/`admin`.
- **Identidad ante la DB**: `server.ts` firma un JWT por usuario
  (`signUserToken`) que transporta el claim `user_uuid`, y lo envía como
  `Authorization: Bearer`. PostgREST lo expone como `request.jwt.claims`, que
  lee `current_user_uuid()` para el RLS. Ver §4.2.
- **Aislamiento de datos**: columnas `user_uuid` (profiles, drawn_pairs,
  pozo_match_history) y `created_by` (tournaments); cadenas de propiedad para
  tablas hijas via `EXISTS` sobre `tournaments`.

### 3.2 Fortalezas

1. **Algoritmos de dominio puros** (`domain/algorithms/*`): sin dependencias de
   framework; totalmente unit-testeados. Ejemplar.
2. **Repositorios con contrato** (`domain/repositories/*`): aíslan Supabase del
   dominio.
3. **DI manual centralizado** (`service-factory.ts`): simple, legible, coherente
   con el tamaño del proyecto.
4. **Server Actions como única puerta de mutación**: casi todas validadas con
   Zod y pasan por servicio → repositorio.
5. **Componentes de servidor por defecto**; solo lo interactivo es `"use client"`.
6. **Tipado de borde de datos**: `SupabaseClient<Database>` en los 5 adaptadores;
   **sin `any`** (verificado: 0 coincidencias de `as any`/`: any`).
7. **Defensa en profundidad**: adaptadores aplican `.eq("user_uuid")`/
   `.eq("created_by")` además del RLS.

### 3.3 Debilidades arquitectónicas

| # | Problema | Dónde | Por qué importa |
|---|----------|-------|-----------------|
| 1 | **Acceso directo a `supabase.from()` desde actions/páginas**, saltando servicio y repositorio | `historico/actions.ts:30`, `historico/page.tsx:17` | Pierde orquestación/validación de la capa de aplicación; la query debería vivir en un método de repositorio |
| 2 | **Páginas server usan repos crudos en vez de servicios** | `jugadores/page.tsx:16`, `pozos/[id]/page.tsx:28`, `historico/page.tsx:13-14` | La presentación decide granularidad de acceso; menor consistencia |
| 3 | **`createServices()` expone repos y el `supabase` crudo** | `service-factory.ts:45-52` | Facilita los dos problemas anteriores (superficie amplia) |
| 4 | **`LiveTournamentHeader` importa el tipo `Database` de infraestructura** en lugar del dominio | `components/LiveTournamentHeader.tsx:3,5` | Fuga de la capa de infraestructura a presentación |
| 5 | **Lógica de negocio (stats de campeones) resuelta en la página** en vez de encapsularla en un servicio | `jugadores/page.tsx:8`, `historico/page.tsx:7` | Business logic en presentación |

---

## 4. Seguridad (novedad principal de esta auditoría)

### 4.1 Modelo de identidad y autenticación

- Cookie `padel_uuid` (client-side, `document.cookie`) con `max-age=30d`,
  `SameSite=Lax`. `src/config/auth.ts:1-4` define dos UUIDs fijos guest/admin;
  `current-user.ts:10-15` confía en el valor de la cookie comparando contra esas
  constantes.
- `verifyAdminLogin(password)` (`auth/actions.ts`) verifica con bcryptjs (cost
  12) contra el hash leído de `.admin-password.hash` (con fallback
  `ADMIN_PASSWORD_HASH`). `auth-context.tsx` fija la cookie de admin solo si la
  contraseña es correcta.

### 4.2 RLS y propagación de identidad (estado actual efectivo)

**Mecanismo**: `current_user_uuid()`
lee `request.jwt.claims` (JSONB) y extrae `user_uuid` (con fallback a `sub` y al
header legacy). El servidor firma un JWT HS256 por usuario
(`sign-token.ts`) y lo envía como `Authorization: Bearer` (`server.ts:26-29`).

**Resultado verificado empíricamente (vía PostgREST y `@supabase/ssr`)**:

| Cliente | Table test_users | Table profiles |
|---------|------------------|----------------|
| Token guest | ve solo `guest` | ve sus 7 filas |
| Token admin | ve solo `admin` | ve 0 (ninguna suya) |
| Anon (sin claim) | ve 0 | ve 0 |

→ **Sin token/claim no se ve nada**; la API PostgREST queda bloqueada para
cualquiera que use la anon key pública sin JWT de identidad. No quedan políticas
`USING (true)` en ninguna tabla: las 8 tablas tienen RLS habilitado y políticas
de propietario. Tablas legacy (`matches`, `rounds`, `tournament_players`)
eliminadas.

### 4.3 Gestión de secretos

| Secreto | Dónde | Estado |
|---------|-------|--------|
| `SUPABASE_JWT_SECRET` | `.env.local` (gitignored, nunca commiteado) | OK |
| `.admin-password.hash` (hash bcrypt admin) | fichero gitignored, leído solo en servidor | OK |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | pública por diseño | OK |
| `ADMIN_PASSWORD_HASH` (fallback env) | comentado en `.env.local`; solo acepta valores `$2*` | OK |

Verificado con `git ls-files`: `.env.local` y `.admin-password.hash` **no están
tracked** ni aparecen en el historial.

**Hallazgo del informe original — "Migrar hash SHA-256 a bcrypt/argon2. Quitar
contraseña hardcodeada": RESUELTO.** Confirmado por búsqueda en todo el código
tracked: ya no existe ningún hash SHA-256 de contraseña ni contraseña en claro
en el repositorio. El único `sha256` presente es `createHmac("sha256", …)` en
`sign-token.ts:44` (firma de JWT HS256, correcto e independiente del
almacenamiento de contraseñas). La contraseña admin se guarda únicamente como
hash **bcryptjs cost 12** en `.admin-password.hash` (gitignored, leído solo en
servidor) o en `ADMIN_PASSWORD_HASH` (solo acepta valores `$2*`), y se verifica
con `bcrypt.compareSync` en servidor antes de fijar la cookie de admin.

### 4.4 Hallazgos de seguridad

| # | Hallazgo | Severidad | Dónde |
|---|----------|-----------|-------|
| S1 | **Cookie sin `HttpOnly` y `Secure`**: al ser `document.cookie`, el JS del cliente puede leerla, y viaja en claro. Es el único mecanismo de sesión. | **MEDIA** | `auth-context.tsx:22` |
| S2 | **Fallback hardcoded del JWT secret**: si falta `SUPABASE_JWT_SECRET`, se firma con el default público de Supabase (`...-32-characters-long`), permitiendo forjar JWTs. Debería lanzar error en prod en vez de degradar silenciosamente. | **MEDIA** | `sign-token.ts:14-21` |
| S3 | **UUIDs de identidad predecibles y cookie forjable**: cualquiera que conozca `...0002` (público en el código) puede escribir la cookie y obtener un JWT admin-escopado. El "secreto" admin es solo la contraseña bcrypt; el UUID no es un secreto. | **MEDIA** (contexto: tool local 2-rol; en shared/prod sería ALTA) | `config/auth.ts:1-4`, `current-user.ts:11-14` |
| S4 | **`verifyAdminLogin` sin rate limiting** (brute force mitigado solo por el cost bcrypt 12) y **`bcrypt.compareSync`** síncrono bloqueando el event loop | **BAJA** | `auth/actions.ts:9`, `admin-password.ts:41` |
| S5 | **GRANTs demasiado amplios a `anon`** (full DML en todas las tablas). **RESUELTO**: el esquema consolidado (`20260910000000_initial_schema.sql`) revoca todo DML de `anon` (deja solo `SELECT`, que RLS filtra a nada sin claim) y concede DML explícito a `authenticated`; la app ahora firma sus JWT con `role:"authenticated"` (`sign-token.ts:6`). Verificado: `anon` INSERT → `permission denied`; `anon` SELECT → `[]`. | **BAJA** | migraciones varias |
| S6 | **Faltan validaciones Zod** en `deleteTournament(id)` y `reincorporatePlayer(playerId)` (strings crudas). Sin inyección SQL (todo pasa por parámetros de PostgREST), pero procesan input sin validar. `verifyAdminLogin` tampoco valida el string. | **BAJA** | `dashboard/actions.ts:7`, `historico/actions.ts:8`, `auth/actions.ts:9` |
| S7 | **`client.ts` (browser Supabase) nunca se importa** — dead code con la anon key; si alguien lo usara, tendría RLS que lo bloquea igualmente. | **BAJA** | `infrastructure/supabase/client.ts` |

**No se encontró**: XSS (`dangerouslySetInnerHTML`/`eval`/`innerHTML`: 0), SQL
injection (0 usos de SQL crudo), ni `USING (true)` residual.

### 4.5 Recomendaciones de seguridad priorizadas

1. **(S1)** Fijar la cookie de sesión por `Set-Cookie` en servidor (middleware o
   server action) con `HttpOnly; Secure; SameSite=Lax`. Esto exige mover el
   establecimiento de la cookie a servidor en vez de `document.cookie`.
2. **(S2)** En `sign-token.ts`, lanzar un error en producción si falta
   `SUPABASE_JWT_SECRET` (usar el default solo en `NODE_ENV !== "production"`).
3. **(S3)** En deployments compartidos/producción: migrar a identidades por
   usuario real (Supabase Auth) en lugar de dos UUIDs fijos, o al menos no
   derivar el "rol admin" del cookie sino de una verificación server-side.
4. **(S4)** Cambiar a `bcrypt.compare` (async) y añadir un throttle/rate-limit
   simple en la acción de login (p. ej. ventana de reintentos).
5. **(S5)** Reducir los GRANT: `SELECT` a `anon`; full DML a `authenticated`. — **[HECHO]**
6. **(S6)** Añadir `uuidSchema` en `deleteTournament`, `reincorporatePlayer` y
   una validación mínima de longitud en `verifyAdminLogin`.
7. Eliminar `client.ts` (browser) si no se va a usar, o documentar su propósito.

---

## 5. Inventario de código muerto (verificado)

| Item | Evidencia | Estado |
|------|-----------|--------|
| `complexWinningPartnerships` / `getWinningPartnershipKeys` (`domain/algorithms/draw.ts:197-254`) | usados solo en tests | **muerto** |
| `getLimits()` / `isLimited()` (`config/limits.ts:28-36`) | nunca importados | **muerto** |
| `PairBadge.tsx` standalone vs inline en `PairSelector.tsx:108` | dos implementaciones; la standalone solo la usa `ChampionBanner` | **duplicación** |
| `supabase/client.ts` (browser) | nunca importado | **muerto** |
| `supabase/adapters/`: todos los adaptadores se instancian (verificado) | en uso | OK |
| `src/app/api/` (directorio) | vacío | **resto** |
| componente `LiveTournamentHeader` | montado y funcional, pero NO es realtime (nombre engañoso) | semántica |
| variable `ordered` en `CourtScoring.tsx:178` | se sortea pero el map de abajo itera `pairs` | **muerto/inconsistente** |

---

## 6. Validación de frontera

**Zod aplicado** (14 actions con esquema):

| Action | Esquema |
|--------|---------|
| `createPlayer` / `updatePlayer` / `deletePlayer` | `createPlayerSchema` / `updatePlayerSchema` / `uuidSchema` |
| `createPozo` / `saveCourtResult` | `createTournamentSchema` / `saveCourtResultSchema` |
| `selectPair` / `deselectPair` / `selectAllPairs` / `drawCourts` / `clearCourtDraw` / `seedRound1` / `checkAndStartNextRound` / `finalizePozo` | `uuidSchema` (o doble uuid) |
| `drawPairs` | `drawMethodSchema` |

**Sin validación**: `deleteTournament`, `reincorporatePlayer`, `verifyAdminLogin`
(relacionado con S6). `deleteAllPlayers` y `clearPairs` no reciben parámetros (OK).

---

## 7. Testing

### 7.1 Unit (Vitest) — **114 tests / 9 ficheros** (verificado ejecutando `vitest run`)

| Fichero | Tests | Cubre |
|---------|-------|-------|
| `draw-service.unit.spec.ts` | 22 | DrawService (parejas, pistas, seed ronda 1, errores) |
| `adapters.unit.spec.ts` | 33 | adaptadores con cliente mockeado + scoping `user_uuid` |
| `round-service.unit.spec.ts` | 16 | RoundService (marcadores, siguiente ronda, finalizar, rollback) |
| `validation.unit.spec.ts` | 17 | esquemas Zod + `parseOrError` |
| `errors.unit.spec.ts` | 6 | `safeErr`/`toSafeErrorMessage` |
| `championships.unit.spec.ts` | 5 | stats de campeones |
| `pozo-engine.unit.spec.ts` | 4 | movimientos de parejas |
| `draw-rules.unit.spec.ts` | 4 | validación de sorteo |
| `partnership-history.unit.spec.ts` | 4 | parejas ganadoras repetidas |

### 7.2 E2E (Playwright) — **44 tests** (verificado ejecutando `playwright test`)

- `auth.spec.ts`: guest/admin, contraseña incorrecta, badge admin, logout.
- `dashboard.spec.ts`: redirects `/`, menú, secciones, formularios.
- `jugadores.spec.ts`: CRUD jugadores, validación, borrado masivo.
- `sorteo.spec.ts`: sorteo aleatorio, bloqueo <4 jugadores, borrar sorteo.
- `pozo.spec.ts`: selección de parejas, sorteo de pistas, rondas, marcador,
  temporizador, histórico, evitar parejas que siempre ganan.
- `pozo-live.spec.ts`: persistencia real del marcador en DB.
- `limits.spec.ts`: límites invitado (32 jugadores/8 pistas/1 pozo) y admin sin
  restricciones.
- `orden-pozos.spec.ts`: ordenar por pozos ganados.
- `historico.spec.ts`: reincorporar jugador desde el histórico.

### 7.3 Gaps de testing

- **No hay test del módulo de seguridad/identidad** (`sign-token.ts`,
  `server.ts`, `current-user.ts`, `admin-password.ts`). El RLS/JWT es la línea
  de defensa principal y no está cubierto por unit ni e2e.
- No hay e2e que verifique explícitamente el aislamiento RLS entre guest/admin
  leyendo datos (`limits.spec.ts` cubre límites pero no cross-user reads via la
  API del cliente).
- README/doc anteriores contenían conteos obsoletos; este documento refleja los
  reales (114/44).

---

## 8. UI/UX (sin accesibilidad)

### 8.1 Valoraciones por pantalla

| Pantalla | Valoración | Comentario |
|----------|------------|------------|
| Login (`auth/login`) | 9/10 | Dos modos claros, error de contraseña, marca bien presentada |
| Dashboard | 7/10 | Grid `grid-cols-2` con UNA sola tarjeta → hueco vacío permanente |
| Jugadores | 9/10 | Formulario inline, edición por fila, contadores |
| Sorteo (`sorteo`) | 8/10 | Cabina de selección con preview y feedback de impares |
| Nuevo pozo (`pozos/nuevo`) | 8/10 | Formulario con error vía query param |
| Pozo en vivo (`pozos/[id]`) | 8/10 | Pistas dibujadas en CSS, ranking, banner de campeón |
| Histórico | 7/10 | Campeones calculados del histórico; filas densas |

### 8.2 Bugs / inconsistencias

1. **Badge "En curso" estático** en `CourtCard` (`:64-66`) aunque la court esté
   terminada o el pozo `disabled`.
2. **Variable `ordered` muerta/inconsistente** en `CourtScoring.tsx:178`: se
   ordena `ordered` pero el render itera `pairs`; el orden del "vs" y del badge
   de ganador puede discrepar del orden mostrado.
3. **Branding "realtime/live" sin realtime real**:
   - `LiveTournamentHeader` no tiene suscripción realtime (0 matches de
     `channel|subscribe|realtime` en `src/`). Es un estado estático.
   - Metadatos (`layout.tsx:20`) y README hablan de "en tiempo real"/"marcador
     en vivo", no respaldado por ningún mecanismo realtime (solo
     `router.refresh()`).
   - `RoundTimer` es un countdown puramente local/visual, sin sincronización ni
     persistencia en DB.
4. **Frase invitado engañosa** en login (`:53`): "solo ver y jugar", pero el
   invitado tiene CRUD completo (limitado).
5. **Token `--color-accent` definido pero sin usar** (`globals.css:58`).
6. **Tercera marca residual** "Stitch" en comentarios de `globals.css:4,81`.

### 8.3 Aspectos destacables

- **Pistas de pádel dibujadas en CSS** y la "Pista Rey" con corona: detalle
  curioso y efectivo.
- **`ChampionBanner`** y confirmación de finalización: momentos bien diseñados.
- **Tokens Material 3** en `@theme inline` y vocabulario visual consistente
  (`glass-panel`, `pattern-bg`, `neon-glow`).

---

## 9. Tooling / calidad de proyecto

| Área | Estado | Recomendación |
|------|--------|---------------|
| Scripts | `dev/build/start/lint/typecheck/test/test:e2e/seed` | Añadir `format` (Prettier) y un `check` combinado |
| CI | **Ausente** (`.github/workflows` vacío) aunque Playwright es CI-aware | Crear workflow: typecheck + lint + vitest + build; e2e con servicio Supabase |
| Migraciones | Prefijo `YYYYMMDDHHMMSS`, `supabase db reset` reproducible | Documentar en CI cómo levantar Supabase |
| `.gitignore` | `.env*`, `.admin-password.hash` ignorados | OK |
| ADR/docs | README completo pero con conteos obsoletos (corregidos aquí) | Mantener conteos de tests en sync |

---

## 10. Lecciones para un máster en Desarrollo con IA

1. **La seguridad es una fase, no una nota al pie**: la primera auditoría la
   excluyó; resultó ser la decisión de mayor impacto (RLS/JWT). La disciplina es
   tratar la seguridad como ciudadano de primera clase desde el inicio.
2. **El mecanismo de identidad es la decisión crítica**: pasar de header custom
   (que PostgREST no expone) a JWT firmado por usuario fue la corrección
   correcta y verificable empíricamente.
3. **Testear la línea de defensa**: el módulo de firma JWT y la política RLS no
   tienen test propio; es la pieza que más debe cubrirse.
4. **La IA deja residuos**: tras cada refactor, inventario por búsqueda de
   imports (dead code §5) y honestidad en la UI ("live" sin realtime).
5. **Las promesas de UI deben ser honestas**: o se implementa realtime o se
   retira el branding "en vivo/tiempo real".

---

## 11. Roadmap priorizado

### Fase S — Endurecimiento de seguridad (2 días)
- [x] **(Informe original: "Migrar SHA-256 a bcrypt / quitar contraseña hardcodeada")** — RESUELTO: contraseña admin en bcrypt cost 12 (`.admin-password.hash`, gitignored), sin SHA-256 ni contraseña en claro en el repo (ver §4.3).
- [ ] **(S1)** Cookie de sesión `HttpOnly; Secure` fijada en servidor (mover de `document.cookie`).
- [ ] **(S2)** `sign-token.ts`: error en prod si falta `SUPABASE_JWT_SECRET`.
- [ ] **(S4)** `bcrypt.compare` async + rate-limit en login.
- [x] **(S5)** GRANTs mínimos: `SELECT`→anon, DML→authenticated. — HECHO (esquema consolidado `20260910000000_initial_schema.sql`, token `role:"authenticated"`).
- [ ] **(S6)** Zod en `deleteTournament`, `reincorporatePlayer`, `verifyAdminLogin`.
- [ ] **(S7)** Eliminar `client.ts` o documentarlo.
- [ ] Tests unit del módulo de identidad (JWT/RLS/bcrypt).

### Fase A — Arquitectura (1-2 días)
- [ ] Encapsular las queries crudas de `historico/actions.ts`/`historico/page.tsx`
      en métodos de repositorio.
- [ ] Que las páginas usen servicios en vez de repos; reducir la superficie de
      `createServices()`.
- [ ] `LiveTournamentHeader` con el tipo `Tournament` de dominio, no `Database`.

### Fase C — UI (1 día)
- [ ] Corregir badge "En curso" condicional en `CourtCard`.
- [ ] Arreglar variable `ordered` en `CourtScoring`.
- [ ] Retirar/sustituir branding "realtime/live" no respaldado.
- [ ] Dashboard: redistribuir la única tarjeta o usar grid adecuado.
- [ ] Eliminar token muerto `--color-accent` y la marca residual "Stitch".

### Fase T — Testing y calidad (1-2 días)
- [ ] Test e2e de aislamiento RLS cross-user (guest vs admin) vía la API.
- [ ] Prettier + workflow de CI (typecheck, lint, vitest, build, e2e).

---

## 12. Conclusión

El proyecto está en muy buen estado global: **arquitectura por capas limpia,
capa de datos tipada, validación en frontera, 158 tests verdes (114 unit + 44
e2e) y —por primera vez— una capa de seguridad real: RLS de propietario en todas
las tablas con identidad por JWT firmado por usuario**, verificada
empíricamente (sin token no se ve nada; cada rol ve solo lo suyo).

La deuda restante es **acotada y priorizada**: endurecer la cookie y la gestión
del JWT secret (2 MEDIAS), reducir privilegios y validaciones mínimas, añadir
test de identidad y CI, y limpiar residuos de UI/muertos. Ninguna es crítica
para el entorno local, pero todas son necesarias antes de cualquier despliegue
compartido o de producción.

**Calificación global: 7.9/10 — con potencial de 9/10 tras la Fase S**
**(seguridad) y la Fase T (testing/CI).**
