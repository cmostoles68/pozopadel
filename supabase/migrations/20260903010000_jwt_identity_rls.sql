-- ============================================================================
-- Fix RLS identity propagation: use signed JWT claims instead of custom headers.
--
-- PostgREST does NOT expose arbitrary custom headers as
-- current_setting('request.headers.*'); only parameters PostgREST itself sets
-- (jwt.claims, jwt.claims.*, etc.) are available. The previous migration read
-- 'request.headers.x-user-uuid', so current_user_uuid() returned NULL and the
-- app could not see its own rows (except for leaked "USING (true)" policies).
--
-- The app now signs a short-lived JWT per request (guest/admin) with the
-- Supabase JWT secret and sends it as the auth bearer token. The user_uuid is
-- carried in a top-level claim so RLS can scope rows to the current identity.
-- ============================================================================

-- Reads the current request identity from the signed JWT claims (json),
-- falling back to the legacy request header for backward compatibility.
CREATE OR REPLACE FUNCTION public.current_user_uuid()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims jsonb;
  identity_val text;
BEGIN
  -- 1. Prefer the signed JWT's user_uuid claim (standard Supabase identity).
  BEGIN
    claims := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
    IF claims IS NOT NULL THEN
      identity_val := claims->>'user_uuid';
      IF identity_val IS NOT NULL AND identity_val <> '' THEN
        RETURN identity_val::uuid;
      END IF;
      -- Accept the standard `sub` claim as an alternative.
      identity_val := claims->>'sub';
      IF identity_val IS NOT NULL AND identity_val <> '' THEN
        RETURN identity_val::uuid;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- 2. Fallback to a previously-registered request header (best effort).
  BEGIN
    identity_val := NULLIF(current_setting('request.headers.x-user-uuid', true), '');
    IF identity_val IS NOT NULL THEN
      RETURN identity_val::uuid;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NULL;
END;
$$;

-- ---------------------------------------------------------------------------
-- Drop the leaked "Public tournaments read" policy (USING true).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public tournaments read" ON public.tournaments;

-- ---------------------------------------------------------------------------
-- Ensure the anon/authenticated roles have DML grants on test_users.
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_users TO anon, authenticated;
