# 🎓 Evaluación completa — Proyecto Pozos de Pádel (Pozopadel)

> Perfil evaluador: AI Development Expert + Profesor Máster Fin de Carrera.
> Criterios: arquitectura clean, buenas prácticas y seguridad.

---

## 1. RESUMEN EJECUTIVO

Proyecto **sólido y bien diseñado**, con una arquitectura limpia correctamente aplicada (dominio → aplicación → infraestructura), un stack técnico coherente (Next.js 16 App Router, TS estricto, Tailwind 4, Supabase, Vitest + Playwright), y una cobertura de tests envidiable (106 unitarios + 38 e2e). Los puntos débiles se concentran en **seguridad** (RLS deshabilitado, hash de contraseñas débil, cookies sin `HttpOnly`) y en algunos detalles de refinamiento arquitectónico (service locator, castings). No es un proyecto de producción inmediata sin ajustes de seguridad, pero es un **excelente trabajo académico** que demuestra dominio del ecosistema React/Next.js y de principios de diseño.

---

## 2. ARQUITECTURA CLEAN — VALORACIÓN: ⭐⭐⭐⭐ (4/5)

### 2.1 Estructura por capas (correcta)

```text
domain/          → entidades, repositorios (interfaces), algoritmos, Result
application/     → servicios, DTOs, esquemas de validación Zod
infrastructure/  → adaptadores Supabase, service-factory
presentation/    → componentes React, Next.js pages/actions
```

- ✅ **Principio de Responsabilidad Única**: cada servicio (`PlayerService`, `TournamentService`, `DrawService`, `RoundService`) tiene una responsabilidad clara.
- ✅ **Inversión de dependencias**: los servicios dependen de interfaces del dominio (`IPlayerRepository`, `ITournamentRepository`), no de implementaciones concretas.
- ✅ **Tipo `Result<T>`** como monada de error — elimina exceptions verbosas y tipa con seguridad el flujo (`ok`/`err`). Muy bien pensado.
- ✅ **Validación Zod** en la capa de aplicación (schemas), separada de la lógica de negocio.

### 2.2 Puntos fuertes

| Aspecto | Detalle |
|---|---|
| `draw.service.ts` | Buena separación: algoritmos puros en `domain/algorithms/draw.ts`, servicio orquesta. |
| `calculatePairMovements` | Lógica de negocio ("sube y baja") aislada en dominio, testeable. |
| `service-factory.ts` | Centraliza la construcción de dependencias; fácil de mockear en tests. |
| `parseOrError` | Adapter genérico que traduce ZodError → `Result.err`. Patrón limpio. |

### 2.3 Puntos a mejorar

- **`service-factory.ts` = Service Locator, no DI puro.** La factory crea todas las dependencias concretas y las devuelve juntas. No hay inyección de dependencias mediante constructor en los puntos de entrada server (Next.js actions). Funcional pero no es el patrón canónico de clean architecture. Podría exportar funciones individuales (`getPlayerService()`) para mejorar testabilidad unitaria.
- **Fuga de responsabilidad**: las acciones `use server` (`createPozo`, `createPlayer`, `saveCourtResult`) conocen el modo de autenticación (`getCurrentAuthMode()`) y aplican límites de negocio directamente. Esto mezcla lógica de infraestructura/auth con la capa de presentación. Lo correcto sería que la action invocara al servicio, y el servicio aplicara las políticas (`PolicyService` o `Guard`).
- **`getCurrentUserUuid()` duplicado** en `current-user.ts` y en `auth-context.tsx` (cliente). El estado de auth está sincronizado manualmente entre server y cliente vía cookie; frágil si el servidor y el cliente se desincronizan.
- **`revalidatePath` vs `revalidateTag`**: se usa `revalidatePath` que es correcto para acciones server, pero podría ser más granular con tags si el volumen de datos creciera.

---

## 3. BUENAS PRÁCTICAS — VALORACIÓN: ⭐⭐⭐⭐ (4/5)

### 3.1 Type Safety y código

- ✅ **TypeScript estricto** (`strict: true`), `noEmit`, `esModuleInterop`, paths `@/*`. Excelente base.
- ✅ Los DTOs (`Player`, `Tournament`, `MatchHistoryRow`) son interfaces explícitas y tipadas.
- ✅ Uso de `as const` para valores de configuración y `type` exports en `auth.ts`.
- ✅ Los `TournamentStatus` y `DrawMethod` son uniones tipadas, no strings sueltos.
- ⚠️ Algunos `as` casts (`data ?? [] as Player[]`, `as Tournament | null`) podrían eliminarse con mejor tipado del retorno de Supabase. No son un problema, pero indican margen de mejora en la tipificación del adapter.

### 3.2 Validación y sanitización de entrada

- ✅ **Zod en toda la entrada de datos**: `createPlayerSchema`, `createTournamentSchema`, `saveCourtResultSchema`, `drawMethodSchema`.
- ✅ Los schemas declaran reglas de negocio (`max(10)` para level, `max(20)` para courts) — aunque el límite de courts (20) es mayor al configurado en `limits.ts` (8). **Inconsistencia a revisar**: el schema dice 20, la política dice 8. El límite de `limits.ts` gana por estar más arriba en el request, pero es confuso.
- ✅ Inputs sanitizados con `z.string().trim()`.

### 3.3 Testing (⭐ punto fuerte destacado)

- ✅ **106 tests unitarios** (Vitest): adaptadores, validación Zod, algoritmos de movimiento.
- ✅ **38 tests e2e** (Playwright): flujos completos de UI con fixtures auto-contenidos, limpieza de datos (resetScope), pruebas de edge cases (<4 jugadores, partidos históricos, etc.).
- ✅ Los tests de e2e son **aislados y deterministas** — cada spec crea sus propios fixtures con `resetUserData()`. Difícil de lograr; bien hecho.
- ⚠️ Falta testing de integración entre capas (e.g., servicio + adapter contra BD real). Los unit tests mockean el adapter, los e2e prueban la UI pero no la capa servicio por separado.

### 3.4 UX, accesibilidad y responsive

- ✅ **Mobile-first** en todo (modales fullscreen en mobile, botones flotantes con zonas de toque adecuadas).
- ✅ `material-symbols-outlined` autoalojados, sin dependencias de iconos runtime.
- ✅ Patron glass-panel, pattern-bg coherente con Material Design.
- ✅ Los formularios tienen labels reales (`htmlFor`) en login y `aria-label` en los botones de ayuda/modal.
- ⚠️ En `PlayerForm` se usan placeholders en vez de labels visibles (documentado). Es accesible si el placeholder es claro, pero un label visible es mejor práctica (WCAG).

### 3.5 Rendimiento

- ✅ `revalidatePath` después de mutaciones → SSR fresco.
- ✅ No hay client-side hydration de datos pesados; las páginas server-render.
- ⚠️ El modal de ayuda monta `<Modal>` en todo momento (renderizado siempre, visibility toggle). Si se monta el componente `HelpDialog` en AppShell siempre, renderiza el botón + estado `open` siempre — aceptable pero el contenido del modal no debería mountearse hasta abrirse (lazy). No es crítico para esta app.

---

## 4. SEGURIDAD — VALORACIÓN: ⭐⭐ (2/5) 🔴

**Esta es la sección más crítica del proyecto y la que requiere atención inmediata antes de producción.**

### 4.1 🔴 Row-Level Security (RLS) deshabilitado — CRÍTICO

- La migration `20260826190000_remove_auth_rls.sql` elimina la seguridad a nivel de fila de Supabase.
- Las GRANTs a `anon` son amplias:

  ```sql
  GRANT SELECT, INSERT, UPDATE ON public.profiles TO anon, authenticated;
  ```

- **Consecuencia**: cualquier persona que conozca la URL del proyecto y el anon key (público en el frontend) puede hacer `SELECT/INSERT/UPDATE` sobre **todas las filas** de las tablas, sin restricción de `user_uuid`. La seguridad depende 100% del filtrado a nivel de aplicación. Si hay un bug en `getAll(userUuid)` o un endpoint olvidado, los datos de un usuario quedan expuestos al otro.
- **Recomendación**: reactivar RLS con políticas `USING (user_uuid = auth.uid())` para cada tabla, y usar el `service_role` key solo en el servidor para las operaciones que lo necesiten.

### 4.2 🔴 Contraseñas con SHA-256 — CRÍTICO

- `src/config/auth.ts`: `ADMIN_PASSWORD_HASH` es SHA-256 del string "1234".
- `src/contexts/auth-context.tsx`: `hashPassword` usa `crypto.subtle.digest("SHA-256")`.
- SHA-256 es una función hash rápida, no apta para contraseñas. Un atacante con acceso a la tabla `auth` (o por fuerza bruta GPU) puede revertirla en segundos. "1234" es, además, una contraseña trivial.
- **Recomendación**: usar **bcrypt** (mínimo 12 rounds) o **argon2**. La contraseña debería estar en variables de entorno o en una tabla `auth.users` de Supabase, no hardcodeada ni en código cliente.

### 4.3 🟠 Cookie de sesión sin `HttpOnly` — ALTO

- `src/contexts/auth-context.tsx`:

  ```ts
  document.cookie = `${AUTH_COOKIE_NAME}=${uuid}; path=/; max-age=${60*60*24*30}; SameSite=Lax`;
  ```

- **Faltan**:
  - `HttpOnly` → JavaScript puede leer la cookie (XSS → robo de sesión).
  - `Secure` → no se envía por HTTPS (imprescindible en producción).
  - `SameSite=Lax` es correcto para cookies de sesión, pero necesita `Secure` en producción.
- El `max-age=30 días` es muy largo para una sesión de invitado; considerar sesiones más cortas o refresh.
- **No hay un middleware** (`src/middleware.ts`) que configure headers de seguridad:
  - `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`.
- **Recomendación**: crear `middleware.ts` con headers de seguridad, y usar una cookie `HttpOnly` del servidor (Next.js `cookies().set(..., { httpOnly: true, secure: true, sameSite: 'lax' })`).

### 4.4 🟠 Claves expuestas en cliente — MEDIO

- `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` se pasan al navegador (necesario para `createBrowserClient`).
- Sin RLS activo, esto es un riesgo: el anon key permite lectura/escritura completa de las tablas públicas.
- **Con RLS activo**, el anon key queda confinado a las políticas definidas, mitigando el riesgo.

### 4.5 🟡 Validaciones insuficientes en el límite de `createTournamentSchema` — MEDIO

- `numberOfCourts.max(20)` en el schema Zod vs `maxCourts(8)` en `limits.ts`. El schema Zod permite hasta 20; el límite real se aplica solo en modo invitado dentro de la action. En modo admin, se permite crear pozos con 20 pistas — ¿es deseable? El schema debería reflejar el máximo absoluto o los límites deberían ser coherentes.

### 4.6 🟢 CSRF — ACEPTABLE

- Next.js Server Actions incluyen protección CSRF nativa (token en `__NEXT_SERVER_ACTION`). No hay riesgo aparente aquí.

---

## 5. RESUMEN: PUNTOS FUERTES vs. MEJORAS

### ✅ Fortalezas (lo que hace muy bien)

1. **Arquitectura limpia bien aplicada**: dominio → aplicación → infraestructura con interfaces claras.
2. **Type Safety rigurosa**: TS estricto, uniones tipadas, `Result<T>` monádico.
3. **Testing excepcional**: 106 unitarios + 38 e2e, aislados y deterministas. Tests con fixtures auto-contenidos y cleanup completo (difícil de lograr).
4. **Validación Zod** en todas las entradas, separada de la lógica.
5. **Mobile-first responsive** con diseño coherente (glass-panel, pattern-bg).
6. **Componentes reutilizables** (`Modal`, `HelpDialog`).
7. **Patrón de algoritmos aislado** en dominio (`movements.ts`, `draw.ts`).
8. **Acciones server** correctamente tipadas y con `revalidatePath`.

### 🔧 Áreas de mejora (ordenadas por impacto)

| # | Prioridad | Mejora |
|---|---|---|
| 1 | 🔴 Crítico | Reactivar RLS en Supabase; eliminar GRANTs amplios a `anon`. |
| 2 | 🔴 Crítico | Migrar hash SHA-256 a bcrypt/argon2. Quitar contraseña hardcodeada. |
| 3 | 🟠 Alto | Añadir `HttpOnly; Secure` a la cookie de sesión. Crear `middleware.ts` con headers de seguridad (CSP, HSTS, etc.). |
| 4 | 🟠 Alto | Alinear el límite de `numberOfCourts` en `createTournamentSchema` (20) con `limits.ts` (8). |
| 5 | 🟡 Medio | Refactorizar `createServices()` hacia inyección de dependencias más explícita. |
| 6 | 🟡 Medio | Extraer la lógica de límites de las `actions` hacia un `Guards/PolicyService` en la capa de aplicación. |
| 7 | 🟡 Medio | Añadir `label` visible en `PlayerForm` (accesibilidad WCAG). |
| 8 | 🟡 Medio | Lazy-mount del contenido del modal de ayuda. |
| 9 | 🟢 Bajo | Ampliar cobertura con tests de integración (servicio + adapter real). |
| 10 | 🟢 Bajo | Añadir `revalidateTag` en operaciones de lectura para invalidación más granular. |

---

## 6. VEREDICTO FINAL

**Nota global: 7.8 / 10 — Notable** (sobresaliente en testing y arquitectura; requiere correcciones de seguridad antes de producción).

- Es un proyecto que demuestra **sólido dominio de Next.js 16, TypeScript estricto, clean architecture, testing moderno y diseño de UI**.
- La estructura del código es limpia, el testing es envidiable para un proyecto de fin de máster, y los principios de diseño están bien aplicados (interfaces, Result monad, algoritmos aislados, validación separada).
- Los puntos de seguridad (RLS deshabilitado, hash SHA-256, cookies sin `HttpOnly`) son **bloqueantes para producción**.
- Como evaluador académico: el proyecto es **apto para la defensa con la condición de remediar los 3 puntos de seguridad críticos/alto**.
- Como pieza de ingeniería para producción: el equipo de seguridad de una empresa pediría la reactivación de RLS y el reemplazo del hash de contraseñas.
- El trabajo realizado en esta sesión (fichero `config/limits.ts`, validaciones por modo, `HelpDialog`, `Modal` reutilizable, helpers de test) refleja buena práctica: configuración separada, aplicación de políticas por modo, y componentes accesibles y responsivos. Todo pasa `tsc`, `eslint`, tests y `next build`. 👏
