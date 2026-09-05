-- ============================================================================
-- PozoPadel — Server-managed session tokens (S3).
--
-- Fixes S3 of the security audit: the admin/guest identity is no longer
-- derived from a forgeable cookie holding the public SYSTEM_USER_UUID. The
-- cookie now holds an opaque 256-bit random token whose SHA-256 hash is stored
-- here and validated server-side on every request. Knowing the public UUID
-- is useless without a valid session token (only issued after credentials).
--
-- Access model:
--   * RLS enabled, NO policies: the public roles (anon/authenticated) can
--     never read or write sessions.
--   * Only `service_role` has table-level privileges, used exclusively by
--     server-side code (session-store). It bypasses RLS (rolbypassrls).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.session_tokens (
  token_hash TEXT PRIMARY KEY,
  user_uuid UUID NOT NULL REFERENCES public.test_users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS session_tokens_user_uuid_idx
  ON public.session_tokens (user_uuid);

ALTER TABLE public.session_tokens ENABLE ROW LEVEL SECURITY;

-- No RLS policies on purpose: sessions are server-internal.
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.session_tokens FROM anon, authenticated;
-- Grant table privileges only to service_role (server-side tooling).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_tokens TO service_role;

COMMENT ON TABLE public.session_tokens IS
  'Server-managed opaque session tokens (SHA-256 hashed). Only reachable via service_role.';