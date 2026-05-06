import { Link, useLocation } from "wouter";
import { useAuth } from "../lib/auth";
import { useLogout } from "@workspace/api-client-react";
import { Button } from "./ui/button";
import { ReactNode } from "react";
import { LogOut, Home, Calendar } from "lucide-react";

/* Brand tokens */
const BROWN   = "hsl(20, 33%, 27%)";   /* #5C3D2E */
const BROWN_D = "hsl(20, 33%, 20%)";   /* darker shade for gradient end */
const GOLD    = "hsl(43, 89%, 38%)";   /* #B8860B */
const GOLD_L  = "hsl(43, 80%, 60%)";   /* lighter gold for text on dark */
const CREAM   = "hsl(37, 86%, 96%)";   /* #FDF6EC */
const DUST    = "hsl(27, 46%, 59%)";   /* #C4956A dusty rose / accent */

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const logoutMutation = useLogout({
    mutation: { onSuccess: () => { logout(); setLocation("/"); } }
  });

  if (!isAuthenticated) return <>{children}</>;

  const homePath = user?.role === "counsellor" ? "/counsellor" : "/dashboard";
  const atHome = location === homePath || location === "/dashboard" || location === "/counsellor";
  const atSessions = location === "/sessions";

  const navBtn = (active: boolean) => ({
    color: active ? GOLD_L : "rgba(253,246,236,0.72)",
    background: active ? "rgba(184,134,11,0.18)" : "transparent",
  });

  return (
    <div className="min-h-screen flex flex-col" style={{ background: CREAM }}>
      <header
        className="sticky top-0 z-20 shadow-lg"
        style={{ background: `linear-gradient(135deg, ${BROWN_D} 0%, ${BROWN} 100%)` }}
      >
        <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-6xl">
          <div className="flex items-center gap-8">
            <Link href={homePath}>
              <span className="font-serif text-2xl font-bold tracking-wide cursor-pointer" style={{ color: GOLD_L }}>
                HeartSpace
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              <Link href={homePath}>
                <Button variant="ghost" className="font-medium rounded-lg px-4 py-2 text-sm transition-all" style={navBtn(atHome)}>
                  <Home className="w-4 h-4 mr-2" />Dashboard
                </Button>
              </Link>
              <Link href="/sessions">
                <Button variant="ghost" className="font-medium rounded-lg px-4 py-2 text-sm transition-all" style={navBtn(atSessions)}>
                  <Calendar className="w-4 h-4 mr-2" />Sessions
                </Button>
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-semibold" style={{ color: "rgba(253,246,236,0.95)" }}>{user?.name}</span>
              <span className="text-xs capitalize" style={{ color: DUST }}>{user?.role}</span>
            </div>
            <Button
              variant="ghost" size="icon"
              onClick={() => logoutMutation.mutate()}
              className="rounded-full transition-all"
              style={{ color: "rgba(253,246,236,0.55)" }}
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        {children}
      </main>

      <footer className="py-6 border-t text-center text-sm" style={{ borderColor: "hsl(32,35%,86%)", color: "hsl(20,20%,50%)" }}>
        HeartSpace{" "}
        <span style={{ color: GOLD }}>by Vaishnavi Saxena</span>{" "}
        &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
