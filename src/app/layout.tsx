import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "March Madness Pick'em Draft",
  description: "Live draft for March Madness team pick'em",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <nav className="glass-card sticky top-0 z-50 border-b border-slate-700/50">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2 group">
              <span className="text-2xl animate-float">🏀</span>
              <span className="text-xl font-bold text-gradient group-hover:opacity-80 transition">
                March Madness Pick&apos;em
              </span>
            </a>
            <div className="flex gap-1">
              <a
                href="/draft"
                className="px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/50 transition font-medium"
              >
                Draft
              </a>
              <a
                href="/scores"
                className="px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/50 transition font-medium"
              >
                Scores
              </a>
              <a
                href="/history"
                className="px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/50 transition font-medium"
              >
                History
              </a>
              <a
                href="/import"
                className="px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/50 transition font-medium"
              >
                Import
              </a>
              <a
                href="/admin"
                className="px-4 py-2 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-700/50 transition text-sm"
              >
                Admin
              </a>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
