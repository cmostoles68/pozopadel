import { createHash, randomBytes } from "node:crypto";
import { createServiceClient } from "./service-client";

/**
 * Server-managed opaque sessions (S3). The browser cookie no longer carries
 * the public user UUID: it carries a 256-bit random token whose SHA-256 hash is
 * stored in `session_tokens`. The role is resolved server-side from that table
 * on every request, so knowing the user UUIDs grants nothing by itself.
 */
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Creates a new session for the user and invalidates any previous session of
 * that user (single active session per identity). Returns the raw token to
 * store in the cookie.
 */
export async function createSessionToken(userUuid: string): Promise<string> {
  const supabase = createServiceClient();
  const token = generateSessionToken();
  const expiresAt = new Date(
    Date.now() + SESSION_TTL_SECONDS * 1000,
  ).toISOString();

  const { error: revokeError } = await supabase
    .from("session_tokens")
    .delete()
    .eq("user_uuid", userUuid);
  if (revokeError) {
    throw new Error(`session_tokens: ${revokeError.message}`);
  }

  const { error } = await supabase.from("session_tokens").insert({
    token_hash: hashSessionToken(token),
    user_uuid: userUuid,
    expires_at: expiresAt,
  });
  if (error) {
    throw new Error(`session_tokens: ${error.message}`);
  }
  return token;
}

/** Resolves the user bound to a valid (non-expired) session token, if any. */
export async function resolveSessionUser(
  token: string | undefined,
): Promise<string | null> {
  if (!token) return null;
  const { data } = await createServiceClient()
    .from("session_tokens")
    .select("user_uuid")
    .eq("token_hash", hashSessionToken(token))
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  return data?.user_uuid ?? null;
}

/** Deletes the session bound to a token (logout). */
export async function destroySession(token: string | undefined): Promise<void> {
  if (!token) return;
  const { error } = await createServiceClient()
    .from("session_tokens")
    .delete()
    .eq("token_hash", hashSessionToken(token));
  if (error) {
    throw new Error(`session_tokens: ${error.message}`);
  }
}
