export const SYSTEM_USERS = {
  guest: "00000000-0000-0000-0000-000000000001",
  admin: "00000000-0000-0000-0000-000000000002",
} as const;

export function resolveTournamentCreatorId(userId?: string | null): string {
  if (!userId) return SYSTEM_USERS.guest;
  if (userId === SYSTEM_USERS.admin || userId === SYSTEM_USERS.guest) {
    return userId;
  }
  return SYSTEM_USERS.guest;
}
