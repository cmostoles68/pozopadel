-- Re-sortear (drawPairs) ya no destruye los resultados de pozos cerrados.
--
-- Antes, deleteAll() borraba físicamente public.drawn_pairs y, por las FKs
-- ON DELETE CASCADE de pozo_round_pairs/tournament_drawn_pairs (y SET NULL
-- del campeón), se perdían los resultados y el ganador de todo pozo ya jugado.
--
-- Ahora se "archivan": is_active=false. Las consultas de "sorteo actual"
-- filtran is_active=true, y la página de un pozo resuelve sus parejas por id
-- aunque estén archivadas (findByIdsWithProfiles).

ALTER TABLE public.drawn_pairs
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS drawn_pairs_user_uuid_active_idx
  ON public.drawn_pairs (user_uuid, is_active);