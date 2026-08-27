-- Table to store drawn pairs (sorteo de parejas)
CREATE TABLE IF NOT EXISTS public.drawn_pairs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pair_number INT NOT NULL,
  player1_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  player2_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  draw_method TEXT DEFAULT 'random',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.drawn_pairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read drawn_pairs" ON public.drawn_pairs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert drawn_pairs" ON public.drawn_pairs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete drawn_pairs" ON public.drawn_pairs FOR DELETE USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.drawn_pairs TO anon, authenticated;
