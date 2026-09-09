#!/usr/bin/env bash
#
# Despliega el esquema de la base de datos a un proyecto Supabase en la nube.
#
# Uso:
#   ./scripts/deploy-cloud.sh <project-ref>
#
#   <project-ref>  Identificador del proyecto Supabase cloud (p. ej. "abcdnxyz123").
#                  Se obtiene desde el dashboard de Supabase o con `supabase projects list`.
#
# Requisitos previos:
#   1. Proyecto creado en supabase.com (Database → New project).
#   2. `supabase login` (CLI autenticada).
#   3. Las migraciones viven en supabase/migrations/ y se aplican en orden.
#
# Qué hace:
#   - Enlaza el directorio supabase/ con el proyecto remoto.
#   - Aplica las migraciones pendientes (supabase db push).
#   - NO ejecuta el seed: los datos de prueba (scripts/seed.sql) solo son
#     para el entorno local. Para sembrar datos de prueba en la nube (opcional),
#     usa `supabase db seed` una vez linkeado.
#
set -euo pipefail

PROJECT_REF="${1:-}"
if [[ -z "$PROJECT_REF" ]]; then
  echo "Uso: $0 <project-ref>"
  echo "  <project-ref> se obtiene con: supabase projects list"
  exit 1
fi

echo "==> Enlazando con el proyecto $PROJECT_REF ..."
supabase link --project-ref "$PROJECT_REF"

echo "==> Aplicando migraciones ..."
supabase db push

echo "==> Esquema desplegado correctamente."
echo "    Ahora configura NEXT_PUBLIC_SUPABASE_URL y las claves en Vercel"
echo "    (Project Settings → Environment Variables)."