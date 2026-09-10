"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
const LAST_ACTIVITY_KEY = "pozopadel.lastActivity";
const INACTIVITY_MS = 30 * 60 * 1000;
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "touchstart", "scroll"]; // Evita mousemove para no escribir el storage a cada pixel
const IDLE_CHECK_MS = 30_000;

interface StoredAuth {
  mode: AuthMode;
}

interface AuthContextValue {
  mode: AuthMode;
  uuid: string;
  isAdmin: boolean;
  loginAsGuest: () => Promise<void>;
  loginAsAdmin: (password: string) => Promise<{ ok: boolean; error?: string }>;
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
  const [mode, setMode] = useState<AuthMode>("guest");
  const lastActivityRef = useRef<number>(Date.now());
  const activeRef = useRef(false);

  useEffect(() => {
    const stored = readStored();
    if (stored) {
      activeRef.current = true;
      setMode(stored.mode);
      const saved = Number(window.localStorage.getItem(LAST_ACTIVITY_KEY));
      if (Number.isFinite(saved)) lastActivityRef.current = saved;
    }
  }, []);

  const touchActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (activeRef.current) {
      window.localStorage.setItem(
        LAST_ACTIVITY_KEY,
        String(lastActivityRef.current),
      );
    }
  }, []);

  async function closeSession() {
    await serverLogout();
    activeRef.current = false;
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(LAST_ACTIVITY_KEY);
    setMode("guest");
    window.location.href = "/auth/login";
  }

  useEffect(() => {
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, touchActivity, { passive: true });
    }
    const interval = window.setInterval(() => {
      const idle = Date.now() - lastActivityRef.current;
      if (activeRef.current && idle > INACTIVITY_MS) {
        void closeSession();
      }
    }, IDLE_CHECK_MS);
    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, touchActivity);
      }
      window.clearInterval(interval);
    };
  }, [touchActivity]);

  const persist = useCallback((nextMode: AuthMode) => {
    const payload: StoredAuth = { mode: nextMode };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, []);

  const loginAsGuest = useCallback(async () => {
    await serverLoginAsGuest();
    setMode("guest");
    persist("guest");
    activeRef.current = true;
    touchActivity();
  }, [persist, touchActivity]);

  const loginAsAdmin = useCallback(
    async (password: string): Promise<{ ok: boolean; error?: string }> => {
      const result = await serverLoginAsAdmin(password);
      if (!result.ok) return result;
      setMode("admin");
      persist("admin");
      activeRef.current = true;
      touchActivity();
      return { ok: true };
    },
    [persist, touchActivity],
  );

  const logout = useCallback(async () => {
    await serverLogout();
    activeRef.current = false;
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(LAST_ACTIVITY_KEY);
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
