ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS champion_drawn_pair_id UUID REFERENCES public.drawn_pairs(id) ON DELETE SET NULL;
