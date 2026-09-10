# PadelElite — Gestor de Pozos de Pádel

Aplicación web para organizar y gestionar **pozos de pádel**: crear jugadores, sortear parejas, anotar marcadores por pista, avanzar rondas automáticamente con la regla "sube y baja" y coronar a la pareja campeona del Pozo 1 (Pista Rey).

Proyecto desarrollado como **Trabajo de Fin de Máster** en desarrollo de aplicaciones con IA.

---

## Arranque rápido (ejecución en local)

```bash
# 1. Dependencias
npm install

# 2. Levantar el stack local de Supabase (PostgreSQL + API en :54321)
supabase start

# 3. Variables de entorno (obtén las claves con `supabase status`)
cp .env.example .env.local
#   Rellena NEXT_PUBLIC_SUPABASE_ANON_KEY y SUPABASE_JWT_SECRET

# 4. (Opcional) Contraseña de administrador
node -e "console.log(require('bcryptjs').hashSync('TU-CONTRASEÑA', 12))" > .admin-password.hash

# 5. Aplicar esquema + datos de prueba
supabase db reset

# 6. Servidor de desarrollo
npm run dev
```

Abre **http://localhost:3000** → te redirige a `/auth/login` (puedes entrar como invitado o con la contraseña de admin).

> Para más detalle, ver la sección [c. Información sobre su instalación y ejecución](#c-información-sobre-su-instalación-y-ejecución).

---

## 1. Motivo de esta aplicación

Este proyecto nace de la **experiencia personal como jugador de pádel**. En los torneos denominados **pozos** se dan con mucha frecuencia una serie de circunstancias que degradan la experiencia de los jugadores y, sin embargo, se aceptan como "las normas del juego":

1. **Sorteo pobre.** El sorteo suele resolverse con un algoritmo muy sencillo: aleatorio total o, como mucho, mezclando hombres y mujeres para hacer un pozo mixto.
   - Rara vez se tiene en cuenta el **nivel** de los jugadores cuando hay una única categoría; aun siendo una única categoría, los niveles son dispares y no se compensan.
   - Lo que nunca se tiene en cuenta es el **histórico de parejas ganadoras**: cuando una pareja ya ha ganado un pozo y vuelve a salir junta por azar, el resto de jugadores da por sentado que volverán a ganar, lo que produce insatisfacción.
   - Esta aplicación contempla **4 métodos de sorteo** (aleatorio total, aleatorio mixto, por niveles total y por niveles mixto) y **siempre excluye las parejas que ya han resultado campeonas** en pozos anteriores, consultando el histórico de victorias.

2. **El organizador lo hace todo a mano.** El organizador del pozo suele ser un jugador más y tiene que estar pendiente de:
   - El **tiempo** de cada ronda.
   - **Quién va a cada pista** en cada ronda.
   - **Recoger los resultados**, ganadores y perdedores de cada pista.
   - Esta aplicación **organiza las rondas automáticamente**: permite indicar el ganador y el marcador en cada pista, calcula los movimientos "sube y baja" entre pistas y genera la siguiente ronda sin intervención manual.

3. **No hay memoria de los campeonatos.** El mantenimiento de un **histórico** hace dos cosas:
   - Permite al algoritmo conocer las **parejas campeonas anteriores** para evitar que se repitan en el sorteo.
   - Permite **recuperar jugadores que ya han jugado antes**, sin necesidad de volver a darlos de alta en cada campeonato.

---

## 2. Consideraciones generales

Es una aplicación web donde **la seguridad no es un punto crítico**: no hay datos sensibles ni riesgo económico. Por la mala sensación que produce tener que introducir el email cada vez que se quiere usar una aplicación, se permite **entrar en modo invitado** con la funcionalidad completa, pero con unas restricciones que se detallan más abajo.

- **Modo invitado** (por defecto): entrada sin credenciales, funcionalidad completa y **sujeto a límites de uso** para evitar abuso.
- **Modo administrador**: requiere una contraseña (definida en un fichero de configuración local, no versionado) y da acceso a **toda la funcionalidad sin límites**.

La seguridad está planteada con el objetivo de **no sufrir ataques que impliquen desborde de la infraestructura** (por ejemplo, crear millones de jugadores o torneos), no de proteger información confidencial. Aun así, se han tomado las precauciones normales:

- **Cifrado de la contraseña** de administrador con bcrypt (cost 12).
- **Protección de Supabase**: RLS (Row Level Security) activo en todas las tablas, JWT firmado por usuario, sesiones opacas y privilegios mínimos.
- **Formularios protegidos contra SQL injection** mediante validación estricta de entrada con Zod (y parametrización vía Supabase). Todos los identificadores (`playerId`, `tournamentId`, `roundId`, `drawnPairId`) se validan con formato estricto de UUID antes de usarse en consultas o filtros dinámicos.
- **Rate-limiting** en la verificación de la contraseña de administrador y en las acciones de creación.

### Flujo de uso

La aplicación incluye una **sección de ayuda integrada** (botón flotante `?`) que guía al usuario paso a paso. El proceso de gestión de un pozo es el siguiente:

1. **Crear jugadores** (o **recuperarlos desde el histórico** si ya jugaron antes).
2. **Sortear las parejas** mediante uno de los **4 algoritmos** ofrecidos.
3. **Crear el pozo** indicando cuántas pistas y parejas participan, así como el tiempo de cada ronda.
4. **Sortear las pistas** automáticamente (asignación de parejas a pistas).
5. **Avanzar las rondas**: se indica el ganador de cada pista y la aplicación calcula los movimientos y genera la siguiente ronda, hasta que se pulsa **finalizar pozo**.
6. Al finalizar, se corona como **pareja campeona** a la ganadora de la última ronda de la **Pista Rey** (Pista 1), y el resultado queda registrado en el histórico.

---

## a. Descripción general del proyecto

**PadelElite** es una aplicación web pensada para organizadores aficionados de torneos de pádel en formato *pozo* (rotatorio). Sustituye la gestión manual por un flujo digitalizado:

- **Gestión de jugadores** con perfil (género, mano dominante, nivel 1–10).
- **Sorteo inteligente de parejas** con 4 algoritmos y os que evitan repetir parejas campeonas.
- **Organización de rondas automática** con temporizador, marcador por pista y rotación "sube y baja" (los ganadores suben de pista, los perdedores bajan).
- **Histórico de campeonatos**: se guardan la pareja campeona y su marcador, y se pueden recuperar jugadores para próximos pozos en un clic.

## b. Stack tecnológico utilizado

| Capa | Tecnología |
|---|---|
| **Framework** | Next.js 16 (App Router, Server Components, Server Actions) |
| **UI / Frontend** | React 19, TypeScript 5 (modo estricto) |
| **Estilos** | Tailwind CSS v4 con design system Material 3 (tema dark / glassmorphism) |
| **Backend-as-a-Service** | Supabase (PostgreSQL local vía CLI) |
| **Validación** | Zod 4 (esquemas en la frontera de entrada) |
| **Lógica de negocio** | Funciones puras TypeScript en la capa `domain` (algoritmos de sorteo, emparejamiento y movimientos) |
| **Tests unitarios** | Vitest 4 |
| **Tests E2E** | Playwright |
| **Autenticación** | Sesiones opacas propias + JWT HS256 firmado por usuario + bcrypt |

## c. Información sobre su instalación y ejecución

### Requisitos previos

- **Node.js 20+**
- **Docker** (para el stack local de Supabase)
- **Supabase CLI**

### Instalación

```bash
# 1. Instalar dependencias
npm install

# 2. Levantar Supabase local
supabase start

# 3. Variables de entorno (ver .env.example)
cp .env.example .env.local
#   Rellena NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY (con `supabase status`) y SUPABASE_JWT_SECRET

# 4. Crear el fichero de contraseña de admin (gitignored) — opcional
node -e "console.log(require('bcryptjs').hashSync('TU-CONTRASEÑA', 12))" > .admin-password.hash

# 5. Aplicar migraciones (esquema + usuarios de prueba)
supabase db reset

# 6. Servidor de desarrollo
npm run dev
# → http://localhost:3000
```

### Variables de entorno

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-de-supabase>   # supabase status
SUPABASE_JWT_SECRET=<jwt-secret>                       # solo servidor
```

La contraseña de administrador se lee de `.admin-password.hash` (raíz del proyecto, gitignored) o, en su defecto, del hash bcrypt. Ver `.env.example` para más detalles.

### Scripts

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
| `npm run deploy:cloud` | Despliega el esquema a un Supabase cloud (`supabase link` + `db push`) |

### Despliegue en la nube (Vercel + Supabase Cloud)

La aplicación está separada en dos partes desplegables: el **frontend** (Next.js, en Vercel) y el **backend de datos** (Supabase Cloud). Ambas se conectan mediante variables de entorno.

#### 1. Crear y desplegar el esquema en Supabase Cloud

1. Crea un proyecto en [supabase.com](https://supabase.com) → **New project** (anota el *project ref*, p. ej. `abcdnxyz123`).
2. Autentica la CLI: `supabase login`.
3. Despliega el esquema (migraciones en `supabase/migrations/`):

```bash
npm run deploy:cloud <project-ref>
# equivalente a: supabase link --project-ref <ref> && supabase db push
```

> El seed (`npm run seed`) contiene datos de prueba y solo se aplica al entorno local; en la nube no es necesario. Si lo quieres de todos modos, tras el `link` ejecuta `supabase db seed` (hay que habilitarlo en `supabase/config.toml`).

#### 2. Desplegar el frontend en Vercel

1. Sube el repositorio a GitHub y pulsa **Add New → Project** en vercel.com seleccionando el repo.
2. Vercel detecta Next.js automáticamente (usa `vercel.json` con `npm run build`).
3. Configura las variables de entorno en **Project Settings → Environment Variables**:

| Variable | Valor (Supabase Cloud) |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<tu-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → anon public key |
| `SUPABASE_JWT_SECRET` | Project Settings → API → JWT secret (**marcada como Secret**) |
| `ADMIN_PASSWORD_HASH` | Hash bcrypt de la contraseña de admin (opcional, ver abajo) |

4. Pulsa **Deploy**.

#### 3. Contraseña de administrador en producción

En local se lee de `.admin-password.hash` (fichero gitignored). En Vercel no hay fichero del servidor, así que define la variable **`ADMIN_PASSWORD_HASH`** con el hash bcrypt:

```bash
node -e "console.log(require('bcryptjs').hashSync('TU-CONTRASEÑA', 12))"
```

> El hash contiene caracteres `$`: defínelo desde el panel de Vercel (donde no hay interpolación por parte de Next) y no en `.env.local` ni en el repositorio. El fallback de `src/infrastructure/auth/admin-password.ts` solo lo acepta si empieza por `$2`.

#### Notas sobre el despliegue

- **JWT secret**: el código firma sus propios tokens HS256 con `SUPABASE_JWT_SECRET` para transportar la identidad (`user_uuid`) y que RLS funcione. Debe ser **exactamente** el JWT secret del proyecto Supabase (local: `default`). En producción, si lo rotas en Supabase, actualízalo en Vercel.
- **Dominios**: si activas restricciones de dominio en Supabase (API settings), añade la URL de Vercel (`https://<tu-proyecto>.vercel.app`).
- **Región**: conviene crear el proyecto Supabase en la misma región que el despliegue de Vercel para minimizar latencia.
- **Sesiones**: el almacén de sesiones (`session_tokens`) usa el rol `service_role` solo en el servidor; no necesita configuración adicional.

La aplicación está construida bajo la premisa **mobile first** (la interfaz está pensada para ser usada desde el móvil durante el desarrollo de un pozo) y ha sido **probada en un emulador móvil** (viewport de dispositivo, Chrome DevTools) además de en navegador de escritorio.

## d. Estructura del proyecto

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

```
src/
├── app/                    # Capa de presentación (Next.js App Router)
│   ├── auth/login/         # Pantalla de acceso (invitado / admin)
│   ├── dashboard/          # Panel: acceso a "Nuevo Torneo" y lista de torneos
│   ├── jugadores/          # Gestión de jugadores (CRUD)
│   ├── sorteo/             # Sorteo de parejas (4 algoritmos)
│   ├── historico/          # Histórico de jugadores y reincorporación
│   ├── pozos/nuevo/        # Creación de pozo (pistas, minutos por ronda)
│   ├── pozos/[id]/         # Detalle de pozo + marcador digital (ScoreMarker)
│   └── page.tsx            # Redirige a /auth/login
├── components/             # AppShell, CourtCard, RoundTimer, HelpDialog, Modal...
├── config/                 # auth.ts, limits.ts (límites del modo invitado)
├── contexts/               # auth-context (cliente)
├── domain/                 # Algoritmos + entidades + repositorios + Result<T>
├── application/            # Servicios, DTOs, validación Zod
├── infrastructure/         # Adaptadores Supabase, service-factory, current-user
└── tests/                  # Tests unitarios (Vitest)

tests/                      # Tests E2E (Playwright)
scripts/                    # Seed de datos para tests
supabase/migrations/        # Migraciones de esquema (tablas, RLS, sesiones)
```

## e. Funcionalidades principales

### Gestión de jugadores
CRUD completo (crear, listar, editar, borrar) con perfil: nombre, género, mano dominante y nivel (1–10). Validación de nombres duplicados.

### Sorteo de parejas (4 algoritmos)
Disponible en la sección Sorteo, definidos en `src/domain/algorithms/draw.ts`:

1. **Aleatorio Total** — emparejamiento totalmente al azar.
2. **Aleatorio Mixto** — parejas hombre + mujer al azar.
3. **Por Niveles Total** — compensa niveles (alto con bajo).
4. **Por Niveles Mixto** — combina género mixto y equilibrio de niveles.

El sorteo **evita repetir parejas que ya se hayan proclamado campeonas** de un pozo completo (detección vía histórico de victorias).

### Gestión de pozos (torneos)
- Creación del pozo indicando **número de pistas**, **parejas participantes** y **minutos por ronda**.
- **Asignación automática de pistas** tras el sorteo.
- **Rondas automáticas**: al registrar el ganador de cada pista, la aplicación calcula los movimientos **"sube y baja"** (los ganadores suben de pista, los perdedores bajan) y genera la siguiente ronda.
- **Temporizador** de ronda con alarma sonora (`RoundTimer`).
- **Finalización del pozo**: se corona a la pareja ganadora de la **Pista Rey** (Pista 1) de la última ronda y se registra en el histórico.

### Marcador digital
Dentro de cada ronda, el número de pareja y la casilla de puntuación se muestran como un **marcador digital con marco** (estilo LED de pista de pádel): pantalla oscura con `bezel`, dígitos en verde lima con brillo y resalte de la pareja ganadora. Componente reutilizable `ScoreMarker` en `src/app/pozos/[id]/ScoreMarker.tsx`.

### Histórico
- Registra **solo los partidos campeones** de los pozos finalizados (no cada ronda).
- Consulta de partidos históricos y de los **campeonatos ganados por cada pareja/jugador**.
- **Reincorporación de jugadores** del histórico en un clic, sin volver a darlos de alta.

### Modos de acceso: Invitado y Admin
La aplicación distingue dos modos de autenticación controlados por una **sesión de servidor** (`session_tokens`):

- **Invitado** (por defecto): entra sin credenciales. Sus datos quedan aislados bajo el UUID de invitado y están **sujetos a límites de uso**.
- **Admin**: requiere contraseña (bcrypt). Puede gestionar su propio conjunto de datos (UUID de admin) **sin límites**.

La cookie `padel_session` guarda un **token opaco aleatorio** (256 bits) cuyo hash SHA-256 se almacena en `session_tokens`; la identidad se resuelve en el servidor en cada request (`getCurrentUserUuid()` / `getCurrentAuthMode()` en `src/infrastructure/supabase/current-user.ts`). Conocer el UUID público no basta para autenticarse como admin, y sin token válido se entra como invitado.

Tras **30 minutos de inactividad** (sin clics, teclado, scroll o toques), la sesión se cierra automáticamente y la aplicación vuelve a la pantalla de acceso. El contador se gestiona en el cliente (`src/contexts/auth-context.tsx`): registra la última actividad en `localStorage` (`pozopadel.lastActivity`), comprueba cada 30 s si se ha superado el umbral y, si es así, revoca el token en el servidor, limpia el estado local y redirige a `/auth/login`. La última actividad persiste entre recargas, por lo que volver a una pestaña que llevaba más de 30 minutos parada también cierra la sesión.

#### Límites del modo invitado
Definidos de forma centralizada en `src/config/limits.ts` como `GUEST_LIMITS`:

| Límite | Valor |
|---|---|
| Máximo de jugadores | 32 |
| Máximo de pozos (torneos) | 1 |
| Máximo de pistas por pozo | 8 |
| Máximo de jugadores en histórico | 32 |
| Máximo de juegos en histórico | 100 |

En el modo **invitado** estos valores se leen y **no pueden superarse** (se validan en las server actions antes de persistir). El modo **admin es ilimitado**. Si ya existe un pozo y se intenta crear otro en modo invitado, hay que borrar el actual desde el panel.

### Ayuda integrada
Un **botón flotante de ayuda** (icono `?`) está disponible en todas las páginas (montado en `AppShell`). Abre un modal (`src/components/ui/modal.tsx`) con un tutorial paso a paso que explica el funcionamiento completo: gestión de jugadores, algoritmos de sorteo, configuración del pozo, asignación de pistas, dinámica de juego (temporizador, registro de marcador, rotación), finalización del pozo y uso del histórico. Todo el contenido está en `src/components/HelpDialog.tsx`.

### Seguridad y RLS
- **Sesión de servidor**: token opaco en cookie `HttpOnly; Secure; SameSite=Lax`, hasheado en `session_tokens` (accesible solo con `service_role`). No se escribe desde JavaScript.
- **Contraseña de admin**: verificada con bcrypt (cost 12) contra `.admin-password.hash` (gitignored) o `ADMIN_PASSWORD_HASH`. No hay contraseñas hardcodeadas en el repositorio.
- **RLS activo en todas las tablas** con políticas por propietario (`user_uuid`/`created_by`). La identidad se propaga firmando un **JWT HS256 por usuario** en el claim `user_uuid`.
- **Mínimo privilegio**: la app se conecta con el rol `authenticated` con DML completo; el rol `anon` (clave pública) queda con solo `SELECT`, que RLS filtra a nada sin JWT de identidad. `service_role` se reserva para tooling de sesiones.
- **Protección frente a abuso**: límites de uso en modo invitado y rate-limiting en la verificación de la contraseña de admin.

## f. Usuario y contraseña de prueba

| Modo | Credenciales | Alcance |
|---|---|---|
| **Invitado** | Sin contraseña — botón **"Entrar como Invitado"** | Funcionalidad completa con límites de uso |
| **Admin** | Usuario: — / Contraseña: `L0sp0z0s!` (configurada en `.admin-password.hash`) | Funcionalidad completa sin límites |

> La contraseña de admin mostrada arriba es la configurada para el entorno de desarrollo/pruebas (`tests/auth.spec.ts`). Para producción, reemplázala generando un nuevo hash con el comando indicado en la sección de instalación.

---

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

## Pruebas

```bash
# Unitarias (Vitest)
npm test

# E2E (Playwright)
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
3. **Validación en frontera.** Toda entrada se valida con Zod (`src/application/validation/schemas.ts`) antes de llegar a los servicios, y los errores se propagan con el tipo `Result<T>`.
4. **Configuración centralizada.** Autenticación (`src/config/auth.ts`) y límites del modo invitado (`src/config/limits.ts`) separados del código de negocio.
5. **Design system centralizado.** Tokens Material 3 como variables CSS en `globals.css` y clases utilitarias (`.glass-panel`, `.pattern-bg`, `.neon-glow`).
6. **Iconos auto-hosteado.** Material Symbols servido localmente desde `/fonts` (sin CDN en runtime) y componente `Modal` reutilizable.

---

Proyecto académico. LICENSE: MIT (excepto media de terceros).