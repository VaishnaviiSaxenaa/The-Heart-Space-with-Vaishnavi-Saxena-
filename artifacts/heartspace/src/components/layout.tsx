import { Link, useLocation } from "wouter";
import { useAuth } from "../lib/auth";
import { useLogout } from "@workspace/api-client-react";
import { Button } from "./ui/button";
import { ReactNode } from "react";
import { LogOut, Home, Calendar } from "lucide-react";

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
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

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border bg-card shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href={homePath} className="flex items-center gap-2">
              <span className="font-serif text-2xl font-semibold text-primary">HeartSpace</span>
            </Link>
            
            <nav className="hidden md:flex items-center gap-1">
              <Link href={homePath}>
                <Button variant="ghost" className="font-medium text-foreground hover:text-primary transition-colors">
                  <Home className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
              <Link href="/sessions">
                <Button variant="ghost" className="font-medium text-foreground hover:text-primary transition-colors">
                  <Calendar className="w-4 h-4 mr-2" />
                  Sessions
                </Button>
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm font-medium hidden md:block">
              {user?.name}
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground hover:text-destructive">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        {children}
      </main>
      
      <footer className="py-8 text-center text-sm text-muted-foreground">
        <p>HeartSpace by Vaishnavi Saxena &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
