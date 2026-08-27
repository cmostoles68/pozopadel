CREATE TABLE IF NOT EXISTS public.pozo_rounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
  round_number INT NOT NULL,
  status TEXT DEFAULT 'in_progress' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(tournament_id, round_number)
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

ALTER TABLE public.pozo_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pozo_round_pairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read pozo_rounds" ON public.pozo_rounds FOR SELECT USING (true);
CREATE POLICY "Anyone can insert pozo_rounds" ON public.pozo_rounds FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update pozo_rounds" ON public.pozo_rounds FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete pozo_rounds" ON public.pozo_rounds FOR DELETE USING (true);

CREATE POLICY "Anyone can read pozo_round_pairs" ON public.pozo_round_pairs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert pozo_round_pairs" ON public.pozo_round_pairs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update pozo_round_pairs" ON public.pozo_round_pairs FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete pozo_round_pairs" ON public.pozo_round_pairs FOR DELETE USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pozo_rounds TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pozo_round_pairs TO anon, authenticated;
