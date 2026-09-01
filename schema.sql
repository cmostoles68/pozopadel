-- Clean Pozopadel Database Schema (Modern Pozo Flow Only)
-- Eliminates all legacy tournament engine tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLA PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('MALE', 'FEMALE')) NOT NULL DEFAULT 'MALE',
  dominant_hand TEXT CHECK (dominant_hand IN ('RIGHT', 'LEFT')) NOT NULL DEFAULT 'RIGHT',
  level NUMERIC(3, 1) CHECK (level >= 1.0 AND level <= 10.0) NOT NULL DEFAULT 3.5,
  avatar_url TEXT,
  user_uuid UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. TABLA TOURNAMENTS (POZOS) - Modern flow only
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

-- 3. TABLA TEST_USERS (Usuarios de prueba para E2E tests)
CREATE TABLE IF NOT EXISTS public.test_users (
  id UUID PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  role TEXT CHECK (role IN ('guest', 'admin')) NOT NULL DEFAULT 'guest',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3b. TABLA DRAWN_PAIRS (Sorteo de parejas)
CREATE TABLE IF NOT EXISTS public.drawn_pairs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pair_number INT NOT NULL,
  player1_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  player2_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  draw_method TEXT DEFAULT 'random',
  user_uuid UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. TABLA TOURNAMENT_DRAWN_PAIRS (Vinculación pareja ↔ torneo)
CREATE TABLE IF NOT EXISTS public.tournament_drawn_pairs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
  drawn_pair_id UUID REFERENCES public.drawn_pairs(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(tournament_id, drawn_pair_id)
);

-- 5. TABLA POZO_ROUNDS (Rondas del pozo moderno)
CREATE TABLE IF NOT EXISTS public.pozo_rounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
  round_number INT NOT NULL,
  status TEXT DEFAULT 'in_progress' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(tournament_id, round_number)
);

-- 6. TABLA POZO_ROUND_PAIRS (Asignación pista/pareja por ronda)
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

-- 7. TABLA POZO_MATCH_HISTORY (Histórico de partidos jugados)
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
  user_uuid UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(tournament_id, round_id, court_number)
);

-- Enable RLS on all modern tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drawn_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_drawn_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pozo_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pozo_round_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pozo_match_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for modern flow
-- Profiles
CREATE POLICY "Public profiles read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Test Users
CREATE POLICY "Anyone can read test_users" ON public.test_users FOR SELECT USING (true);
CREATE POLICY "Anyone can insert test_users" ON public.test_users FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update test_users" ON public.test_users FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete test_users" ON public.test_users FOR DELETE USING (true);

-- Tournaments
CREATE POLICY "Public tournaments read" ON public.tournaments FOR SELECT USING (true);
CREATE POLICY "Auth users create tournaments" ON public.tournaments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Creators update tournaments" ON public.tournaments FOR UPDATE USING (auth.uid() = created_by);

-- Drawn pairs (open access for draw operations)
CREATE POLICY "Anyone can read drawn_pairs" ON public.drawn_pairs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert drawn_pairs" ON public.drawn_pairs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete drawn_pairs" ON public.drawn_pairs FOR DELETE USING (true);

-- Tournament drawn pairs (join table)
CREATE POLICY "Anyone can read tournament_drawn_pairs" ON public.tournament_drawn_pairs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert tournament_drawn_pairs" ON public.tournament_drawn_pairs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete tournament_drawn_pairs" ON public.tournament_drawn_pairs FOR DELETE USING (true);

-- Pozo rounds (open access for gameplay)
CREATE POLICY "Anyone can read pozo_rounds" ON public.pozo_rounds FOR SELECT USING (true);
CREATE POLICY "Anyone can insert pozo_rounds" ON public.pozo_rounds FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update pozo_rounds" ON public.pozo_rounds FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete pozo_rounds" ON public.pozo_rounds FOR DELETE USING (true);

-- Pozo round pairs (score entry)
CREATE POLICY "Anyone can read pozo_round_pairs" ON public.pozo_round_pairs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert pozo_round_pairs" ON public.pozo_round_pairs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update pozo_round_pairs" ON public.pozo_round_pairs FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete pozo_round_pairs" ON public.pozo_round_pairs FOR DELETE USING (true);

-- Pozo match history (immutable log)
CREATE POLICY "Anyone can read pozo_match_history" ON public.pozo_match_history FOR SELECT USING (true);
CREATE POLICY "Anyone can insert pozo_match_history" ON public.pozo_match_history FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update pozo_match_history" ON public.pozo_match_history FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete pozo_match_history" ON public.pozo_match_history FOR DELETE USING (true);

-- Trigger on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Jugador Pádel'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant permissions on modern tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drawn_pairs TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournament_drawn_pairs TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pozo_rounds TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pozo_round_pairs TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pozo_match_history TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_users TO anon, authenticated;

-- Insert default test users
INSERT INTO public.test_users (id, username, role) VALUES ('00000000-0000-0000-0000-000000000001', 'guest', 'guest') ON CONFLICT DO NOTHING;
INSERT INTO public.test_users (id, username, role) VALUES ('00000000-0000-0000-0000-000000000002', 'admin', 'admin') ON CONFLICT DO NOTHING;

-- Realtime subscriptions (modern flow only)
ALTER PUBLICATION supabase_realtime ADD TABLE pozo_rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE pozo_round_pairs;
ALTER PUBLICATION supabase_realtime ADD TABLE pozo_match_history;