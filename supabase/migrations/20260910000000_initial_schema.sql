-- ============================================================================
-- PozoPadel — Consolidated baseline schema (idempotent).
--
-- Previous migrations have been squashed into this single file so that
-- `supabase db reset` (or applying all .sql in order) rebuilds the exact same
-- schema that was previously assembled across 14 incremental migrations.
-- The target state is captured from the live database (2026-09).
--
-- It is written to be idempotent: safe to run both on a fresh database (full
-- creation) and on an already-migrated one (no-op via IF NOT EXISTS /
-- CREATE OR REPLACE / DROP POLICY IF EXISTS).
--
-- Security model:
--   * RLS enabled on every table, scoped by owner (user_uuid / created_by)
--     against the current signed identity (current_user_uuid()).
--   * Least privilege: the public `anon` role only has SELECT; the app's
--     `authenticated` role holds full DML. `service_role` keeps wholesale
--     access for server-side tooling.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Extension
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Identity registry: test_users (guest / admin). NOT players.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.test_users (
  id UUID PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  role TEXT CHECK (role IN ('guest', 'admin')) NOT NULL DEFAULT 'guest',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

INSERT INTO public.test_users (id, username, role) VALUES
  ('00000000-0000-0000-0000-000000000001', 'guest', 'guest')
  ON CONFLICT DO NOTHING;
INSERT INTO public.test_users (id, username, role) VALUES
  ('00000000-0000-0000-0000-000000000002', 'admin', 'admin')
  ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Players
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('MALE', 'FEMALE')) NOT NULL DEFAULT 'MALE',
  dominant_hand TEXT CHECK (dominant_hand IN ('RIGHT', 'LEFT')) NOT NULL DEFAULT 'RIGHT',
  level NUMERIC(3, 1) CHECK (level >= 1.0 AND level <= 10.0) NOT NULL DEFAULT 3.5,
  avatar_url TEXT,
  user_uuid UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS profiles_user_uuid_idx ON public.profiles (user_uuid);

-- ---------------------------------------------------------------------------
-- Drawn pairs (sorteo)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.drawn_pairs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pair_number INT NOT NULL,
  player1_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  player2_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  draw_method TEXT DEFAULT 'random',
  user_uuid UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS drawn_pairs_user_uuid_idx ON public.drawn_pairs (user_uuid);

-- ---------------------------------------------------------------------------
-- Tournaments (POZOS)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tournaments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  created_by UUID REFERENCES public.test_users(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('draft', 'in_progress', 'completed')) DEFAULT 'draft' NOT NULL,
  number_of_courts INT NOT NULL CHECK (number_of_courts >= 1),
  minutes_per_round INT NOT NULL DEFAULT 15,
  champion_drawn_pair_id UUID REFERENCES public.drawn_pairs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ---------------------------------------------------------------------------
-- Rounds
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pozo_rounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
  round_number INT NOT NULL,
  status TEXT DEFAULT 'in_progress' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(tournament_id, round_number)
);

-- ---------------------------------------------------------------------------
-- Round <-> pair assignment per court
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tournament_drawn_pairs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
  drawn_pair_id UUID REFERENCES public.drawn_pairs(id) ON DELETE CASCADE NOT NULL,
  court_number INT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(tournament_id, drawn_pair_id)
);

CREATE TABLE IF NOT EXISTS public.pozo_round_pairs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  round_id UUID REFERENCES public.pozo_rounds(id) ON DELETE CASCADE NOT NULL,
  drawn_pair_id UUID REFERENCES public.drawn_pairs(id) ON DELETE CASCADE NOT NULL,
  court_number INT NOT NULL,
  winner_drawn_pair_id UUID REFERENCES public.drawn_pairs(id) ON DELETE SET NULL,
  score_a INT,
  score_b INT,
  is_finished BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ---------------------------------------------------------------------------
-- Match history (decisive pozo matches: winners/losers + denormalized player
-- data so deleted players can be re-incorporated into future draws).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pozo_match_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE SET NULL,
  round_id UUID REFERENCES public.pozo_rounds(id) ON DELETE SET NULL,
  round_number INT,
  court_number INT NOT NULL,
  winner_player1_id UUID NOT NULL,
  winner_player2_id UUID NOT NULL,
  loser_player1_id UUID NOT NULL,
  loser_player2_id UUID NOT NULL,
  winner_drawn_pair_id UUID,
  loser_drawn_pair_id UUID,
  score_winner INT,
  score_loser INT,
  winner_player1_name TEXT,
  winner_player1_gender TEXT,
  winner_player1_hand TEXT,
  winner_player1_level NUMERIC,
  winner_player2_name TEXT,
  winner_player2_gender TEXT,
  winner_player2_hand TEXT,
  winner_player2_level NUMERIC,
  loser_player1_name TEXT,
  loser_player1_gender TEXT,
  loser_player1_hand TEXT,
  loser_player1_level NUMERIC,
  loser_player2_name TEXT,
  loser_player2_gender TEXT,
  loser_player2_hand TEXT,
  loser_player2_level NUMERIC,
  user_uuid UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(tournament_id, round_id, court_number)
);

CREATE INDEX IF NOT EXISTS pozo_match_history_user_uuid_idx
  ON public.pozo_match_history (user_uuid);

-- ---------------------------------------------------------------------------
-- Request identity (signed JWT claim, with legacy header fallback)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_uuid()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims jsonb;
  identity_val text;
BEGIN
  -- 1. Prefer the signed JWT's user_uuid claim (standard Supabase identity).
  BEGIN
    claims := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
    IF claims IS NOT NULL THEN
      identity_val := claims->>'user_uuid';
      IF identity_val IS NOT NULL AND identity_val <> '' THEN
        RETURN identity_val::uuid;
      END IF;
      identity_val := claims->>'sub';
      IF identity_val IS NOT NULL AND identity_val <> '' THEN
        RETURN identity_val::uuid;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- 2. Fallback to a previously-registered request header (best effort).
  BEGIN
    identity_val := NULLIF(current_setting('request.headers.x-user-uuid', true), '');
    IF identity_val IS NOT NULL THEN
      RETURN identity_val::uuid;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NULL;
END;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security (owner-scoped policies)
-- ---------------------------------------------------------------------------
ALTER TABLE public.test_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drawn_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pozo_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_drawn_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pozo_round_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pozo_match_history ENABLE ROW LEVEL SECURITY;

-- profiles (owns user_uuid directly)
DROP POLICY IF EXISTS "Owner select profiles" ON public.profiles;
CREATE POLICY "Owner select profiles" ON public.profiles
  FOR SELECT USING (user_uuid = public.current_user_uuid());
DROP POLICY IF EXISTS "Owner insert profiles" ON public.profiles;
CREATE POLICY "Owner insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (user_uuid = public.current_user_uuid());
DROP POLICY IF EXISTS "Owner update profiles" ON public.profiles;
CREATE POLICY "Owner update profiles" ON public.profiles
  FOR UPDATE USING (user_uuid = public.current_user_uuid())
  WITH CHECK (user_uuid = public.current_user_uuid());
DROP POLICY IF EXISTS "Owner delete profiles" ON public.profiles;
CREATE POLICY "Owner delete profiles" ON public.profiles
  FOR DELETE USING (user_uuid = public.current_user_uuid());

-- tournaments (owned via created_by)
DROP POLICY IF EXISTS "Owner select tournaments" ON public.tournaments;
CREATE POLICY "Owner select tournaments" ON public.tournaments
  FOR SELECT USING (created_by = public.current_user_uuid());
DROP POLICY IF EXISTS "Owner insert tournaments" ON public.tournaments;
CREATE POLICY "Owner insert tournaments" ON public.tournaments
  FOR INSERT WITH CHECK (created_by = public.current_user_uuid());
DROP POLICY IF EXISTS "Owner update tournaments" ON public.tournaments;
CREATE POLICY "Owner update tournaments" ON public.tournaments
  FOR UPDATE USING (created_by = public.current_user_uuid())
  WITH CHECK (created_by = public.current_user_uuid());
DROP POLICY IF EXISTS "Owner delete tournaments" ON public.tournaments;
CREATE POLICY "Owner delete tournaments" ON public.tournaments
  FOR DELETE USING (created_by = public.current_user_uuid());

-- drawn_pairs (owns user_uuid directly)
DROP POLICY IF EXISTS "Owner select drawn_pairs" ON public.drawn_pairs;
CREATE POLICY "Owner select drawn_pairs" ON public.drawn_pairs
  FOR SELECT USING (user_uuid = public.current_user_uuid());
DROP POLICY IF EXISTS "Owner insert drawn_pairs" ON public.drawn_pairs;
CREATE POLICY "Owner insert drawn_pairs" ON public.drawn_pairs
  FOR INSERT WITH CHECK (user_uuid = public.current_user_uuid());
DROP POLICY IF EXISTS "Owner update drawn_pairs" ON public.drawn_pairs;
CREATE POLICY "Owner update drawn_pairs" ON public.drawn_pairs
  FOR UPDATE USING (user_uuid = public.current_user_uuid())
  WITH CHECK (user_uuid = public.current_user_uuid());
DROP POLICY IF EXISTS "Owner delete drawn_pairs" ON public.drawn_pairs;
CREATE POLICY "Owner delete drawn_pairs" ON public.drawn_pairs
  FOR DELETE USING (user_uuid = public.current_user_uuid());

-- tournament_drawn_pairs (owned via its tournament)
DROP POLICY IF EXISTS "Owner select tournament_drawn_pairs" ON public.tournament_drawn_pairs;
CREATE POLICY "Owner select tournament_drawn_pairs" ON public.tournament_drawn_pairs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.tournaments t
            WHERE t.id = tournament_id AND t.created_by = public.current_user_uuid())
  );
DROP POLICY IF EXISTS "Owner insert tournament_drawn_pairs" ON public.tournament_drawn_pairs;
CREATE POLICY "Owner insert tournament_drawn_pairs" ON public.tournament_drawn_pairs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.tournaments t
            WHERE t.id = tournament_id AND t.created_by = public.current_user_uuid())
  );
DROP POLICY IF EXISTS "Owner update tournament_drawn_pairs" ON public.tournament_drawn_pairs;
CREATE POLICY "Owner update tournament_drawn_pairs" ON public.tournament_drawn_pairs
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.tournaments t
            WHERE t.id = tournament_id AND t.created_by = public.current_user_uuid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.tournaments t
            WHERE t.id = tournament_id AND t.created_by = public.current_user_uuid())
  );
DROP POLICY IF EXISTS "Owner delete tournament_drawn_pairs" ON public.tournament_drawn_pairs;
CREATE POLICY "Owner delete tournament_drawn_pairs" ON public.tournament_drawn_pairs
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.tournaments t
            WHERE t.id = tournament_id AND t.created_by = public.current_user_uuid())
  );

-- pozo_rounds (owned via its tournament)
DROP POLICY IF EXISTS "Owner select pozo_rounds" ON public.pozo_rounds;
CREATE POLICY "Owner select pozo_rounds" ON public.pozo_rounds
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.tournaments t
            WHERE t.id = tournament_id AND t.created_by = public.current_user_uuid())
  );
DROP POLICY IF EXISTS "Owner insert pozo_rounds" ON public.pozo_rounds;
CREATE POLICY "Owner insert pozo_rounds" ON public.pozo_rounds
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.tournaments t
            WHERE t.id = tournament_id AND t.created_by = public.current_user_uuid())
  );
DROP POLICY IF EXISTS "Owner update pozo_rounds" ON public.pozo_rounds;
CREATE POLICY "Owner update pozo_rounds" ON public.pozo_rounds
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.tournaments t
            WHERE t.id = tournament_id AND t.created_by = public.current_user_uuid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.tournaments t
            WHERE t.id = tournament_id AND t.created_by = public.current_user_uuid())
  );
DROP POLICY IF EXISTS "Owner delete pozo_rounds" ON public.pozo_rounds;
CREATE POLICY "Owner delete pozo_rounds" ON public.pozo_rounds
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.tournaments t
            WHERE t.id = tournament_id AND t.created_by = public.current_user_uuid())
  );

-- pozo_round_pairs (owned via round -> tournament)
DROP POLICY IF EXISTS "Owner select pozo_round_pairs" ON public.pozo_round_pairs;
CREATE POLICY "Owner select pozo_round_pairs" ON public.pozo_round_pairs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.pozo_rounds pr
            JOIN public.tournaments t ON t.id = pr.tournament_id
            WHERE pr.id = round_id AND t.created_by = public.current_user_uuid())
  );
DROP POLICY IF EXISTS "Owner insert pozo_round_pairs" ON public.pozo_round_pairs;
CREATE POLICY "Owner insert pozo_round_pairs" ON public.pozo_round_pairs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.pozo_rounds pr
            JOIN public.tournaments t ON t.id = pr.tournament_id
            WHERE pr.id = round_id AND t.created_by = public.current_user_uuid())
  );
DROP POLICY IF EXISTS "Owner update pozo_round_pairs" ON public.pozo_round_pairs;
CREATE POLICY "Owner update pozo_round_pairs" ON public.pozo_round_pairs
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.pozo_rounds pr
            JOIN public.tournaments t ON t.id = pr.tournament_id
            WHERE pr.id = round_id AND t.created_by = public.current_user_uuid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.pozo_rounds pr
            JOIN public.tournaments t ON t.id = pr.tournament_id
            WHERE pr.id = round_id AND t.created_by = public.current_user_uuid())
  );
DROP POLICY IF EXISTS "Owner delete pozo_round_pairs" ON public.pozo_round_pairs;
CREATE POLICY "Owner delete pozo_round_pairs" ON public.pozo_round_pairs
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.pozo_rounds pr
            JOIN public.tournaments t ON t.id = pr.tournament_id
            WHERE pr.id = round_id AND t.created_by = public.current_user_uuid())
  );

-- pozo_match_history (owns user_uuid directly)
DROP POLICY IF EXISTS "Owner select pozo_match_history" ON public.pozo_match_history;
CREATE POLICY "Owner select pozo_match_history" ON public.pozo_match_history
  FOR SELECT USING (user_uuid = public.current_user_uuid());
DROP POLICY IF EXISTS "Owner insert pozo_match_history" ON public.pozo_match_history;
CREATE POLICY "Owner insert pozo_match_history" ON public.pozo_match_history
  FOR INSERT WITH CHECK (user_uuid = public.current_user_uuid());
DROP POLICY IF EXISTS "Owner update pozo_match_history" ON public.pozo_match_history;
CREATE POLICY "Owner update pozo_match_history" ON public.pozo_match_history
  FOR UPDATE USING (user_uuid = public.current_user_uuid())
  WITH CHECK (user_uuid = public.current_user_uuid());
DROP POLICY IF EXISTS "Owner delete pozo_match_history" ON public.pozo_match_history;
CREATE POLICY "Owner delete pozo_match_history" ON public.pozo_match_history
  FOR DELETE USING (user_uuid = public.current_user_uuid());

-- test_users (identity registry: each identity manages itself)
DROP POLICY IF EXISTS "Owner select test_users" ON public.test_users;
CREATE POLICY "Owner select test_users" ON public.test_users
  FOR SELECT USING (id = public.current_user_uuid());
DROP POLICY IF EXISTS "Owner insert test_users" ON public.test_users;
CREATE POLICY "Owner insert test_users" ON public.test_users
  FOR INSERT WITH CHECK (id = public.current_user_uuid());
DROP POLICY IF EXISTS "Owner update test_users" ON public.test_users;
CREATE POLICY "Owner update test_users" ON public.test_users
  FOR UPDATE USING (id = public.current_user_uuid())
  WITH CHECK (id = public.current_user_uuid());
DROP POLICY IF EXISTS "Owner delete test_users" ON public.test_users;
CREATE POLICY "Owner delete test_users" ON public.test_users
  FOR DELETE USING (id = public.current_user_uuid());

-- ---------------------------------------------------------------------------
-- Least-privilege grants
--   anon (public key):           SELECT only (RLS filters to nothing without a
--                                signed identity claim).
--   authenticated (app + signed JWT): full DML (RLS scopes rows to owner).
--   service_role:                wholesale (server-side tooling bypasses RLS).
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'profiles', 'tournaments', 'drawn_pairs', 'tournament_drawn_pairs',
    'pozo_rounds', 'pozo_round_pairs', 'pozo_match_history', 'test_users'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('GRANT SELECT ON public.%I TO anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.%I TO authenticated', t);
  END LOOP;
END $$;