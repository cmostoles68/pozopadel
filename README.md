# PadelElite — Gestor de pozos de pádel

PadelElite nace de la experiencia real como jugador de pádel. En muchos clubs y torneos informales, la organización sigue dependiendo de hojas de cálculo manuales, emparejamientos repetidos y registros inconsistentes. Este proyecto centraliza ese proceso en un sistema digital para que cada ronda sea más equilibrada, transparente y agradable.

## ¿Por qué existe este proyecto?

La idea es simple: reducir la fricción administrativa alrededor de los torneos de pádel y mejorar la experiencia de todos los participantes. Un buen torneo debe sentirse organizado, justo y fácil de seguir, no como una tarea manual que agota energía antes incluso de empezar a jugar.

## ¿Qué hace la aplicación?

- Gestiona jugadores con nivel, género y mano dominante.
- Incluye varios algoritmos de sorteo para distintos estilos de torneo.
- Controla las rondas, la asignación de pistas, el tiempo y el flujo clásico de rotación "sube y baja".
- Registra resultados y finaliza el torneo de forma automática.
- Mantiene un historial de campeones para evitar repetir las mismas parejas con el tiempo.
- Soporta accesos de invitado y administrador.

## Stack técnico

- Next.js 16
- React 19 + TypeScript
- Supabase + PostgreSQL
- Zod para validación
- Vitest y Playwright para pruebas

## Requisitos

- Node.js 20+
- Docker
- Supabase CLI

## Inicio rápido

```bash
npm install
supabase start
cp .env.example .env.local
supabase db reset
npm run dev
```

Abre http://localhost:3000 e inicia sesión desde la pantalla de login.

Para configurar la contraseña de administrador local:

```bash
node -e "console.log(require('bcryptjs').hashSync('TU-CONTRASEÑA', 12))" > .admin-password.hash
```

## Estructura del proyecto

```text
src/
├── app/
├── components/
├── config/
├── contexts/
├── domain/
├── application/
├── infrastructure/
├── tests/

tests/
supabase/migrations/
```

## Flujos principales

### Gestión de jugadores
Crea, edita, lista y elimina jugadores con validación y datos de perfil.

### Generación del sorteo
Genera emparejamientos equilibrados y evita repetir campeones previos en torneos futuros.

### Gestión del torneo
Crea un pozo, configura pistas y tiempos de ronda, avanza las rondas y cierra el campeonato.

### Historial
Mantiene el registro de campeones y facilita la reincorporación de jugadores en próximos eventos sin volver a registrarlos.

## Pruebas

```bash
npm test
npm run test:e2e
```

## Licencia

Proyecto desarrollado como aplicación académica y práctica. Licencia: MIT, salvo activos multimedia de terceros.
