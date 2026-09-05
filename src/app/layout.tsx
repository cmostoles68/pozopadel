import type { Metadata } from "next";
import { Chivo, Plus_Jakarta_Sans } from "next/font/google";
import { AuthProvider } from "@/contexts/auth-context";
import "./globals.css";

const chivo = Chivo({
  variable: "--font-chivo",
  subsets: ["latin"],
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PadelElite - Gestor de Pozos de Pádel",
  description: "Gestiona y compite en torneos de pádel tipo Pozo",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${chivo.variable} ${plusJakarta.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-on-surface font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
