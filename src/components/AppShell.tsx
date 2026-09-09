import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Compass, Search, PlusCircle, User } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";

const NAV = [
  { to: "/", label: "Ontdek", icon: Compass },
  { to: "/search", label: "Zoeken", icon: Search },
  { to: "/upload", label: "Plaatsen", icon: PlusCircle },
  { to: "/profile", label: "Profiel", icon: User },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border/60 bg-background/85 px-4 py-3 backdrop-blur">
        <Link to="/" className="flex items-center gap-3">
          <BrandMark size={40} />
          <span className="font-display text-2xl leading-none tracking-wide">BlushLuxe</span>
        </Link>
      </header>

      <main className="flex-1 px-4 pb-28 pt-4">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-3xl border-t border-border/60 bg-background/90 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <ul className="flex items-stretch justify-around">
          {NAV.map(({ to, label, icon: Icon }) => (
            <li key={to} className="flex-1">
              <Link
                to={to}
                activeOptions={{ exact: to === "/" }}
                activeProps={{ className: "text-primary" }}
                inactiveProps={{ className: "text-muted-foreground" }}
                className="flex flex-col items-center gap-1 rounded-2xl px-2 py-2.5 text-[11px] font-medium transition-colors"
              >
                <Icon size={20} />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
