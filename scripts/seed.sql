-- Seed de datos de ejemplo para comprobar "pozos ganados"
-- Idempotente: limpia y reinserta jugadores, parejas, torneos completados y partidos.
BEGIN;

-- Función auxiliar: inserta el histórico de partidos de un torneo.
-- La pista 1 define al campeón; la pista 2 es el enfrentamiento de los otros dos.
CREATE OR REPLACE FUNCTION public.seed_tournament_matches(
  t UUID,
  champ UUID, cage UUID, third UUID, fourth UUID
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.pozo_match_history (
    tournament_id, round_number, court_number,
    winner_player1_id, winner_player2_id, loser_player1_id, loser_player2_id,
    winner_drawn_pair_id, loser_drawn_pair_id, score_winner, score_loser,
    winner_player1_name, winner_player2_name, loser_player1_name, loser_player2_name,
    winner_player1_hand, winner_player2_hand, loser_player1_hand, loser_player2_hand,
    winner_player1_level, winner_player2_level, loser_player1_level, loser_player2_level
  )
  SELECT
    t, 1, 1,
    w1.player1_id, w1.player2_id, l.player1_id, l.player2_id,
    w1.id, l.id, 3, 1,
    pw1.full_name, pw2.full_name, pl1.full_name, pl2.full_name,
    pw1.dominant_hand, pw2.dominant_hand, pl1.dominant_hand, pl2.dominant_hand,
    pw1.level, pw2.level, pl1.level, pl2.level
  FROM public.drawn_pairs w1
  JOIN public.drawn_pairs l ON l.id = cage
  JOIN public.profiles pw1 ON pw1.id = w1.player1_id
  JOIN public.profiles pw2 ON pw2.id = w1.player2_id
  JOIN public.profiles pl1 ON pl1.id = l.player1_id
  JOIN public.profiles pl2 ON pl2.id = l.player2_id
  WHERE w1.id = champ;

  INSERT INTO public.pozo_match_history (
    tournament_id, round_number, court_number,
    winner_player1_id, winner_player2_id, loser_player1_id, loser_player2_id,
    winner_drawn_pair_id, loser_drawn_pair_id, score_winner, score_loser,
    winner_player1_name, winner_player2_name, loser_player1_name, loser_player2_name,
    winner_player1_hand, winner_player2_hand, loser_player1_hand, loser_player2_hand,
    winner_player1_level, winner_player2_level, loser_player1_level, loser_player2_level
  )
  SELECT
    t, 1, 2,
    w.player1_id, w.player2_id, f.player1_id, f.player2_id,
    w.id, f.id, 2, 0,
    pw1.full_name, pw2.full_name, pf1.full_name, pf2.full_name,
    pw1.dominant_hand, pw2.dominant_hand, pf1.dominant_hand, pf2.dominant_hand,
    pw1.level, pw2.level, pf1.level, pf2.level
  FROM public.drawn_pairs w
  JOIN public.drawn_pairs f ON f.id = fourth
  JOIN public.profiles pw1 ON pw1.id = w.player1_id
  JOIN public.profiles pw2 ON pw2.id = w.player2_id
  JOIN public.profiles pf1 ON pf1.id = f.player1_id
  JOIN public.profiles pf2 ON pf2.id = f.player2_id
  WHERE w.id = third;
END $$ LANGUAGE plpgsql;

-- Limpieza en orden (respetando FKs)
DELETE FROM public.pozo_match_history;
DELETE FROM public.pozo_round_pairs;
DELETE FROM public.pozo_rounds;
DELETE FROM public.tournament_drawn_pairs;
DELETE FROM public.tournaments;
DELETE FROM public.drawn_pairs;
DELETE FROM public.tournament_players;
DELETE FROM public.rounds;
DELETE FROM public.matches;
DELETE FROM public.profiles;

DO $$
DECLARE
  p1 UUID; p2 UUID; p3 UUID; p4 UUID;
  p5 UUID; p6 UUID; p7 UUID; p8 UUID;
  pair1 UUID; pair2 UUID; pair3 UUID; pair4 UUID;
  t1 UUID; t2 UUID; t3 UUID; t4 UUID; t5 UUID;
BEGIN
  -- Jugadores
  INSERT INTO public.profiles (full_name, gender, dominant_hand, level)
  VALUES ('Carlos Ruiz', 'MALE', 'RIGHT', 7.0) RETURNING id INTO p1;
  INSERT INTO public.profiles (full_name, gender, dominant_hand, level)
  VALUES ('Miguel Torres', 'MALE', 'LEFT', 6.5) RETURNING id INTO p2;
  INSERT INTO public.profiles (full_name, gender, dominant_hand, level)
  VALUES ('Andrés Gómez', 'MALE', 'RIGHT', 5.5) RETURNING id INTO p3;
  INSERT INTO public.profiles (full_name, gender, dominant_hand, level)
  VALUES ('Javier Molina', 'MALE', 'RIGHT', 5.0) RETURNING id INTO p4;
  INSERT INTO public.profiles (full_name, gender, dominant_hand, level)
  VALUES ('Pablo Sosa', 'MALE', 'LEFT', 4.5) RETURNING id INTO p5;
  INSERT INTO public.profiles (full_name, gender, dominant_hand, level)
  VALUES ('Luis Ortega', 'MALE', 'RIGHT', 4.0) RETURNING id INTO p6;
  INSERT INTO public.profiles (full_name, gender, dominant_hand, level)
  VALUES ('Sergio Vidal', 'MALE', 'RIGHT', 3.5) RETURNING id INTO p7;
  INSERT INTO public.profiles (full_name, gender, dominant_hand, level)
  VALUES ('David Navarro', 'MALE', 'LEFT', 3.0) RETURNING id INTO p8;

  -- Perfiles de test (dependencias de los tests E2E)
  INSERT INTO public.profiles (full_name, gender, dominant_hand, level)
  VALUES
    ('Ana Vega',       'FEMALE', 'RIGHT', 6.0),
    ('Andrés Moreno',  'MALE',   'RIGHT', 6.5),
    ('Juan García',    'MALE',   'LEFT',  5.0),
    ('Elena Castro',   'FEMALE', 'RIGHT', 4.0),
    ('Pedro Martín',   'MALE',   'RIGHT', 4.5),
    ('Lucía Romero',   'FEMALE', 'LEFT',  4.0),
    ('Pablo Torres',   'MALE',   'RIGHT', 3.5),
    ('Sara Gil',       'FEMALE', 'RIGHT', 3.0);

  -- Parejas sorteadas
  INSERT INTO public.drawn_pairs (pair_number, player1_id, player2_id, draw_method)
  VALUES (1, p1, p2, 'level') RETURNING id INTO pair1;
  INSERT INTO public.drawn_pairs (pair_number, player1_id, player2_id, draw_method)
  VALUES (2, p3, p4, 'level') RETURNING id INTO pair2;
  INSERT INTO public.drawn_pairs (pair_number, player1_id, player2_id, draw_method)
  VALUES (3, p5, p6, 'level') RETURNING id INTO pair3;
  INSERT INTO public.drawn_pairs (pair_number, player1_id, player2_id, draw_method)
  VALUES (4, p7, p8, 'level') RETURNING id INTO pair4;

  -- Torneos completados (el campeón se asigna por UPDATE posterior)
  INSERT INTO public.tournaments (title, created_by, status, number_of_courts, minutes_per_round)
  VALUES ('Pozo Lunes', p1, 'completed', 2, 15) RETURNING id INTO t1;
  INSERT INTO public.tournaments (title, created_by, status, number_of_courts, minutes_per_round)
  VALUES ('Pozo Miércoles', p2, 'completed', 2, 15) RETURNING id INTO t2;
  INSERT INTO public.tournaments (title, created_by, status, number_of_courts, minutes_per_round)
  VALUES ('Pozo Viernes', p3, 'completed', 2, 15) RETURNING id INTO t3;
  INSERT INTO public.tournaments (title, created_by, status, number_of_courts, minutes_per_round)
  VALUES ('Pozo Sábado', p4, 'completed', 2, 15) RETURNING id INTO t4;
  INSERT INTO public.tournaments (title, created_by, status, number_of_courts, minutes_per_round)
  VALUES ('Pozo Domingo', p5, 'completed', 2, 15) RETURNING id INTO t5;

  UPDATE public.tournaments SET champion_drawn_pair_id = pair1 WHERE id = t1;
  UPDATE public.tournaments SET champion_drawn_pair_id = pair1 WHERE id = t2;
  UPDATE public.tournaments SET champion_drawn_pair_id = pair2 WHERE id = t3;
  UPDATE public.tournaments SET champion_drawn_pair_id = pair1 WHERE id = t4;
  UPDATE public.tournaments SET champion_drawn_pair_id = pair1 WHERE id = t5;

  -- Selección de parejas por torneo
  INSERT INTO public.tournament_drawn_pairs (tournament_id, drawn_pair_id, court_number)
  VALUES
    (t1, pair1, 1), (t1, pair2, 1), (t1, pair3, 2), (t1, pair4, 2),
    (t2, pair1, 1), (t2, pair2, 1), (t2, pair3, 2), (t2, pair4, 2),
    (t3, pair1, 1), (t3, pair2, 1), (t3, pair3, 2), (t3, pair4, 2),
    (t4, pair1, 1), (t4, pair2, 1), (t4, pair3, 2), (t4, pair4, 2),
    (t5, pair1, 1), (t5, pair2, 1), (t5, pair3, 2), (t5, pair4, 2);

  -- Pista 1 define el campeón de cada torneo.
  -- T1,T2,T4,T5 -> campeón pair1 (Carlos+Miguel, 4 pozos); T3 -> campeón pair2 (Andrés+Javier, 1)
  PERFORM public.seed_tournament_matches(t1, pair1, pair2, pair3, pair4);
  PERFORM public.seed_tournament_matches(t2, pair1, pair2, pair3, pair4);
  PERFORM public.seed_tournament_matches(t3, pair2, pair1, pair3, pair4);
  PERFORM public.seed_tournament_matches(t4, pair1, pair2, pair3, pair4);
  PERFORM public.seed_tournament_matches(t5, pair1, pair2, pair3, pair4);
END $$;

COMMIT;
