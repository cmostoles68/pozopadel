-- Per-user data scoping
-- Add user_uuid ownership column to tables that lacked it so each user
-- (guest / admin) only sees their own data.
-- Existing rows default to the guest user.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS user_uuid UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

ALTER TABLE public.drawn_pairs
  ADD COLUMN IF NOT EXISTS user_uuid UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

ALTER TABLE public.pozo_match_history
  ADD COLUMN IF NOT EXISTS user_uuid UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

CREATE INDEX IF NOT EXISTS profiles_user_uuid_idx ON public.profiles (user_uuid);
CREATE INDEX IF NOT EXISTS drawn_pairs_user_uuid_idx ON public.drawn_pairs (user_uuid);
CREATE INDEX IF NOT EXISTS pozo_match_history_user_uuid_idx ON public.pozo_match_history (user_uuid);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO anon, authenticated;
