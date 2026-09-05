import crypto from "node:crypto";

const HS256 = "HS256";
const ISSUER = "supabase-demo";
// Requests carry a signed identity JWT, so they run as the `authenticated`
// role. The public `anon` role is granted only SELECT (least privilege); all
// row-level DML is scoped to the owner by RLS regardless of role.
const DEFAULT_ROLE = "authenticated";
const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60;

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

/** JWT secret the local Supabase uses to sign its keys (dev default). */
function jwtSecret(): string {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (secret && secret.trim().length > 0) {
    return secret;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SUPABASE_JWT_SECRET must be set in production. Refusing to sign tokens with a default secret.",
    );
  }
  // Supabase local dev default; never use in production.
  return "super-secret-jwt-token-with-at-least-32-characters-long";
}

/**
 * Signs a short-lived HS256 JWT carrying the identity in the `user_uuid`
 * claim. PostgREST exposes this value to RLS via
 * current_setting('request.jwt.claims'), which public.current_user_uuid()
 * reads to scope every row to the current guest/admin.
 */
export function signUserToken(userUuid: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: HS256, typ: "JWT" };
  const payload = {
    iss: ISSUER,
    role: DEFAULT_ROLE,
    iat: now,
    exp: now + THIRTY_DAYS_SECONDS,
    user_uuid: userUuid,
  };

  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(
    JSON.stringify(payload),
  )}`;
  const signature = crypto
    .createHmac("sha256", jwtSecret())
    .update(signingInput)
    .digest("base64url");

  return `${signingInput}.${signature}`;
}

/**
 * Signs a service JWT with role `service_role` (bypasses RLS) used exclusively
 * by server-side tooling (e.g. the session store). Only the role claim differs
 * from a user token; the same HMAC secret is required.
 */
export function signServiceRoleToken(): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: HS256, typ: "JWT" };
  const payload = {
    iss: ISSUER,
    role: "service_role",
    iat: now,
    exp: now + THIRTY_DAYS_SECONDS,
  };

  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(
    JSON.stringify(payload),
  )}`;
  const signature = crypto
    .createHmac("sha256", jwtSecret())
    .update(signingInput)
    .digest("base64url");

  return `${signingInput}.${signature}`;
}
