-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLA PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('MALE', 'FEMALE')) NOT NULL DEFAULT 'MALE',
  dominant_hand TEXT CHECK (dominant_hand IN ('RIGHT', 'LEFT')) NOT NULL DEFAULT 'RIGHT',
  level NUMERIC(3, 1) CHECK (level >= 1.0 AND level <= 10.0) NOT NULL DEFAULT 3.5,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. TABLA TOURNAMENTS (POZOS)
CREATE TABLE IF NOT EXISTS public.tournaments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('draft', 'in_progress', 'completed')) DEFAULT 'draft' NOT NULL,
  number_of_courts INT NOT NULL CHECK (number_of_courts >= 1),
  minutes_per_round INT NOT NULL DEFAULT 15,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. TABLA TOURNAMENT_PLAYERS
CREATE TABLE IF NOT EXISTS public.tournament_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  total_points INT DEFAULT 0 NOT NULL,
  current_court INT DEFAULT 1 NOT NULL,
  UNIQUE(tournament_id, player_id)
);

-- 4. TABLA ROUNDS
CREATE TABLE IF NOT EXISTS public.rounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
  round_number INT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'in_progress', 'finished')) DEFAULT 'pending' NOT NULL,
  start_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(tournament_id, round_number)
);

-- 5. TABLA MATCHES
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  round_id UUID REFERENCES public.rounds(id) ON DELETE CASCADE NOT NULL,
  court_number INT NOT NULL,
  player1_id UUID REFERENCES public.profiles(id) NOT NULL,
  player2_id UUID REFERENCES public.profiles(id) NOT NULL,
  player3_id UUID REFERENCES public.profiles(id) NOT NULL,
  player4_id UUID REFERENCES public.profiles(id) NOT NULL,
  score_team_a INT DEFAULT 0 NOT NULL,
  score_team_b INT DEFAULT 0 NOT NULL,
  is_finished BOOLEAN DEFAULT FALSE NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- HABILITAR RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS DE LECTURA PÚBLICA / ESCRITURA AUTENTICADA
CREATE POLICY "Public profiles read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Public tournaments read" ON public.tournaments FOR SELECT USING (true);
CREATE POLICY "Auth users create tournaments" ON public.tournaments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Creators update tournaments" ON public.tournaments FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Public tournament_players read" ON public.tournament_players FOR SELECT USING (true);
CREATE POLICY "Auth players join" ON public.tournament_players FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Public rounds read" ON public.rounds FOR SELECT USING (true);
CREATE POLICY "Admin write rounds" ON public.rounds FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Public matches read" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Auth update matches" ON public.matches FOR ALL USING (auth.role() = 'authenticated');

-- TRIGGER AUTOMÁTICO AL REGISTRARSE UN USUARIO
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

-- PUBLICACIÓN PUBLIC FOR REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE rounds;