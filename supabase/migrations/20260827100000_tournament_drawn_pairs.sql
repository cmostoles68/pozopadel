CREATE TABLE IF NOT EXISTS public.tournament_drawn_pairs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
  drawn_pair_id UUID REFERENCES public.drawn_pairs(id) ON DELETE CASCADE NOT NULL,
  court_number INT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(tournament_id, drawn_pair_id)
);

ALTER TABLE public.tournament_drawn_pairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read tournament_drawn_pairs" ON public.tournament_drawn_pairs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert tournament_drawn_pairs" ON public.tournament_drawn_pairs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete tournament_drawn_pairs" ON public.tournament_drawn_pairs FOR DELETE USING (true);
CREATE POLICY "Anyone can update tournament_drawn_pairs" ON public.tournament_drawn_pairs FOR UPDATE USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournament_drawn_pairs TO anon, authenticated;
