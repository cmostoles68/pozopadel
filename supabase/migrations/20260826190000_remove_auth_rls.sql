-- Remove auth dependency from profiles
-- Drop foreign key and add default for id

-- Drop existing policies
DROP POLICY IF EXISTS "Public profiles read" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;

-- Remove auth.users foreign key and add default UUID
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles ALTER COLUMN id SET DEFAULT uuid_generate_v4();

-- Update policies for full access without auth
CREATE POLICY "Anyone can read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Anyone can insert profiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update profiles" ON public.profiles FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete profiles" ON public.profiles FOR DELETE USING (true);

-- Relax tournament insert policy
DROP POLICY IF EXISTS "Auth users create tournaments" ON public.tournaments;
CREATE POLICY "Anyone can create tournaments" ON public.tournaments FOR INSERT WITH CHECK (true);

-- Relax tournament_players insert policy
DROP POLICY IF EXISTS "Auth players join" ON public.tournament_players;
CREATE POLICY "Anyone can join tournaments" ON public.tournament_players FOR INSERT WITH CHECK (true);

-- Relax rounds write policy
DROP POLICY IF EXISTS "Admin write rounds" ON public.rounds;
CREATE POLICY "Anyone can manage rounds" ON public.rounds FOR ALL USING (true);

-- Relax matches write policy
DROP POLICY IF EXISTS "Auth update matches" ON public.matches;
CREATE POLICY "Anyone can manage matches" ON public.matches FOR ALL USING (true);

-- Relax tournaments update policy
DROP POLICY IF EXISTS "Creators update tournaments" ON public.tournaments;
CREATE POLICY "Anyone can update tournaments" ON public.tournaments FOR UPDATE USING (true);

-- Relax tournaments delete policy
CREATE POLICY "Anyone can delete tournaments" ON public.tournaments FOR DELETE USING (true);

-- Grant table permissions to anon and authenticated roles (required by PostgREST)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournaments TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournament_players TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rounds TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.matches TO anon, authenticated;
