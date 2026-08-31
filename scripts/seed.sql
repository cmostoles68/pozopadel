-- Seed de base de jugadores.
-- Idempotente: limpia todas las tablas de pozos y reinserta solo la base de jugadores.
BEGIN;

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

-- Base de jugadores: 40 perfiles (20 hombres / 20 mujeres), 4 zurdos (10%), niveles 2-8.
INSERT INTO public.profiles (full_name, gender, dominant_hand, level)
VALUES
  -- Perfiles de test (dependencias de los tests E2E)
  ('Ana Vega',       'FEMALE', 'RIGHT', 6.0),
  ('Andrés Moreno',  'MALE',   'RIGHT', 6.5),
  ('Juan García',    'MALE',   'LEFT',  5.0),
  ('Elena Castro',   'FEMALE', 'RIGHT', 4.0),
  ('Pedro Martín',   'MALE',   'RIGHT', 4.5),
  ('Lucía Romero',   'FEMALE', 'RIGHT', 4.0),
  ('Pablo Torres',   'MALE',   'RIGHT', 3.5),
  ('Sara Gil',       'FEMALE', 'RIGHT', 3.0),
  -- Hombres (12)
  ('Carlos Ruiz',      'MALE',   'RIGHT', 8.0),
  ('Miguel Torres',    'MALE',   'LEFT',  6.5),
  ('Andrés Gómez',     'MALE',   'RIGHT', 5.5),
  ('Javier Molina',    'MALE',   'RIGHT', 5.0),
  ('Pablo Sosa',       'MALE',   'LEFT',  4.5),
  ('Luis Ortega',      'MALE',   'RIGHT', 4.0),
  ('Sergio Vidal',     'MALE',   'RIGHT', 3.5),
  ('David Navarro',    'MALE',   'RIGHT', 3.0),
  ('Raúl Campos',      'MALE',   'RIGHT', 7.5),
  ('Iván Peña',        'MALE',   'RIGHT', 6.0),
  ('Gonzalo Ríos',     'MALE',   'RIGHT', 5.5),
  ('Adrián Izquierdo', 'MALE',   'LEFT',  5.0),
  ('Marcos Ferrer',    'MALE',   'RIGHT', 4.5),
  ('Rubén Soler',      'MALE',   'RIGHT', 4.0),
  ('Óscar Ibáñez',     'MALE',   'RIGHT', 3.5),
  ('Diego Montero',    'MALE',   'RIGHT', 2.0),
  -- Mujeres (16)
  ('Marta Roldán',    'FEMALE', 'RIGHT', 8.0),
  ('Laura Pineda',    'FEMALE', 'RIGHT', 7.0),
  ('Carmen Aranda',   'FEMALE', 'RIGHT', 6.5),
  ('Silvia Reina',    'FEMALE', 'RIGHT', 6.0),
  ('Nuria Castejón',  'FEMALE', 'RIGHT', 5.5),
  ('Aitana Bravo',    'FEMALE', 'RIGHT', 5.0),
  ('Inés Valero',     'FEMALE', 'RIGHT', 4.5),
  ('Carla Duarte',    'FEMALE', 'RIGHT', 4.0),
  ('Vega Salinas',    'FEMALE', 'RIGHT', 3.5),
  ('Noelia Parra',    'FEMALE', 'RIGHT', 3.0),
  ('Alba Cordero',    'FEMALE', 'RIGHT', 5.0),
  ('Rocío Mena',      'FEMALE', 'RIGHT', 4.0),
  ('Patricia Luque',  'FEMALE', 'RIGHT', 4.5),
  ('Gemma Pardo',     'FEMALE', 'RIGHT', 3.5),
  ('Esther Lao',      'FEMALE', 'RIGHT', 3.0),
  ('Berta Arcos',     'FEMALE', 'RIGHT', 2.0);

COMMIT;
