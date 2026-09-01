import { cookies } from "next/headers";
import {
  AUTH_COOKIE_NAME,
  SYSTEM_USER_UUIDS,
} from "@/config/auth";

export async function getCurrentUserUuid(): Promise<string> {
  const cookieStore = await cookies();
  const uuid = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (uuid === SYSTEM_USER_UUIDS.admin || uuid === SYSTEM_USER_UUIDS.guest) {
    return uuid;
  }
  return SYSTEM_USER_UUIDS.guest;
}
