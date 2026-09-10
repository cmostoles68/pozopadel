-- Los niveles de jugador son enteros entre 1 y 10 (sin decimales).
ALTER TABLE public.profiles
  ALTER COLUMN level TYPE NUMERIC(2, 0) USING ROUND(level),
  ALTER COLUMN level SET DEFAULT 3,
  DROP CONSTRAINT IF EXISTS profiles_level_check,
  ADD CONSTRAINT profiles_level_check CHECK (level >= 1 AND level <= 10);