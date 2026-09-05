import { cache } from "react";
import { cookies } from "next/headers";
import {
  AUTH_COOKIE_NAME,
  SYSTEM_USER_UUIDS,
  type AuthMode,
} from "@/config/auth";
import { resolveSessionUser } from "./session-store";

/**
 * Resolves the server-side identity from the opaque session cookie (S3). The
 * cookie holds a random token, not the user UUID; looking the token up in
 * `session_tokens` is the only way to learn the identity. Requests without a
 * valid session fall back to guest. Memoized per request.
 */
const resolveCurrentUserUuid = cache(async (): Promise<string> => {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  const userUuid = await resolveSessionUser(token);
  return userUuid ?? SYSTEM_USER_UUIDS.guest;
});

export async function getCurrentUserUuid(): Promise<string> {
  return resolveCurrentUserUuid();
}

/** Determines the auth mode of the current server-side identity. */
export async function getCurrentAuthMode(): Promise<AuthMode> {
  const uuid = await getCurrentUserUuid();
  return uuid === SYSTEM_USER_UUIDS.admin ? "admin" : "guest";
}
