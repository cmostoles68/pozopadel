-- Create test users table for E2E tests
CREATE TABLE IF NOT EXISTS public.test_users (
  id UUID PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  role TEXT CHECK (role IN ('guest', 'admin')) NOT NULL DEFAULT 'guest',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.test_users ENABLE ROW LEVEL SECURITY;

-- Allow public read/write for tests
CREATE POLICY "Anyone can read test_users" ON public.test_users FOR SELECT USING (true);
CREATE POLICY "Anyone can insert test_users" ON public.test_users FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update test_users" ON public.test_users FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete test_users" ON public.test_users FOR DELETE USING (true);

-- Insert test users with fixed UUIDs
INSERT INTO public.test_users (id, username, role) VALUES ('00000000-0000-0000-0000-000000000001', 'guest', 'guest') ON CONFLICT DO NOTHING;
INSERT INTO public.test_users (id, username, role) VALUES ('00000000-0000-0000-0000-000000000002', 'admin', 'admin') ON CONFLICT DO NOTHING;

-- Ensure tournament ownership points to the non-player user registry.
ALTER TABLE public.tournaments
  DROP CONSTRAINT IF EXISTS tournaments_created_by_fkey,
  ADD CONSTRAINT tournaments_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.test_users(id) ON DELETE CASCADE;
