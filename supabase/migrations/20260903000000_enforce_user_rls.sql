-- ============================================================================
-- Enforce Row-Level Security by user ownership (guest / admin).
--
-- Previously every RLS policy was "Anyone can ..." with USING(true)/WITH
-- CHECK(true), so the public anon key could read/write ALL users' rows through
-- the PostgREST API. This migration replaces those with ownership-based
-- policies that scope every row to the user_uuid of the current request.
--
-- The app sends the authenticated user's uuid in the `x-user-uuid` HTTP header
-- on every Supabase request (see src/infrastructure/supabase/server.ts).
-- PostgREST exposes it as current_setting('request.headers.x-user-uuid').
-- ============================================================================

-- Owner identity that comes from the request header.
CREATE OR REPLACE FUNCTION public.current_user_uuid()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NULLIF(current_setting('request.headers.x-user-uuid', true), '')::uuid
$$;

-- ---------------------------------------------------------------------------
-- profiles (owns user_uuid directly)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can delete profiles" ON public.profiles;

CREATE POLICY "Owner select profiles" ON public.profiles
  FOR SELECT USING (user_uuid = public.current_user_uuid());
CREATE POLICY "Owner insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (user_uuid = public.current_user_uuid());
CREATE POLICY "Owner update profiles" ON public.profiles
  FOR UPDATE USING (user_uuid = public.current_user_uuid())
  WITH CHECK (user_uuid = public.current_user_uuid());
CREATE POLICY "Owner delete profiles" ON public.profiles
  FOR DELETE USING (user_uuid = public.current_user_uuid());

-- ---------------------------------------------------------------------------
-- tournaments (owns via created_by == user_uuid)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can create tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Anyone can update tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Anyone can delete tournaments" ON public.tournaments;

CREATE POLICY "Owner select tournaments" ON public.tournaments
  FOR SELECT USING (created_by = public.current_user_uuid());
CREATE POLICY "Owner insert tournaments" ON public.tournaments
  FOR INSERT WITH CHECK (created_by = public.current_user_uuid());
CREATE POLICY "Owner update tournaments" ON public.tournaments
  FOR UPDATE USING (created_by = public.current_user_uuid())
  WITH CHECK (created_by = public.current_user_uuid());
CREATE POLICY "Owner delete tournaments" ON public.tournaments
  FOR DELETE USING (created_by = public.current_user_uuid());

-- ---------------------------------------------------------------------------
-- drawn_pairs (owns user_uuid directly)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can read drawn_pairs" ON public.drawn_pairs;
DROP POLICY IF EXISTS "Anyone can insert drawn_pairs" ON public.drawn_pairs;
DROP POLICY IF EXISTS "Anyone can delete drawn_pairs" ON public.drawn_pairs;

CREATE POLICY "Owner select drawn_pairs" ON public.drawn_pairs
  FOR SELECT USING (user_uuid = public.current_user_uuid());
CREATE POLICY "Owner insert drawn_pairs" ON public.drawn_pairs
  FOR INSERT WITH CHECK (user_uuid = public.current_user_uuid());
CREATE POLICY "Owner update drawn_pairs" ON public.drawn_pairs
  FOR UPDATE USING (user_uuid = public.current_user_uuid())
  WITH CHECK (user_uuid = public.current_user_uuid());
CREATE POLICY "Owner delete drawn_pairs" ON public.drawn_pairs
  FOR DELETE USING (user_uuid = public.current_user_uuid());

-- ---------------------------------------------------------------------------
-- tournament_drawn_pairs (owned via its tournament)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can read tournament_drawn_pairs" ON public.tournament_drawn_pairs;
DROP POLICY IF EXISTS "Anyone can insert tournament_drawn_pairs" ON public.tournament_drawn_pairs;
DROP POLICY IF EXISTS "Anyone can delete tournament_drawn_pairs" ON public.tournament_drawn_pairs;
DROP POLICY IF EXISTS "Anyone can update tournament_drawn_pairs" ON public.tournament_drawn_pairs;

CREATE POLICY "Owner select tournament_drawn_pairs" ON public.tournament_drawn_pairs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_id AND t.created_by = public.current_user_uuid()
    )
  );
CREATE POLICY "Owner insert tournament_drawn_pairs" ON public.tournament_drawn_pairs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_id AND t.created_by = public.current_user_uuid()
    )
  );
CREATE POLICY "Owner update tournament_drawn_pairs" ON public.tournament_drawn_pairs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_id AND t.created_by = public.current_user_uuid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_id AND t.created_by = public.current_user_uuid()
    )
  );
CREATE POLICY "Owner delete tournament_drawn_pairs" ON public.tournament_drawn_pairs
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_id AND t.created_by = public.current_user_uuid()
    )
  );

-- ---------------------------------------------------------------------------
-- pozo_rounds (owned via its tournament)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can read pozo_rounds" ON public.pozo_rounds;
DROP POLICY IF EXISTS "Anyone can insert pozo_rounds" ON public.pozo_rounds;
DROP POLICY IF EXISTS "Anyone can update pozo_rounds" ON public.pozo_rounds;
DROP POLICY IF EXISTS "Anyone can delete pozo_rounds" ON public.pozo_rounds;

CREATE POLICY "Owner select pozo_rounds" ON public.pozo_rounds
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_id AND t.created_by = public.current_user_uuid()
    )
  );
CREATE POLICY "Owner insert pozo_rounds" ON public.pozo_rounds
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_id AND t.created_by = public.current_user_uuid()
    )
  );
CREATE POLICY "Owner update pozo_rounds" ON public.pozo_rounds
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_id AND t.created_by = public.current_user_uuid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_id AND t.created_by = public.current_user_uuid()
    )
  );
CREATE POLICY "Owner delete pozo_rounds" ON public.pozo_rounds
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_id AND t.created_by = public.current_user_uuid()
    )
  );

-- ---------------------------------------------------------------------------
-- pozo_round_pairs (owned via round -> tournament)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can read pozo_round_pairs" ON public.pozo_round_pairs;
DROP POLICY IF EXISTS "Anyone can insert pozo_round_pairs" ON public.pozo_round_pairs;
DROP POLICY IF EXISTS "Anyone can update pozo_round_pairs" ON public.pozo_round_pairs;
DROP POLICY IF EXISTS "Anyone can delete pozo_round_pairs" ON public.pozo_round_pairs;

CREATE POLICY "Owner select pozo_round_pairs" ON public.pozo_round_pairs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.pozo_rounds pr
      JOIN public.tournaments t ON t.id = pr.tournament_id
      WHERE pr.id = round_id AND t.created_by = public.current_user_uuid()
    )
  );
CREATE POLICY "Owner insert pozo_round_pairs" ON public.pozo_round_pairs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pozo_rounds pr
      JOIN public.tournaments t ON t.id = pr.tournament_id
      WHERE pr.id = round_id AND t.created_by = public.current_user_uuid()
    )
  );
CREATE POLICY "Owner update pozo_round_pairs" ON public.pozo_round_pairs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.pozo_rounds pr
      JOIN public.tournaments t ON t.id = pr.tournament_id
      WHERE pr.id = round_id AND t.created_by = public.current_user_uuid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pozo_rounds pr
      JOIN public.tournaments t ON t.id = pr.tournament_id
      WHERE pr.id = round_id AND t.created_by = public.current_user_uuid()
    )
  );
CREATE POLICY "Owner delete pozo_round_pairs" ON public.pozo_round_pairs
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.pozo_rounds pr
      JOIN public.tournaments t ON t.id = pr.tournament_id
      WHERE pr.id = round_id AND t.created_by = public.current_user_uuid()
    )
  );

-- ---------------------------------------------------------------------------
-- pozo_match_history (owns user_uuid directly)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can read pozo_match_history" ON public.pozo_match_history;
DROP POLICY IF EXISTS "Anyone can insert pozo_match_history" ON public.pozo_match_history;
DROP POLICY IF EXISTS "Anyone can update pozo_match_history" ON public.pozo_match_history;
DROP POLICY IF EXISTS "Anyone can delete pozo_match_history" ON public.pozo_match_history;

CREATE POLICY "Owner select pozo_match_history" ON public.pozo_match_history
  FOR SELECT USING (user_uuid = public.current_user_uuid());
CREATE POLICY "Owner insert pozo_match_history" ON public.pozo_match_history
  FOR INSERT WITH CHECK (user_uuid = public.current_user_uuid());
CREATE POLICY "Owner update pozo_match_history" ON public.pozo_match_history
  FOR UPDATE USING (user_uuid = public.current_user_uuid())
  WITH CHECK (user_uuid = public.current_user_uuid());
CREATE POLICY "Owner delete pozo_match_history" ON public.pozo_match_history
  FOR DELETE USING (user_uuid = public.current_user_uuid());

-- ---------------------------------------------------------------------------
-- test_users (identity registry): each identity is only managed by itself.
-- The postgres role (used by tooling/E2E via pg) bypasses RLS entirely.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can read test_users" ON public.test_users;
DROP POLICY IF EXISTS "Anyone can insert test_users" ON public.test_users;
DROP POLICY IF EXISTS "Anyone can update test_users" ON public.test_users;
DROP POLICY IF EXISTS "Anyone can delete test_users" ON public.test_users;

CREATE POLICY "Owner select test_users" ON public.test_users
  FOR SELECT USING (id = public.current_user_uuid());
CREATE POLICY "Owner insert test_users" ON public.test_users
  FOR INSERT WITH CHECK (id = public.current_user_uuid());
CREATE POLICY "Owner update test_users" ON public.test_users
  FOR UPDATE USING (id = public.current_user_uuid())
  WITH CHECK (id = public.current_user_uuid());
CREATE POLICY "Owner delete test_users" ON public.test_users
  FOR DELETE USING (id = public.current_user_uuid());
