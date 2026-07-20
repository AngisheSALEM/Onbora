import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "Onbora — Copilote Commercial B2B",
  description: "Copilote IA de découverte client, brief et préparation commerciale pour MSP.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className="h-full antialiased dark"
    >
      <body className="min-h-full flex flex-col bg-white dark:bg-zinc-950 text-black dark:text-zinc-50 font-sans relative overflow-x-hidden transition-colors duration-300">
        <div className="matrix-grid" />
        <div className="noise-overlay" />
        <div className="glow-orb-orange-1" />
        <div className="glow-orb-orange-2" />
        <AuthProvider>
          <div className="relative z-10 flex-1 flex flex-col">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
