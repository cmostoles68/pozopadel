import { test, expect } from "@playwright/test";
import {
  connect,
  resetUserData,
  createProfile,
  createTournament,
  GUEST_UUID,
  ADMIN_UUID,
} from "./helpers";
import { signUserToken } from "../src/infrastructure/supabase/sign-token";

const API_URL = "http://127.0.0.1:54321/rest/v1";
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

let client: Awaited<ReturnType<typeof connect>>;

test.describe.configure({ mode: "serial" });

function authedHeaders(userUuid: string): Record<string, string> {
  return {
    apikey: ANON_KEY,
    Authorization: `Bearer ${signUserToken(userUuid)}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

const anonHeaders: Record<string, string> = {
  apikey: ANON_KEY,
  Accept: "application/json",
  "Content-Type": "application/json",
};

test.beforeAll(async () => {
  client = await connect();
  await resetUserData(client, GUEST_UUID);
  await resetUserData(client, ADMIN_UUID);

  await createProfile(client, {
    full_name: "Isolar Guest",
    level: 3.0,
    user_uuid: GUEST_UUID,
  });
  await createProfile(client, {
    full_name: "Isolar Admin",
    level: 5.0,
    user_uuid: ADMIN_UUID,
  });
  await createTournament(client, {
    title: "Pozo Guest Aislado",
    number_of_courts: 1,
    created_by: GUEST_UUID,
  });
  await createTournament(client, {
    title: "Pozo Admin Aislado",
    number_of_courts: 1,
    created_by: ADMIN_UUID,
  });
});

test.afterAll(async () => {
  await resetUserData(client, GUEST_UUID);
  await resetUserData(client, ADMIN_UUID);
  await client.end();
});

async function profileNames(
  headers: Record<string, string>,
): Promise<string[]> {
  const res = await fetch(
    `${API_URL}/profiles?select=full_name&order=full_name`,
    {
      headers,
    },
  );
  expect(res.status).toBe(200);
  const rows = (await res.json()) as { full_name: string }[];
  return rows.map((r) => r.full_name);
}

async function tournamentTitles(
  headers: Record<string, string>,
): Promise<string[]> {
  const res = await fetch(`${API_URL}/tournaments?select=title&order=title`, {
    headers,
  });
  expect(res.status).toBe(200);
  const rows = (await res.json()) as { title: string }[];
  return rows.map((r) => r.title);
}

test("cada rol solo ve sus perfiles por la API; sin token no ve nada", async () => {
  const guestNames = await profileNames(authedHeaders(GUEST_UUID));
  expect(guestNames).toEqual(["Isolar Guest"]);

  const adminNames = await profileNames(authedHeaders(ADMIN_UUID));
  expect(adminNames).toEqual(["Isolar Admin"]);

  const anonNames = await profileNames(anonHeaders);
  expect(anonNames).toEqual([]);
});

test("un rol no puede leer el registro del otro ni filtrado por id", async () => {
  const { rows } = await client.query(
    "SELECT id, user_uuid FROM profiles WHERE full_name IN ('Isolar Guest', 'Isolar Admin')",
  );
  const adminId = (
    rows.find((r) => r.user_uuid === ADMIN_UUID) as { id: string }
  ).id;
  const guestId = (
    rows.find((r) => r.user_uuid === GUEST_UUID) as { id: string }
  ).id;

  const guestReadAdmin = await fetch(`${API_URL}/profiles?id=eq.${adminId}`, {
    headers: authedHeaders(GUEST_UUID),
  });
  expect(guestReadAdmin.status).toBe(200);
  expect(await guestReadAdmin.json()).toEqual([]);

  const adminReadGuest = await fetch(`${API_URL}/profiles?id=eq.${guestId}`, {
    headers: authedHeaders(ADMIN_UUID),
  });
  expect(adminReadGuest.status).toBe(200);
  expect(await adminReadGuest.json()).toEqual([]);
});

test("UPDATE/DELETE sobre filas ajenas no las toca (204 sin cambios)", async () => {
  const { rows } = await client.query(
    "SELECT id, user_uuid FROM profiles WHERE full_name IN ('Isolar Guest', 'Isolar Admin')",
  );
  const adminId = (
    rows.find((r) => r.user_uuid === ADMIN_UUID) as { id: string }
  ).id;

  const patch = await fetch(`${API_URL}/profiles?id=eq.${adminId}`, {
    method: "PATCH",
    headers: authedHeaders(GUEST_UUID),
    body: JSON.stringify({ full_name: "Hijacked" }),
  });
  expect(patch.status).toBe(204);

  const del = await fetch(`${API_URL}/profiles?id=eq.${adminId}`, {
    method: "DELETE",
    headers: authedHeaders(GUEST_UUID),
  });
  expect(del.status).toBe(204);

  const check = await client.query(
    "SELECT full_name FROM profiles WHERE id = $1",
    [adminId],
  );
  expect(check.rows[0].full_name).toBe("Isolar Admin");
});

test("INSERT no puede suplantar al otro usuario (403 por RLS)", async () => {
  const res = await fetch(`${API_URL}/profiles`, {
    method: "POST",
    headers: authedHeaders(GUEST_UUID),
    body: JSON.stringify({
      full_name: "Suplantador",
      user_uuid: ADMIN_UUID,
    }),
  });
  expect(res.status).toBe(403);
  const body = (await res.json()) as { message: string };
  expect(body.message).toMatch(/row-level security/i);

  const { rows } = await client.query(
    "SELECT count(*)::int AS n FROM profiles WHERE full_name = 'Suplantador'",
  );
  expect(rows[0].n).toBe(0);
});

test("los torneos también quedan aislados por created_by", async () => {
  const guestTitles = await tournamentTitles(authedHeaders(GUEST_UUID));
  expect(guestTitles).toEqual(["Pozo Guest Aislado"]);

  const adminTitles = await tournamentTitles(authedHeaders(ADMIN_UUID));
  expect(adminTitles).toEqual(["Pozo Admin Aislado"]);

  const anonTitles = await tournamentTitles(anonHeaders);
  expect(anonTitles).toEqual([]);
});
