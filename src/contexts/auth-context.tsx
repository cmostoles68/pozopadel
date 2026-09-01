"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ADMIN_PASSWORD_HASH,
  AUTH_COOKIE_NAME,
  uuidForMode,
  type AuthMode,
} from "@/config/auth";

const STORAGE_KEY = "pozopadel.auth";

async function hashPassword(password: string): Promise<string> {
  const bytes = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function setAuthCookie(uuid: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_COOKIE_NAME}=${uuid}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
}

function clearAuthCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0`;
}

interface StoredAuth {
  mode: AuthMode;
}

interface AuthContextValue {
  mode: AuthMode;
  uuid: string;
  isAdmin: boolean;
  loginAsGuest: () => void;
  loginAsAdmin: (password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStored(): StoredAuth | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAuth;
    if (parsed.mode !== "guest" && parsed.mode !== "admin") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AuthMode>(() => readStored()?.mode ?? "guest");

  const persist = useCallback((nextMode: AuthMode) => {
    const payload: StoredAuth = { mode: nextMode };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, []);

  const loginAsGuest = useCallback(() => {
    setMode("guest");
    persist("guest");
    setAuthCookie(uuidForMode("guest"));
  }, [persist]);

  const loginAsAdmin = useCallback(
    async (password: string): Promise<boolean> => {
      const hash = await hashPassword(password);
      if (hash !== ADMIN_PASSWORD_HASH) return false;
      setMode("admin");
      persist("admin");
      setAuthCookie(uuidForMode("admin"));
      return true;
    },
    [persist],
  );

  const logout = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    clearAuthCookie();
    setMode("guest");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      mode,
      uuid: uuidForMode(mode),
      isAdmin: mode === "admin",
      loginAsGuest,
      loginAsAdmin,
      logout,
    }),
    [mode, loginAsGuest, loginAsAdmin, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  }
  return ctx;
}
