import type { Metadata } from "next";
import { Chivo, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const chivo = Chivo({
  variable: "--font-chivo",
  subsets: ["latin"],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PadelElite - Gestor de Pozos de Pádel",
  description: "Gestiona y compite en torneos de pádel tipo Pozo en tiempo real",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={`${chivo.variable} ${plusJakarta.variable} h-full antialiased`}
    >
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full bg-background text-on-surface font-sans">{children}</body>
    </html>
  );
}
