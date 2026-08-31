# PadelElite — Gestor de Pozos de Pádel

Aplicación web para organizar y gestionar **pozos de pádel** (torneos tipo padel espíritu Pozo): crear jugadores, sortear parejas, anotar marcadores en vivo por pista, avanzar rondas automáticamente y coronar al campeón del pozo.

Proyecto desarrollado como **Trabajo de Fin de Máster** en desarrollo de aplicaciones web con IA.

## Stack

- **Framework:** Next.js 16 (App Router, React 19, TypeScript 5)
- **Estilos:** Tailwind CSS v4 con design system Material 3 ("Stitch" dark/glassmorphism)
- **BBDD / Backend-as-a-Service:** Supabase (PostgreSQL local vía CLI)
- **BBDD de algoritmo:** los motores de sorteo, movimientos y emparejamiento son funciones puras en TypeScript puro
- **Tests unitarios:** Vitest 4
- **Tests E2E:** Playwright
- **Lint:** ESLint 9 (config `next/core-web-vitals`)

## Arranque rápido

Requisitos: Node 20+, Docker (para Supabase local).

```bash
npm install

# 1. Levantar Supabase local
supabase start

# 2. Variables de entorno (ver .env.example)
cp .env.example .env.local

# 3. Aplicar migraciones y datos de ejemplo
npm run seed

# 4. Servidor de desarrollo
npm run dev
# → http://localhost:3000
```

> El fichero `.env.local` (obligatorio, no se versiona) debe contener al menos:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-de-supabase>
```

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm run start` | Build y servidor de producción |
| `npm run lint` | ESLint (config `next/core-web-vitals`) |
| `npm test` | Test unitarios (Vitest) |
| `npm run test:watch` | Tests unitarios en modo watch |
| `npm run test:e2e` | Tests E2E (Playwright, requiere servidor en :3000) |
| `npm run seed` | Aplica migraciones + datos de ejemplo (`node scripts/seed.js`) |

## Arquitectura

El proyecto sigue una **Arquitectura Limpia (hexagonal)** con dependencias dirigidas hacia el interior:

```
┌──────────────┐   ┌───────────────────────┐   ┌───────────────────┐
│ presentation │ → │ application (services)│ → │  domain           │
│  app/**      │   │ casos de uso          │   │  (puro, sin deps) │
└──────────────┘   └──────────┬────────────┘   └───────────────────┘
                              │ implements
                              ▼
                   ┌───────────────────────┐
                   │ infrastructure        │
                   │ repos + adapters (DB) │
                   └───────────────────────┘
```

- **`src/domain/`** — sin dependencias externas. Entidades, repositorios (interfaces) y algoritmos puros: `algorithms/draw.ts`, `algorithms/legacy-round-engine.ts`, `algorithms/movements.ts`, `algorithms/round-engine.ts` y `stats/championships.ts`.
- **`src/application/`** — casos de uso (`services`), DTOs. Orquestan dominio + infraestructura, sin lógica de negocio embebida.
- **`src/infrastructure/`** — adaptadores de Supabase que implementan las interfaces de repositorio (`supabase/adapters`). Los accesos a BBDD pasan por aquí vía `service-factory.ts`.
- **`src/components/`** — componentes de UI reutilizables (`AppShell`, `CourtsGrid`, `LeaderboardTable`, `AdminControlPanel`, `RoundTimer`).
- **`src/app/**`** — páginas (server components) y server actions. Las **actions no contienen lógica de negocio ni acceso directo a BBDD**; delegan en servicios/repositorios.

```text
src/
├── app/                 # Rutas y páginas (presentación)
│   ├── dashboard/       # Torneos (CRUD)
│   ├── jugadores/       # Gestión de jugadores
│   ├── sorteo/          # Sorteo de parejas
│   ├── historico/       # Histórico y clasificación
│   ├── pozos/[id]/      # Detalle de pozo + marcador en vivo
│   ├── api/pozos/*      # API routes (start, finish, finish-round)
│   └── auth/            # Login y callback OAuth
├── components/
├── domain/              # Lógica pura (algoritmos, entidades, repos)
├── application/         # Casos de uso y DTOs
├── infrastructure/      # Adaptadores de BBDD (Supabase)
└── tests/               # Tests unitarios (Vitest)
```

## Esquema de datos (Supabase/PostgreSQL)

| Tabla | Propósito |
|---|---|
| `profiles` | Perfiles de usuario (auth) |
| `tournaments` | Torneos / pozos |
| `tournament_players` | Jugadores inscritos en un torneo (flujo legacy) |
| `rounds` / `matches` | Rondas y partidos (flujo legacy) |
| `drawn_pairs` | Parejas sorteadas (sorteo) |
| `tournament_drawn_pairs` | Vinculación pareja ↔ torneo |
| `pozo_rounds` / `pozo_round_pairs` | Rondas y asignaciones pista/pareja del pozo |
| `pozo_match_history` | Historial de partidos jugados |
| `champion` | Pareja campeona del pozo |

> **Deuda técnica conocida:** coexisten **dos motores de torneo** — un flujo *legacy* (`rounds`/`matches`, motor `legacy-round-engine`) y el flujo *pozo* (`pozo_rounds`, motor `round-engine`). La migración del `pozo` moderno está en curso; ver [MOTORES.md](MOTORES.md).

## Pruebas

```bash
# Unitarias (dominio, 30+ tests)
npm test

# E2E (útil para validar flujos de jugador)
npm run test:e2e
```

Los tests unitarios cubren los algoritmos puros de dominio (emparejamiento por nivel/aleatorio, asignación de pistas, movimientos de jugadores y parejas, reglas del sorteo, conteo de campeonatos) **sin depender de BBDD ni de red** — garantizado por la capa de dominio sin dependencias.

## Decisiones de diseño

1. **Lógica de negocio en dominio puro.** Los algoritmos críticos (sorteo, emparejamiento, movimientos) viven en `domain/algorithms` como funciones puras testables, sin tocar Supabase.
2. **Presentación sin lógica de negocio.** Páginas y server actions delegan en la capa `application`; el acceso a datos queda aislado en `infrastructure` detrás de interfaces de repositorio.
3. **Design system centralizado.** Tokens M3 como variables CSS en `globals.css` y clases utilitarias (`.glass-panel`, `.pattern-bg`, `.neon-glow`) reutilizadas en toda la UI vía `AppShell`.
4. **Iconos auto-hosteado.** Material Symbols se sirve localmente desde `/fonts` (sin dependencia de CDN en runtime).

## Estructura de commits (histórico relevante)

- `dbfa133` — Restyle completo "Stitch" (25 archivos)
- `d2365b0` — Sorteo mínimo de 4 jugadores (par)
- `b6c0a0f` — Pozos ganados + seed de datos

---

Proyecto académico. LICENSE: MIT (excepto media de terceros).
