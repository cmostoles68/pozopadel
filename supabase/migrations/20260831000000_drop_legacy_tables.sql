-- Drop legacy tables and policies
-- This finalizes the elimination of the legacy tournament engine flow

-- Remove triggers related to legacy tables
DROP TRIGGER IF EXISTS on_match_update ON public.matches CASCADE;
DROP TRIGGER IF EXISTS on_round_update ON public.rounds CASCADE;

-- Remove functions related to legacy operations
DROP FUNCTION IF EXISTS public.update_match_timestamp() CASCADE;
DROP FUNCTION IF EXISTS public.update_round_timestamp() CASCADE;

-- Remove RLS policies for legacy tables
DROP POLICY IF EXISTS "Public matches read" ON public.matches;
DROP POLICY IF EXISTS "Auth update matches" ON public.matches;
DROP POLICY IF EXISTS "Public rounds read" ON public.rounds;
DROP POLICY IF EXISTS "Admin write rounds" ON public.rounds;
DROP POLICY IF EXISTS "Public tournament_players read" ON public.tournament_players;
DROP POLICY IF EXISTS "Auth players join" ON public.tournament_players;

-- Drop legacy tables (in order to respect FK constraints)
DROP TABLE IF EXISTS public.matches CASCADE;
DROP TABLE IF EXISTS public.rounds CASCADE;
DROP TABLE IF EXISTS public.tournament_players CASCADE;
