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
DELETE FROM public.profiles;

-- Base de jugadores: 50 perfiles, 24 hombres / 26 mujeres, 8 zurdos (16%), niveles 2-8.
INSERT INTO public.profiles (full_name, gender, dominant_hand, level)
VALUES
  -- Perfiles de test (dependencias de los tests E2E)
  ('Ana Vega',       'FEMALE', 'RIGHT', 6),
  ('Andrés Moreno',  'MALE',   'RIGHT', 6),
  ('Juan García',    'MALE',   'LEFT',  5),
  ('Elena Castro',   'FEMALE', 'RIGHT', 4),
  ('Pedro Martín',   'MALE',   'RIGHT', 4),
  ('Lucía Romero',   'FEMALE', 'RIGHT', 4),
  ('Pablo Torres',   'MALE',   'RIGHT', 4),
  ('Sara Gil',       'FEMALE', 'RIGHT', 3),
  -- Hombres (12)
  ('Carlos Ruiz',      'MALE',   'RIGHT', 8),
  ('Miguel Torres',    'MALE',   'LEFT',  6),
  ('Andrés Gómez',     'MALE',   'RIGHT', 6),
  ('Javier Molina',    'MALE',   'RIGHT', 5),
  ('Pablo Sosa',       'MALE',   'LEFT',  4),
  ('Luis Ortega',      'MALE',   'RIGHT', 4),
  ('Sergio Vidal',     'MALE',   'RIGHT', 4),
  ('David Navarro',    'MALE',   'RIGHT', 3),
  ('Raúl Campos',      'MALE',   'RIGHT', 8),
  ('Iván Peña',        'MALE',   'RIGHT', 6),
  ('Gonzalo Ríos',     'MALE',   'RIGHT', 6),
  ('Adrián Izquierdo', 'MALE',   'LEFT',  5),
  ('Marcos Ferrer',    'MALE',   'RIGHT', 4),
  ('Rubén Soler',      'MALE',   'RIGHT', 4),
  ('Óscar Ibáñez',     'MALE',   'RIGHT', 4),
  ('Diego Montero',    'MALE',   'RIGHT', 2),
  -- Mujeres (16)
  ('Marta Roldán',    'FEMALE', 'RIGHT', 8),
  ('Laura Pineda',    'FEMALE', 'RIGHT', 7),
  ('Carmen Aranda',   'FEMALE', 'RIGHT', 6),
  ('Silvia Reina',    'FEMALE', 'RIGHT', 6),
  ('Nuria Castejón',  'FEMALE', 'RIGHT', 6),
  ('Aitana Bravo',    'FEMALE', 'RIGHT', 5),
  ('Inés Valero',     'FEMALE', 'RIGHT', 4),
  ('Carla Duarte',    'FEMALE', 'RIGHT', 4),
  ('Vega Salinas',    'FEMALE', 'RIGHT', 4),
  ('Noelia Parra',    'FEMALE', 'RIGHT', 3),
  ('Alba Cordero',    'FEMALE', 'RIGHT', 5),
  ('Rocío Mena',      'FEMALE', 'RIGHT', 4),
  ('Patricia Luque',  'FEMALE', 'RIGHT', 4),
  ('Gemma Pardo',     'FEMALE', 'RIGHT', 4),
  ('Esther Lao',      'FEMALE', 'RIGHT', 3),
  ('Berta Arcos',     'FEMALE', 'RIGHT', 2),
  -- 12 jugadores variados (6 hombres / 6 mujeres)
  -- Hombres
  ('Francisco López',   'MALE',   'RIGHT', 7),
  ('Roberto Herrera',   'MALE',   'LEFT',  6),
  ('Alejandro Romo',    'MALE',   'RIGHT', 4),
  ('Tomás Fernández',   'MALE',   'LEFT',  6),
  ('Hugo Sánchez',      'MALE',   'RIGHT', 4),
  ('Víctor Medina',     'MALE',   'RIGHT', 2),
  -- Mujeres
  ('Rosa Moreno',       'FEMALE', 'LEFT',  8),
  ('Paula Domínguez',   'FEMALE', 'RIGHT', 5),
  ('Clara Ruiz',        'FEMALE', 'LEFT',  3),
  ('Marta López',       'FEMALE', 'RIGHT', 6),
  ('Nerea Jiménez',     'FEMALE', 'RIGHT', 4),
  ('Elena Hernández',   'FEMALE', 'LEFT',  6);

COMMIT;