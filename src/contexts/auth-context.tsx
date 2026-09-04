"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { uuidForMode, type AuthMode } from "@/config/auth";
import {
  loginAsAdmin as serverLoginAsAdmin,
  loginAsGuest as serverLoginAsGuest,
  logout as serverLogout,
} from "@/app/auth/actions";

const STORAGE_KEY = "pozopadel.auth";

interface StoredAuth {
  mode: AuthMode;
}

interface AuthContextValue {
  mode: AuthMode;
  uuid: string;
  isAdmin: boolean;
  loginAsGuest: () => Promise<void>;
  loginAsAdmin: (password: string) => Promise<boolean>;
  logout: () => Promise<void>;
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

  const loginAsGuest = useCallback(async () => {
    await serverLoginAsGuest();
    setMode("guest");
    persist("guest");
  }, [persist]);

  const loginAsAdmin = useCallback(
    async (password: string): Promise<boolean> => {
      const ok = await serverLoginAsAdmin(password);
      if (!ok) return false;
      setMode("admin");
      persist("admin");
      return true;
    },
    [persist],
  );

  const logout = useCallback(async () => {
    await serverLogout();
    window.localStorage.removeItem(STORAGE_KEY);
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
