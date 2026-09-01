export const ADMIN_PASSWORD = "1234";

export const SYSTEM_USER_UUIDS = {
  guest: "00000000-0000-0000-0000-000000000001",
  admin: "00000000-0000-0000-0000-000000000002",
} as const;

export const AUTH_COOKIE_NAME = "padel_uuid";

export type AuthMode = "guest" | "admin";

export function uuidForMode(mode: AuthMode): string {
  return mode === "admin" ? SYSTEM_USER_UUIDS.admin : SYSTEM_USER_UUIDS.guest;
}
