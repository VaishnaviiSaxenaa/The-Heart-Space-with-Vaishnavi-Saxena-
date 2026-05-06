import { Link, useLocation } from "wouter";
import { useAuth } from "../lib/auth";
import { useLogout } from "@workspace/api-client-react";
import { Button } from "./ui/button";
import { ReactNode } from "react";
import { LogOut, Home, Calendar } from "lucide-react";

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const logoutMutation = useLogout({
    mutation: {
      onSuccess: () => {
        logout();
        setLocation("/");
      }
    }
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  if (!isAuthenticated) return <>{children}</>;

  const homePath = user?.role === "counsellor" ? "/counsellor" : "/dashboard";

  const isActive = (path: string) => location === path || (path === homePath && (location === "/dashboard" || location === "/counsellor"));

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "hsl(37, 86%, 96%)" }}>
      <header className="sticky top-0 z-20 shadow-lg" style={{ background: "linear-gradient(135deg, hsl(351, 57%, 28%) 0%, hsl(351, 57%, 38%) 100%)" }}>
        <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-6xl">
          <div className="flex items-center gap-8">
            <Link href={homePath} className="flex items-center gap-2 group">
              <span className="font-serif text-2xl font-bold tracking-wide" style={{ color: "hsl(38, 65%, 70%)" }}>
                HeartSpace
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              <Link href={homePath}>
                <Button
                  variant="ghost"
                  className="font-medium transition-all rounded-lg px-4 py-2 text-sm"
                  style={{
                    color: isActive(homePath) ? "hsl(38, 65%, 70%)" : "rgba(253,246,236,0.75)",
                    background: isActive(homePath) ? "rgba(201,149,42,0.15)" : "transparent",
                  }}
                >
                  <Home className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
              <Link href="/sessions">
                <Button
                  variant="ghost"
                  className="font-medium transition-all rounded-lg px-4 py-2 text-sm"
                  style={{
                    color: location === "/sessions" ? "hsl(38, 65%, 70%)" : "rgba(253,246,236,0.75)",
                    background: location === "/sessions" ? "rgba(201,149,42,0.15)" : "transparent",
                  }}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Sessions
                </Button>
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-semibold" style={{ color: "hsl(37, 86%, 94%)" }}>{user?.name}</span>
              <span className="text-xs capitalize" style={{ color: "hsl(38, 65%, 65%)" }}>{user?.role}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="rounded-full transition-all"
              style={{ color: "rgba(253,246,236,0.6)" }}
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

      <footer className="py-6 border-t text-center text-sm" style={{ borderColor: "hsl(35, 40%, 86%)", color: "hsl(25, 40%, 42%)" }}>
        <p>HeartSpace <span style={{ color: "hsl(38, 65%, 47%)" }}>by Vaishnavi Saxena</span> &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
