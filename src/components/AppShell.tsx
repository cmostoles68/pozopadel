"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

interface NavItem {
  href: string;
  icon: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", icon: "dashboard", label: "Torneos" },
  { href: "/jugadores", icon: "group", label: "Jugadores" },
  { href: "/sorteo", icon: "shuffle", label: "Sorteo" },
  { href: "/historico", icon: "bar_chart", label: "Histórico" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background text-on-surface font-sans">
      {/* Mobile top nav */}
      <nav className="md:hidden fixed top-0 inset-x-0 z-50 flex items-center justify-between px-4 py-3 bg-surface/60 backdrop-blur-xl border-b border-outline-variant/20">
        <Link href="/dashboard" className="font-display text-[18px] font-bold tracking-tight text-secondary-fixed-dim">
          PadelElite
        </Link>
        <div className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              className={`p-2 rounded-full transition-colors ${
                isActive(pathname, item.href)
                  ? "bg-secondary-container text-on-secondary-container"
                  : "text-on-surface-variant hover:bg-white hover:text-on-secondary-container"
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                {item.icon}
              </span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col bg-surface-lowest h-screen w-72 fixed left-0 top-0 z-40 border-r border-outline-variant/10">
        <div className="p-6 flex flex-col items-center border-b border-outline-variant/10">
          <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-secondary-container mb-3 shadow-[0_0_20px_rgba(195,244,0,0.3)] flex items-center justify-center bg-primary-container">
            <span className="material-symbols-outlined text-secondary-container text-[48px]">sports_tennis</span>
          </div>
          <h1 className="font-display text-[28px] text-secondary-fixed-dim text-center font-bold tracking-tight">
            PadelElite
          </h1>
        </div>

        <div className="flex-1 py-5 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`mx-2 my-2 flex items-center px-5 py-4 rounded-full transition-all duration-200 ${
                isActive(pathname, item.href)
                  ? "bg-secondary-container text-on-secondary-container font-bold"
                  : "text-on-surface-variant hover:bg-white hover:text-on-secondary-container"
              }`}
            >
              <span className="material-symbols-outlined mr-4 text-[28px]">{item.icon}</span>
              <span className="text-[18px] font-medium tracking-wide">{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="p-4 border-t border-outline-variant/10">
          <Link
            href="/auth/login"
            className="mx-2 my-1 flex items-center px-5 py-3 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-high/40 transition-all"
          >
            <span className="material-symbols-outlined mr-3 text-[24px]">logout</span>
            <span className="text-[18px] font-medium">Cerrar sesión</span>
          </Link>
        </div>
      </aside>

      <main className="flex-1 md:ml-64 pt-20 md:pt-0 p-4 md:p-12 min-h-screen">
        {children}
      </main>
    </div>
  );
}
