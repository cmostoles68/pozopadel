-- Denormalize player data into the match history so deleted players can be
-- re-incorporated into future draws (name/gender/dominant_hand/level).
ALTER TABLE public.pozo_match_history
  ADD COLUMN IF NOT EXISTS winner_player1_name TEXT,
  ADD COLUMN IF NOT EXISTS winner_player1_gender TEXT,
  ADD COLUMN IF NOT EXISTS winner_player1_hand TEXT,
  ADD COLUMN IF NOT EXISTS winner_player1_level NUMERIC,
  ADD COLUMN IF NOT EXISTS winner_player2_name TEXT,
  ADD COLUMN IF NOT EXISTS winner_player2_gender TEXT,
  ADD COLUMN IF NOT EXISTS winner_player2_hand TEXT,
  ADD COLUMN IF NOT EXISTS winner_player2_level NUMERIC,
  ADD COLUMN IF NOT EXISTS loser_player1_name TEXT,
  ADD COLUMN IF NOT EXISTS loser_player1_gender TEXT,
  ADD COLUMN IF NOT EXISTS loser_player1_hand TEXT,
  ADD COLUMN IF NOT EXISTS loser_player1_level NUMERIC,
  ADD COLUMN IF NOT EXISTS loser_player2_name TEXT,
  ADD COLUMN IF NOT EXISTS loser_player2_gender TEXT,
  ADD COLUMN IF NOT EXISTS loser_player2_hand TEXT,
  ADD COLUMN IF NOT EXISTS loser_player2_level NUMERIC;

-- Backfill existing rows from the current profiles (resolve ids to data).
UPDATE public.pozo_match_history h SET
  winner_player1_name = wp1.full_name,
  winner_player1_gender = wp1.gender,
  winner_player1_hand = wp1.dominant_hand,
  winner_player1_level = wp1.level,
  winner_player2_name = wp2.full_name,
  winner_player2_gender = wp2.gender,
  winner_player2_hand = wp2.dominant_hand,
  winner_player2_level = wp2.level,
  loser_player1_name = lp1.full_name,
  loser_player1_gender = lp1.gender,
  loser_player1_hand = lp1.dominant_hand,
  loser_player1_level = lp1.level,
  loser_player2_name = lp2.full_name,
  loser_player2_gender = lp2.gender,
  loser_player2_hand = lp2.dominant_hand,
  loser_player2_level = lp2.level
FROM public.profiles wp1, public.profiles wp2, public.profiles lp1, public.profiles lp2
WHERE wp1.id = h.winner_player1_id
  AND wp2.id = h.winner_player2_id
  AND lp1.id = h.loser_player1_id
  AND lp2.id = h.loser_player2_id
  AND h.winner_player1_name IS NULL;
