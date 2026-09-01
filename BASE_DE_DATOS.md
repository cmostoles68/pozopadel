# Estructura de la base de datos

Este proyecto usa un esquema moderno de torneos de pádel con flujo de `pozo` y sin tablas legacy. La base está centrada en torneos, parejas dibujadas, rondas y historial de partidos.

## Vista general

### Tablas principales

- `profiles`: perfiles de jugadores/usuarios autenticados
- `test_users`: usuarios de sistema para pruebas y operaciones (no son jugadores)
- `tournaments`: torneos activos
- `drawn_pairs`: parejas generadas para el sorteo
- `tournament_drawn_pairs`: relación torneo → pareja sorteada
- `pozo_rounds`: rondas del torneo
- `pozo_round_pairs`: partidos por pista y ronda
- `pozo_match_history`: historial de partidos jugados

---

## 1) `profiles`

Tabla de perfiles de usuarios/jugadores vinculados a `auth.users` de Supabase.

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | `UUID` | PK, FK a `auth.users(id)` | Identificador del perfil |
| `full_name` | `TEXT` | `NOT NULL` | Nombre completo |
| `gender` | `TEXT` | `CHECK (gender IN ('MALE','FEMALE'))` | Sexo del jugador |
| `dominant_hand` | `TEXT` | `CHECK (dominant_hand IN ('RIGHT','LEFT'))` | Mano dominante |
| `level` | `NUMERIC(3,1)` | `CHECK (level >= 1.0 AND level <= 10.0)` | Nivel de juego |
| `avatar_url` | `TEXT` | opcional | Imagen/avatar |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Fecha de creación |

### Contenido típico
- Perfiles de jugadores reales del sistema
- Se crean automáticamente al entrar un usuario nuevo en `auth.users`
- No son usuarios de prueba ni de operación

---

## 2) `test_users`

Tabla de usuarios de sistema para pruebas y operaciones. No son jugadores del torneo.

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | `UUID` | PK | ID del usuario de sistema |
| `username` | `TEXT` | `NOT NULL UNIQUE` | Nombre de usuario |
| `role` | `TEXT` | `CHECK (role IN ('guest','admin'))` | Rol del usuario |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Fecha de creación |

### Datos semilla actuales

| id | username | role |
|---|---|---|
| `00000000-0000-0000-0000-000000000001` | `guest` | `guest` |
| `00000000-0000-0000-0000-000000000002` | `admin` | `admin` |

### Regla de operación
- Todas las operaciones de pruebas se registran con el usuario invitado (`guest`)
- El usuario admin queda reservado para tareas administrativas

---

## 3) `tournaments`

Representa cada torneo de pozo.

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | `UUID` | PK, `DEFAULT uuid_generate_v4()` | ID del torneo |
| `title` | `TEXT` | `NOT NULL` | Nombre del torneo |
| `created_by` | `UUID` | FK a `profiles(id)`, `NOT NULL` | Usuario que creó el torneo |
| `status` | `TEXT` | `CHECK (status IN ('draft','in_progress','completed'))` | Estado actual |
| `number_of_courts` | `INT` | `NOT NULL`, `CHECK (>= 1)` | Número de pistas |
| `minutes_per_round` | `INT` | `NOT NULL DEFAULT 15` | Minutos por ronda |
| `champion_drawn_pair_id` | `UUID` | FK a `drawn_pairs(id)`, nullable | Pareja campeona |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Fecha de creación |

### Relación
- El creador del torneo debe estar en `profiles`
- En tests y operaciones, se usa un identificador de usuario válido (no un jugador real)

---

## 4) `drawn_pairs`

Tabla con las parejas sorteadas del torneo.

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | `UUID` | PK, `DEFAULT uuid_generate_v4()` | ID de la pareja |
| `pair_number` | `INT` | `NOT NULL` | Número de la pareja en el sorteo |
| `player1_id` | `UUID` | FK a `profiles(id)`, `NOT NULL` | Jugador 1 |
| `player2_id` | `UUID` | FK a `profiles(id)`, `NOT NULL` | Jugador 2 |
| `draw_method` | `TEXT` | `DEFAULT 'random'` | Método de sorteo |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Fecha de creación |

### Uso
- Cada pareja representa un jugador + otro jugador
- Se vinculan a torneos mediante `tournament_drawn_pairs`

---

## 5) `tournament_drawn_pairs`

Relación entre un torneo y las parejas que participan en él.

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | `UUID` | PK, `DEFAULT uuid_generate_v4()` | ID de la relación |
| `tournament_id` | `UUID` | FK a `tournaments(id)`, `NOT NULL` | Torneo |
| `drawn_pair_id` | `UUID` | FK a `drawn_pairs(id)`, `NOT NULL` | Pareja vinculada |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Fecha de creación |

### Restricción extra
- `UNIQUE(tournament_id, drawn_pair_id)` para evitar duplicados

---

## 6) `pozo_rounds`

Cada ronda del pozo dentro de un torneo.

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | `UUID` | PK, `DEFAULT uuid_generate_v4()` | ID de la ronda |
| `tournament_id` | `UUID` | FK a `tournaments(id)`, `NOT NULL` | Torneo |
| `round_number` | `INT` | `NOT NULL` | Número de la ronda |
| `status` | `TEXT` | `DEFAULT 'in_progress'`, `NOT NULL` | Estado de la ronda |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Fecha de creación |

### Restricción extra
- `UNIQUE(tournament_id, round_number)`

---

## 7) `pozo_round_pairs`

Asigna cada pareja a una pista dentro de una ronda concreta.

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | `UUID` | PK, `DEFAULT uuid_generate_v4()` | ID de la fila |
| `round_id` | `UUID` | FK a `pozo_rounds(id)`, `NOT NULL` | Ronda |
| `drawn_pair_id` | `UUID` | FK a `drawn_pairs(id)`, `NOT NULL` | Pareja asignada |
| `court_number` | `INT` | `NOT NULL` | Número de pista |
| `winner_drawn_pair_id` | `UUID` | FK a `drawn_pairs(id)`, nullable | Pareja ganadora |
| `score_a` | `INT` | nullable | Marcador A |
| `score_b` | `INT` | nullable | Marcador B |
| `is_finished` | `BOOLEAN` | `DEFAULT FALSE`, `NOT NULL` | Si el partido terminó |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Fecha de creación |

### Uso
- Guarda el resultado de cada partido de la ronda en una pista concreta
- Durante la partida se actualiza `winner_drawn_pair_id`, `score_a`, `score_b` y `is_finished`

---

## 8) `pozo_match_history`

Histórico de todos los partidos jugados.

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | `UUID` | PK, `DEFAULT uuid_generate_v4()` | ID del histórico |
| `tournament_id` | `UUID` | FK a `tournaments(id)`, nullable | Torneo |
| `round_id` | `UUID` | FK a `pozo_rounds(id)`, nullable | Ronda |
| `round_number` | `INT` | nullable | Número de ronda |
| `court_number` | `INT` | `NOT NULL` | Pista |
| `winner_player1_id` | `UUID` | `NOT NULL` | ID del jugador ganador 1 |
| `winner_player2_id` | `UUID` | `NOT NULL` | ID del jugador ganador 2 |
| `loser_player1_id` | `UUID` | `NOT NULL` | ID del jugador perdedor 1 |
| `loser_player2_id` | `UUID` | `NOT NULL` | ID del jugador perdedor 2 |
| `winner_drawn_pair_id` | `UUID` | nullable | Pareja ganadora |
| `loser_drawn_pair_id` | `UUID` | nullable | Pareja perdedora |
| `score_winner` | `INT` | nullable | Puntuación de quien ganó |
| `score_loser` | `INT` | nullable | Puntuación de quien perdió |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Fecha de registro |

### Restricción extra
- `UNIQUE(tournament_id, round_id, court_number)`

---

## 9) `auth.users`

Tabla del sistema de autenticación de Supabase, no es parte del dominio del torneo pero es la base del usuario real.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | `UUID` | Identificador del usuario autenticado |
| `email` | `TEXT` | Email del usuario |
| `created_at` | `TIMESTAMPTZ` | Fecha de alta |

### Relación con la app
- `profiles.id` referencia a `auth.users.id`
- Los jugadores del torneo viven en `profiles`
- `test_users` es una tabla separada para operaciones no jugadoras

---

## Resumen de usuarios

Hay dos tipos principales de usuarios en el sistema:

1. `auth.users` / `profiles`
   - Usuarios reales del sistema
   - Jugadores y perfiles de pádel

2. `test_users`
   - Usuarios de sistema para pruebas y operación
   - No son jugadores
   - Actualmente:
     - `guest` → `00000000-0000-0000-0000-000000000001`
     - `admin` → `00000000-0000-0000-0000-000000000002`

---

## Regla de uso recomendada

Para las operaciones del sistema se recomienda:

- registrar la acción con `guest`
- usar `admin` solo para permisos administrativos
- mantener a `profiles` para jugadores reales del torneo
- mantener `test_users` solo para entorno de pruebas y automatización
