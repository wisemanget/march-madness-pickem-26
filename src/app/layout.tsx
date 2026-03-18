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
        <nav className="bg-slate-800 border-b border-slate-700">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <a href="/" className="text-xl font-bold text-amber-400">
              March Madness Pick&apos;em
            </a>
            <div className="flex gap-4">
              <a href="/draft" className="text-slate-300 hover:text-white transition">
                Draft
              </a>
              <a href="/scores" className="text-slate-300 hover:text-white transition">
                Scores
              </a>
              <a href="/admin" className="text-slate-300 hover:text-white transition text-sm">
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
