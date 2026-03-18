import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "March Madness Pick'em Draft",
  description: "Live draft for March Madness team pick'em",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MM Pick'em",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen min-h-[100dvh]">
        <nav className="glass-card sticky top-0 z-50 border-b border-slate-700/50">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between">
            <a href="/" className="flex items-center gap-1.5 sm:gap-2 group shrink-0">
              <span className="text-xl sm:text-2xl animate-float">🏀</span>
              <span className="text-base sm:text-xl font-bold text-gradient group-hover:opacity-80 transition">
                MM Pick&apos;em
              </span>
            </a>
            {/* Desktop nav */}
            <div className="hidden sm:flex gap-1">
              <NavLink href="/draft">Draft</NavLink>
              <NavLink href="/bracket">Bracket</NavLink>
              <NavLink href="/scores">Scores</NavLink>
              <NavLink href="/history">History</NavLink>
              <NavLink href="/import">Import</NavLink>
              <NavLink href="/admin" subtle>Admin</NavLink>
            </div>
            {/* Mobile nav - horizontal scroll */}
            <div className="flex sm:hidden gap-0.5 overflow-x-auto no-scrollbar ml-2">
              <MobileNavLink href="/draft">Draft</MobileNavLink>
              <MobileNavLink href="/bracket">Bracket</MobileNavLink>
              <MobileNavLink href="/scores">Scores</MobileNavLink>
              <MobileNavLink href="/history">History</MobileNavLink>
              <MobileNavLink href="/import">Import</MobileNavLink>
              <MobileNavLink href="/admin">Admin</MobileNavLink>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-20 sm:pb-6">
          {children}
        </main>
      </body>
    </html>
  );
}

function NavLink({ href, children, subtle }: { href: string; children: React.ReactNode; subtle?: boolean }) {
  return (
    <a
      href={href}
      className={`px-4 py-2 rounded-lg hover:bg-slate-700/50 transition font-medium ${
        subtle ? "text-slate-400 hover:text-amber-400 text-sm" : "text-slate-300 hover:text-white"
      }`}
    >
      {children}
    </a>
  );
}

function MobileNavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/50 transition text-sm font-medium whitespace-nowrap"
    >
      {children}
    </a>
  );
}
