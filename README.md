# PadelElite — Gestor de Pozos de Pádel

Aplicación web para organizar y gestionar **pozos de pádel**: crear jugadores, sortear parejas, anotar marcadores por pista, avanzar rondas automáticamente con la regla "sube y baja" y coronar a la pareja campeona del Pozo 1 (Pista Rey).

Proyecto desarrollado como **Trabajo de Fin de Máster** en desarrollo de aplicaciones web con IA.

## Stack

- **Framework:** Next.js 16 (App Router, React 19, TypeScript 5 en modo estricto)
- **Estilos:** Tailwind CSS v4 con design system Material 3 (dark/glassmorphism)
- **Backend-as-a-Service:** Supabase (PostgreSQL local vía CLI)
- **Lógica de negocio:** algoritmos de sorteo, emparejamiento y movimientos como funciones puras en TypeScript (capa `domain`)
- **Tests unitarios:** Vitest 4
- **Tests E2E:** Playwright

## Arranque rápido

Requisitos: Node 20+, Docker (para Supabase local).

```bash
npm install

# 1. Levantar Supabase local
supabase start

# 2. Variables de entorno (ver .env.example)
cp .env.example .env.local

# 3. Aplicar migraciones (esquema + usuarios de prueba)
supabase db reset

# 4. Servidor de desarrollo
npm run dev
# → http://localhost:3000
```

> El fichero `.env.local` (obligatorio, no se versiona) debe contener al menos:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-de-supabase>
```

La clave anónima se obtiene con `supabase status`.

## Modos de acceso: Invitado y Admin

La aplicación distingue dos modos de autenticación, controlados por una **sesión de servidor** (`session_tokens`):

- **Invitado** (por defecto): entra sin credenciales. Sus datos quedan aislados bajo el UUID de invitado y **están sujetos a límites de uso** (ver sección Límites).
- **Admin**: requiere contraseña. Puede gestionar su propio conjunto de datos (UUID de admin) **sin límites**.

La cookie `padel_session` guarda un **token opaco aleatorio** (256 bits) cuyo hash SHA-256 se almacena en `session_tokens`; la identidad se resuelve en el servidor consultando esa tabla en cada request (`getCurrentUserUuid()` / `getCurrentAuthMode()` en `src/infrastructure/supabase/current-user.ts`). Conocer el UUID público no basta para autenticarse como admin, y sin token válido se entra como invitado. No existe middleware de sesión: los datos se aíslan por `user_uuid` en cada consulta.

## Límites del modo invitado

Definidos de forma centralizada en [`src/config/limits.ts`](src/config/limits.ts) como `GUEST_LIMITS`:

| Límite | Valor |
|---|---|
| Máximo de jugadores | 32 |
| Máximo de pozos (torneos) | 1 |
| Máximo de pistas por pozo | 8 |
| Máximo de jugadores en histórico | 32 |
| Máximo de juegos en histórico | 100 |

En el modo **invitado** estos valores se leen y **no pueden superarse** (se validan en las server actions antes de persistir). El modo **admin es ilimitado**. Si ya existe un pozo y se intenta crear otro en modo invitado, hay que borrar el actual desde el panel.

## Histórico

El histórico (`pozo_match_history`) registra **solo los ganadores de los pozos**, no los ganadores de las rondas previas:

- Al anotar el marcador de una pista en una ronda, **no** se crea ninguna fila de histórico.
- Al **finalizar un pozo** (`finalizePozo` en `src/application/services/round.service.ts`), se registra **un único** partido decisivo: el de la Pista 1 (Pista Rey) de la última ronda jugada, cuyo ganador se corona como pareja campeona.
- Esto aplica por igual a **admin** e **invitado**; en invitado el número máximo de partidos históricos sigue limitado por `maxHistoryMatches` (100).

Así, la sección "Partidos" del histórico muestra únicamente los partidos campeones de cada pozo finalizado (marcados como "Pareja campeona").

## Seguridad y RLS

Gestión de secretos y acceso a datos:

- **Sesión de servidor**: la cookie `padel_session` guarda un **token opaco** (no el UUID) que se fija/limpia mediante server actions (`src/app/auth/actions.ts`) con `HttpOnly; Secure; SameSite=Lax` y `Path=/`. El hash del token vive en la tabla `session_tokens` (accesible **solo** con `service_role`, sin RLS públicas) y se valida en cada request en `src/infrastructure/supabase/session-store.ts`. No se escribe desde JavaScript (`document.cookie`).
- **Contraseña de admin**: verificada con **bcrypt (cost 12)** en el servidor (`src/infrastructure/auth/admin-password.ts`) contra `.admin-password.hash` (gitignored) o la variable de entorno `ADMIN_PASSWORD_HASH`. No hay contraseña hardcodeada ni hash SHA-256 en el repositorio.
- **RLS activo en todas las tablas** con políticas por propietario (`user_uuid`/`created_by`). La identidad se propaga firmando un **JWT HS256 por usuario** que viaja como `Authorization: Bearer`; la función `current_user_uuid()` lo lee de `request.jwt.claims`.
- **Mínimo privilegio**: la app se conecta con el rol `authenticated` (rol en el JWT firmado) con DML completo; el rol anónimo `anon` (clave pública) queda con **solo `SELECT`**, que RLS filtra a nada sin un JWT de identidad. `service_role` conserva acceso total solo para el tooling de sesiones.
- El esquema completo (tablas, RLS, políticas, grants, usuarios de sistema, matcheo de identidad) vive en la **migración consolidada** `supabase/migrations/20260910000000_initial_schema.sql`; la gestión de sesiones opacas se añade en `supabase/migrations/20260915000000_sessions.sql`.

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm run start` | Build y servidor de producción |
| `npm run lint` | ESLint 9 (config `next/core-web-vitals`) |
| `npm run typecheck` | TypeScript estricto (`tsc --noEmit`) |
| `npm test` | Test unitarios (Vitest) |
| `npm run test:watch` | Tests unitarios en modo watch |
| `npm run test:e2e` | Tests E2E (Playwright) |
| `npm run seed` | Ejecuta `node scripts/seed.js` |

## Arquitectura

Proyecto con **Arquitectura Limpia** y dependencias dirigidas hacia el interior:

```
┌──────────────┐   ┌─────────────────┐   ┌───────────────────┐
│ presentation │ → │ application     │ → │  domain           │
│ app/** +     │   │ services, DTOs  │   │  (puro, sin deps) │
│ components   │   │ schemas zod     │   └───────────────────┘
└──────────────┘   └───────┬─────────┘   ┌───────────────────┐
                           │ implements  │ infrastructure    │
                           ▼             │ repos + adapters  │
                        ┌─────────────┐  │ (Supabase)        │
                        │ domain: ifs │  └───────────────────┘
                        └─────────────┘
```

- **`src/domain/`** — sin dependencias externas. Entidades, interfaces de repositorio, el tipo `Result<T>` (monada `ok`/`err`) y algoritmos puros: `algorithms/draw.ts` (sorteo de parejas), `algorithms/movements.ts` (rotación "sube y baja") y `stats/championships.ts`.
- **`src/application/`** — casos de uso (`services/`), DTOs y esquemas de validación Zod (`validation/schemas.ts`). Orquestan dominio e infraestructura.
- **`src/infrastructure/`** — adaptadores Supabase que implementan las interfaces de repositorio, `service-factory.ts` y la resolución de sesión (`supabase/current-user.ts`).
- **`src/config/`** — configuración de autenticación (`auth.ts`) y de límites del modo invitado (`limits.ts`).
- **`src/components/`** — componentes de UI reutilizables (`AppShell`, `RoundTimer`, `TournamentStatusHeader`, `HelpDialog`, `ui/modal`).
- **`src/app/**`** — páginas (server React components) y **server actions**. Las actions validan la entrada, resuelven el modo de sesión y delegan en los servicios/repositorios.

```
src/
├── app/
│   ├── auth/login/        # Pantalla de acceso (invitado / admin)
│   ├── dashboard/         # Panel: acceso a "Nuevo Torneo" y lista de torneos
│   ├── jugadores/         # Gestión de jugadores (CRUD)
│   ├── sorteo/            # Sorteo de parejas (4 algoritmos)
│   ├── historico/         # Histórico de jugadores y reincorporación
│   ├── pozos/nuevo/       # Creación de pozo (pistas, minutos por ronda)
│   ├── pozos/[id]/        # Detalle de pozo + marcador
│   └── page.tsx           # Redirige a /auth/login
├── components/            # AppShell, CourtCard, RoundTimer, HelpDialog, Modal...
├── config/                # auth.ts, limits.ts
├── contexts/              # auth-context (cliente)
├── domain/                # Algoritmos + entidades + repos + Result
├── application/           # Servicios, DTOs, validación Zod
├── infrastructure/        # Adaptadores Supabase, service-factory, current-user
└── tests/                 # Tests unitarios (Vitest)
```

## Esquema de datos (Supabase/PostgreSQL)

| Tabla | Propósito |
|---|---|
| `profiles` | Jugadores (con `user_uuid` de propietario) |
| `tournaments` | Pozos / torneos (con `created_by`) |
| `drawn_pairs` | Parejas sorteadas (con `user_uuid`) |
| `tournament_drawn_pairs` | Vinculación pareja ↔ torneo y asignación de pista |
| `pozo_rounds` | Rondas del pozo |
| `pozo_round_pairs` | Asignación pista/pareja de cada ronda |
| `pozo_match_history` | Historial de partidos campeones de pozo (jugadores, marcador) |
| `test_users` | Usuarios de sistema (invitado/admin) |

El aislamiento entre usuarios se realiza por `user_uuid` / `created_by` en cada consulta. Las migraciones viven en `supabase/migrations/`.

## Sorteo de parejas

Disponible en la sección Sorteo, con 4 algoritmos (definidos en `src/domain/algorithms/draw.ts`):

1. **Aleatorio Total** — emparejamiento totalmente al azar.
2. **Aleatorio Mixto** — parejas hombre + mujer al azar.
3. **Por Niveles Total** — compensa niveles (alto con bajo).
4. **Por Niveles Mixto** — combina género mixto y equilibrio de niveles.

El sorteo evita repetir parejas que ya se hayan proclamado campeonas de un pozo completo (detección vía histórico de victorias).

## Ayuda integrada

Un **botón flotante de ayuda** (icono `?`) está disponible en todas las páginas (montado en `AppShell`). Abre un modal (`src/components/ui/modal.tsx`) con un tutorial paso a paso que explica el funcionamiento completo: gestión de jugadores, algoritmos de sorteo, configuración del pozo, asignación de pistas, dinámica de juego (temporizador, registro de marcador, rotación), finalización del pozo y uso del histórico. Todo el contenido está en `src/components/HelpDialog.tsx`.

## Pruebas

```bash
# Unitarias (Vitest) — 137 tests
npm test

# E2E (Playwright) — 50 tests
npm run test:e2e

# Comprobación de formato (Prettier)
npm run format:check
```

- **Unitarias** (`src/tests/`): algoritmos puros de dominio (sorteo, emparejamiento, movimientos), validación Zod, identidad (JWT/bcrypt + rate-limit + sesiones), servicios de aplicación (draw, rondas, stats de campeones) e integración de la capa de adaptadores — sin depender de BBDD ni de red.
- **E2E** (`tests/`, config en `playwright.config.ts`, proyecto chromium, `workers: 1`): flujos completos de la UI (auth, dashboard, jugadores, sorteo, pozo, pozo-live, orden de pozos, histórico), aislamiento RLS cross-user vía la API (`rls-isolation.spec.ts`) y la sesión de servidor frente a cookies forjadas (`auth.spec.ts`). Cada spec crea y limpia sus propios fixtures sobre la BBDD local mediante `tests/helpers.ts`, garantizando determinismo.
- Toda la suite pasa: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, `npm run test:e2e` y `npm run build`. El workflow de CI (`.github/workflows/ci.yml`) ejecuta estas comprobaciones sobre el stack local de Supabase.

## Decisiones de diseño

1. **Lógica de negocio en dominio puro.** Algoritmos críticos (sorteo, emparejamiento, movimientos) viven en `domain/algorithms` como funciones puras testables, sin tocar Supabase.
2. **Presentación sin lógica de negocio.** Páginas y server actions delegan en la capa `application`; el acceso a datos queda aislado en `infrastructure` detrás de interfaces de repositorio.
3. **Validation en frontera.** Toda entrada se valida con Zod (`src/application/validation/schemas.ts`) antes de llegar a los servicios, y los errores se propagan con el tipo `Result<T>`.
4. **Configuración centralizada.** Autenticación (`src/config/auth.ts`) y límites del modo invitado (`src/config/limits.ts`) separados del código de negocio.
5. **Design system centralizado.** Tokens Material 3 como variables CSS en `globals.css` y clases utilitarias (`.glass-panel`, `.pattern-bg`, `.neon-glow`).
6. **Iconos auto-hosteado.** Material Symbols servido localmente desde `/fonts` (sin CDN en runtime) y componente `Modal` reutilizable.

---

Proyecto académico. LICENSE: MIT (excepto media de terceros).
