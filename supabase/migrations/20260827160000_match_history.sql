-- Historical record of played pozo matches (one row per court per round).
-- This is an immutable-ish log used to enrich the draw algorithm (e.g. avoid
-- re-forming pairs that keep winning together). Player ids are denormalized so
-- the history survives drawn_pairs being wiped on a re-draw.
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
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(tournament_id, round_id, court_number)
);

ALTER TABLE public.pozo_match_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read pozo_match_history" ON public.pozo_match_history FOR SELECT USING (true);
CREATE POLICY "Anyone can insert pozo_match_history" ON public.pozo_match_history FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update pozo_match_history" ON public.pozo_match_history FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete pozo_match_history" ON public.pozo_match_history FOR DELETE USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pozo_match_history TO anon, authenticated;
