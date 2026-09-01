# Pozopadel — Análisis de Arquitectura, Buenas Prácticas y UI

**Fecha del análisis**: 2026-09-01
**Estado verificado**: HEAD `12b40fe admin and guest` (working tree limpio)
**Enfoque**: Arquitectura · Buenas prácticas · UI (sin accesibilidad)
**Excluido deliberadamente**: Seguridad (análisis en progreso) y accesibilidad.

> **Nota de versión**: Este documento reemplaza el análisis del 31/08
> (`ARCHITECTURAL_ANALYSIS.md`, `ANALYSIS_README.md`, `DEAD_CODE_CLEANUP.md`,
> `REFACTORING_GUIDE.md`). Aquellos describían el problema del "doble flujo"
> (legacy vs pozo). Desde entonces se eliminó el flujo legacy
> (commits `ca067a4` y `666ea60`), se añadió la autenticación por cookie
> (`12b40fe`) y el aislamiento por `user_uuid`. **El presente análisis refleja
> el estado actual del código.**

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
| Testing | Vitest (unit) + Playwright (e2e) |
| Lint/Build | ESLint 9 (flat config), `next build` |

Estructura por capas (arquitectura hexagonal/limpia de facto):

```
domain/          entidades + interfaces de repositorio + algoritmos puros
application/     servicios de aplicación (orquestación) + DTOs
infrastructure/  adaptadores Supabase + factory de servicios/DI + config
app/ + components/  presentación: páginas (server) + acciones de servidor + client components
```

---

## 2. Resumen ejecutivo

El código se ha simplificado y consolidado de forma notable respecto al análisis
anterior: **existe ya un único flujo de torneo ("pozo")** y se ha introducido un
mecanismo de **aislamiento por usuario** (`user_uuid`) coherente en la capa de datos.

Puntuación del estado actual:

| Dimensión | Nivel | Comentario |
|-----------|-------|------------|
| Separación en capas | 8/10 | Claro, pero con abstracciones permeables |
| Tipado | 6/10 | `type Database = any` en adaptadores; `database.types.ts` desactualizado |
| Manejo de errores | 5/10 | Tres patrones coexisten (throw, return, `{ok,error}`) |
| Código muerto | 4/10 | Queda inventario legacy sin uso tras el refactor |
| Validación de frontera | 4/10 | Sin validación de entrada (no hay zod/equivalente) |
| Migraciones/entorno | 5/10 | Migraciones aplicadas manualmente; tracking ausente |
| Testing | 6/10 | Buen unit de algoritmos; sin test de servicios/adaptadores |
| UI/UX | 8/10 | Sólida y coherente; residuos de flujos muertos |
| **Global** | **6.5/10** | Base sólida; deuda acotada y eliminable |

---

## 3. Arquitectura actual

### 3.1 Flujo general

```
Page (server component)
  └─ createServices()  ──►  service-factory.ts (DI manual)
                          ├─ DomainRepos (.adapter.ts) ◄── Supabase
                          ├─ ApplicationServices (Draw/Round/Tournament/Player)
  └─ Server Actions ──►   servicios + repositorios
  └─ Client components    interactúan vía actions, router.refresh()
```

- **Autenticación**: cookie `padel_uuid` persiste la sesión; `localStorage
  pozopadel.auth` guarda modo/rol en cliente; `getCurrentUserUuid()` resuelve
  el UUID (default: invitado `...0001`). Roles fijos `guest`/`admin` respaldados
  por la tabla `test_users`.
- **Aislamiento de datos**: las columnas `user_uuid` (en `profiles`,
  `drawn_pairs`, `pozo_match_history`) y `created_by` (en `tournaments`)
  filtran todas las lecturas/escrituras de los repositorios. Bien definido.
- **Mecánica del pozo**: `DrawService` (sorteo inicial y por método),
  `RoundService` (progresión de rondas, movimiento de parejas), `PozoEngine`
  (algoritmos puros de simulación, probados en unit tests).

### 3.2 Fortalezas arquitectónicas

1. **Algoritmos de dominio puros** (`domain/algorithms/*.ts`): sin dependencias
   de framework; totalmente unit-testeados. Ejemplar.
2. **Repositorios con contratos** (`domain/repositories/*.ts`): aisla Supabase
   del dominio. Bien.
3. **DI manual centralizado** (`service-factory.ts`): simple, legible, sin
   frameworks de inyección. Coherente con el tamaño del proyecto.
4. **Server Actions como única puerta de mutación**: toda escritura pasa por
   acciones tipadas → servicio → repositorio. Reduce superficies de error.
5. **Componentes de servidor por defecto**; solo lo interactivo es `"use client"`.
6. **DTOs en servicios** (`create.input/factory`) para comandos; buena idea
   mantenida desde el refactor.

### 3.3 Debilidades arquitectónicas

| # | Problema | Dónde | Por qué importa |
|---|----------|-------|-----------------|
| 1 | **Abstracciones permeables**: `service-factory` expone repositorios y el propio `supabase` al plano de presentación | `service-factory.ts`; `historico/page.tsx:9-17`, `jugadores`, `pozos/actions.ts` | La UI salta la capa de aplicación; pierde orquestación/validación |
| 2 | **`type Database = any`** en 6 adaptadores | `src/infrastructure/supabase/adapters/*` | Anula el tipado del borde de datos; los errores se detectan en runtime |
| 3 | **`database.types.ts` desactualizado** | falta `user_uuid`, `test_users`; aún declara `matches`, `rounds`, `tournament_players` (tablas eliminadas) | Desincronizado de `schema.sql` real; si se activa el tipo, fallará el build |
| 4 | **Manejo de errores heterogéneo** | repos lanzan `throw` (tournament), otros devuelven `data`; servicios mezclan `{ok,error}` y devoluciones directas | El consumidor no sabe qué esperar |
| 5 | **Repos parcialmente sin scope de usuario** | `tournament.adapter.findById/updateStatus/delete`, `match.findRound/findById` no filtran por `user_uuid` | Menos consistente la invariante "cada usuario solo ve lo suyo" |
| 6 | **Sin validación en la frontera** | actions reciben `FormData`/payloads y se castean (`as …`) sin validar | Entradas malformadas derivan en errores oscuros del driver |

---

## 4. Inventario de código muerto (verificado)

Tras eliminar el flujo legacy quedaron restos que conviene retirar (todo
verificado por búsqueda de imports):

### 4.1 Componentes sin uso
- `src/components/AdminControlPanel.tsx` — no se importa; llama a
  `/api/pozos/start`, `/api/pozos/finish-round`, `/api/pozos/finish`
  (**rutas que ya no existen**).
- `src/components/CourtsGrid.tsx` — no se importa; consulta la tabla
  `matches` (eliminada).
- `src/components/LeaderboardTable.tsx` — no se importa; consulta
  `matches`/`tournament_players` (eliminadas).

### 4.2 Repositorios/adaptadores legacy
- `ILegacyRoundRepository`, `ILegacyMatchRepository`
  (`domain/repositories/`).
- `SupabaseLegacyRoundAdapter`, `SupabaseLegacyMatchAdapter`
  (`infrastructure/supabase/adapters/`) — **nunca instanciados** en la factory.
- `src/app/api/pozos/` — directorio vacío (se mantiene por inercia).

### 4.3 Servicios/auth no consumidos
- `application/services/auth.service.ts` + `SupabaseAuthAdapter` +
  `IAuthRepository`: cableados en la factory pero **nunca consumidos**
  (la autenticación real es por cookie; el flujo OTP/OAuth quedaría muerto).
- `src/infrastructure/supabase/system-users.ts`: duplica constantes que ya
  viven en `src/config/auth.ts`.

### 4.4 Algoritmos
- `legacy-round-engine.ts` (+ `calculateMovements` en `movements.ts`): solo los
  consumen tests (`src/tests/pozo-engine.unit.spec.ts`).
- (Recuperable: `legacy-round-engine.ts` es en realidad la implementación
  **actual** del motor de movimientos; los tests apuntan a él. Ver §8.)

### 4.5 Eventos DOM sin oyentes
- `pozo-timer-started` (RoundTimer:56) y `pozo-timer-stop` (CourtScoring:131)
  se despachan pero **nadie los escucha**. El temporizador que muestra
  "Ronda en curso" depende de estos eventos nunca suscritos.

### 4.6 UI muerta
- `LiveTournamentHeader` recibe **siempre** `currentRound={null}`
  (`pozos/[id]/page.tsx:57`) ⇒ su sección de "Ronda actual / minutos" jamás se
  renderiza, aunque el componente (bonito) sigue montado.

---

## 5. Buenas prácticas

### 5.1 Lo que se hace bien

- **Git**: commits pequeños, mensajes descriptivos en inglés; se hicieron
  refactors atómicos y verificables (`refactor: eliminate dual flow…`,
  `feat: admin and guest`). Muy buen ejemplo de *historia de trabajo con IA*.
- **Tests de dominio**: `src/tests/*.unit.spec.ts` (34 tests) cubren
  campeonatos, reglas de sorteo, historial de parejas y el motor del pozo.
  Es la capa correcta que testear primero.
- **E2E con Playwright** (`tests/`): auth, dashboard, histórico, orden de
  pozos, pozo en vivo. Cubren el happy path completo.
- **Separación server/client** limpia y coherente; sin estado global
  improvisado (el estado vive en DB, la UI hace `router.refresh()`).
- **UI/UX**: sistema de diseño consistente (ver §6).

### 5.2 Gaps de calidad

| Área | Estado | Recomendación |
|------|--------|---------------|
| `typecheck` | Falta script; solo `lint`, `test`, `build` | Añadir `tsc --noEmit` a CI y al flujo local |
| Validación de entrada | Ausente | Zod (compartir esquemas DB↔UI) o al menos guards en actions |
| Test de servicios | No hay | Mockear adaptadores e testear `Draw`/`Round` service (cubre la orquestación, el 80% de la lógica real hoy reside en la UI) |
| Tests de adaptadores | No hay | Contra Supabase local (ya disponible) |
| Migraciones | Aplicadas manualmente; tabla `supabase_migrations` **no existe** en la DB | Adoptar `supabase db reset` desde `supabase/migrations/*.sql` para reproducibilidad |
| Coherencia de nombres | ~~`PadelElite` vs `pozopadel`~~ → **`PadelElite` única** (UI, README, tests, docs; `pozopadel` queda como ident. técnico: repo/package/project_id) | Hecho (Fase A ✅) |
| Errores al usuario | `throw new Error(...)` crudo en acciones | Mapear a mensajes de UI con estado (éxito/error) por action |

---

## 6. Análisis de UI (sin accesibilidad)

### 6.1 Sistema de diseño

- **Tokens Material 3** definidos en `globals.css` vía `@theme inline` de
  Tailwind v4; fuentes Chivo (display) + Plus Jakarta Sans; iconografía
  Material Symbols (auto-hosted), tema oscuro.
- Clases utilitarias propias bien hechas: `glass-panel`, `pattern-bg`,
  `custom-scrollbar`, `neon-glow`, `lighting-*`. **Vocabulario visual
  consistente** en toda la app.

### 6.2 Valoraciones por pantalla

| Pantalla | Valoración | Comentario |
|----------|------------|------------|
| Login (`auth/login`) | 9/10 | Dos modos claros (liga/invitado), password con estado de error, marca bien presentada |
| Dashboard | 8/10 | Tarjetas + lista de torneos con acciones; empty states correctos |
| Jugadores | 9/10 | Formulario inline, edición por fila, contadores; patrón de acciones claro |
| Sorteo (`sorteo`) | 8/10 | Cabina de selección de método con preview de pistas; feedback de parejas impares |
| Pozo en vivo (`pozos/[id]`) | 8/10 | Cabecera con estado, pistas en 3D, ranking en vivo, banner de campeón; muy logrado |
| Histórico | 7/10 | Calcula campeones desde historial; filas algo densas, "Reincorporar" accesible |

### 6.3 Bugs e inconsistencias de UI detectadas

1. **Etiqueta de estado incorrecta** (`LiveTournamentHeader.tsx:54`):
   `draft → "Jugándose"`. `draft` debería ser "En preparación"; el valor
   "Jugándose" debería corresponder a `in_progress`.
2. **Doble persistencia en CourtCard**: el click en la pareja que gana llama a
   `persist()` (CourtCard:82-89) y el input de marcador también (115) — ambas
   disparan `onResult → saveCourtResult`. **Dos peticiones por acción**; el
   botón "Registrar Marcador" (130-140) añade una tercera vía redundante.
3. **`LiveRanking` "en vivo"**: punto rojo pulsante + título "Ranking en vivo"
   (LiveRanking.tsx) pero **no hay suscripción realtime**; los datos son un
   cálculo estático de la ronda activa. El indicador promete algo que no ocurre.
4. **Eventos de timer sin receptor** (§4.5): la alarma sonora y el "stop" visual
   quedan desconectados.
5. **Cabecera de torneo mutilada** (§4.6): `currentRound={null}` oculta la
   información de ronda actual que el componente claramente está diseñado para
   mostrar.
6. **Marcas duplicadas**: "PadelElite" en UI, "pozopadel" en producto/repo
   (AppShell, layout.tsx, login).

### 6.4 Aspectos destacables

- **Pistas de pádel dibujadas en CSS** (CourtCard `PadelCourt`): detalle curioso
  y efectivo; la "Pista Rey" con corona emoji suma personalidad.
- **`ChampionBanner`** y confirmación de finalización del pozo: momentos de
  satisfacción bien diseñados.
- **Transiciones/animaciones** sutiles (`transition-colors`, `hover`) y
  `custom-scrollbar` en ranking: pulido destacable para una app de nicho.

---

## 7. Lecciones para un máster en Desarrollo con IA

1. **La IA acelera el refactoreo, pero deja residuos**: el refactor "eliminar
   flujo legacy" se completó en la UI y en los tablas, pero quedaron
   adaptadores, componentes y eventos huérfanos. La disciplina es hacer un
   **inventario por búsqueda de imports** tras cada refactor.
2. **Verificar el plan del generado**: descubrimos (ya resuelto) que la
   columna `user_uuid` faltaba en tipos/DB por una migración aplicada a mano.
   Con `supabase_migrations` rastreado, esto no habría ocurrido. La IA no debe
   sustituir el tracking de esquema.
3. **Testear la lógica antes que la infraestructura**: el proyecto acertó
   testeando los algoritmos puros primero; lo siguiente es cubrir la
   orquestación (servicios), no el driver.
4. **Las promesas de UI (realtime, estados vivos) deben ser honestas**: si la
   feature no existe, no la muestres. Es una oportunidad de micro-feature
   sencilla (Supabase Realtime ya está disponible).

---

## 8. Roadmap priorizado

### Fase A — Limpieza (1 día)
- [x] Eliminar `AdminControlPanel`, `CourtsGrid`, `LeaderboardTable` y el
      directorio vacío `src/app/api/pozos/`.
- [x] Eliminar adaptadores/repos/Servicios legacy no instanciados
      (`SupabaseLegacy*`, `ILegacy*`, `auth.service` si no se va a usar OTP).
- [x] Añadir `typecheck` script (`package.json`) + pasarlo en CI (no hay CI aún:
      hook de pre-push o workflow por crear).
- [x] Unificar marca (`PadelElite` única; `pozopadel` = ident. técnico).

### Fase B — Tipado y errores (2 días)
- [x] Regenerar `database.types.ts` con el esquema real
      (`supabase gen types --local`) y quitar `type Database = any`.
      Adaptadores y clients tipados con `SupabaseClient<Database>`.
- [x] Estandarizar manejo de errores: adoptar patrón `Result`/`{ok,error}` en
      repos y services; mapear en las actions (`src/domain/result.ts`).
- [x] Centralizar el scoping `user_uuid` (métodos `findById/update/delete`
      de tournament/match).

### Fase C — UI (1 día)
- [x] Arreglar `statusConfig` (`draft` = "En preparación", no "Jugándose").
- [x] Evitar doble persistencia en `CourtCard` (el botón es la única vía de guardado).
- [x] `LiveRanking` eliminado (no estaba montado en ninguna página).
- [x] Retirada la sección de `currentRound` muerta en `LiveTournamentHeader` (Fase A).
- [x] Retirados los eventos de timer sin receptor (`pozo-timer-*`) (Fase A).

### Fase D — Migraciones y testing (2 días)
- [x] Alinear las migraciones con la DB local y habilitar
      `supabase db reset` reproducible. Migraciones renombradas a prefijo
      `YYYYMMDDHHMMSS`, `scripts/seed.sql` sin deletes de tablas legacy y
      `supabase/config.toml` apuntando a `../scripts/seed.sql`. Validado de
      forma **no destructiva** en una DB temporal (esquema idéntico a la local);
      `supabase db reset` real NO ejecutado (decisión del usuario).
- [x] Unit tests de `DrawService` y `RoundService` con adaptadores mockeados
      (`src/tests/draw-service.unit.spec.ts` y `round-service.unit.spec.ts`).
- [x] (Opcional) Reapuntar los tests del motor al algoritmo usado en
      producción en vez de a `legacy-round-engine.ts`. Sin referencias
      restantes; los tests ya usan `calculatePairMovements` de producción.

---

## 9. Conclusión

El proyecto ha dado un giro importante y positivo: **un solo flujo del
dominio**, aislamiento por usuario, tests de algoritmos y una UI cuidada y
coherente. La deuda restante es **acotada, localizable y barata de eliminar**
(≈2-3 jornadas concentradas). La prioridad máxima es tipar la capa de datos y
estandarizar el estado de los errores; ambas cosas multiplican la seguridad de
refactores futuros cuando la IA siga proponiendo cambios.

**Calificación global: 6.5/10 — con potencial de 8/10 en una semana de
consolidación.**