import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { User } from "./api-client-react";
import { setAuthTokenGetter } from "./api-client-react";
import { supabase, ROLE_MAP, type SupabaseRole } from "./supabase";

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

setAuthTokenGetter(() => localStorage.getItem("heartspace_token"));

async function resolveSupabaseUser(supabaseUser: { id: string; email?: string }, accessToken: string): Promise<{ user: User; token: string; redirect: string } | null> {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role, avatar_url")
      .eq("id", supabaseUser.id)
      .single();

    const role = (profile?.role as SupabaseRole) ?? "prep_student";
    const mapped = ROLE_MAP[role] ?? ROLE_MAP["prep_student"];

    const heartUser: User = {
      id: supabaseUser.id as any,
      email: supabaseUser.email ?? "",
      name: profile?.full_name ?? supabaseUser.email ?? "User",
      role: mapped.role,
      space: mapped.space,
      avatarUrl: profile?.avatar_url ?? null,
    } as any;

    return { user: heartUser, token: accessToken, redirect: mapped.redirect };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem("heartspace_user");
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("heartspace_token");
  });

  const [isLoading, setIsLoading] = useState(true);

  const persistUser = useCallback((u: User | null, t: string | null) => {
    setUser(u);
    setToken(t);
    if (u && t) {
      localStorage.setItem("heartspace_user", JSON.stringify(u));
      localStorage.setItem("heartspace_token", t);
    } else {
      localStorage.removeItem("heartspace_user");
      localStorage.removeItem("heartspace_token");
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const resolved = await resolveSupabaseUser(session.user, session.access_token);
        if (resolved) persistUser(resolved.user, resolved.token);
      }
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        const resolved = await resolveSupabaseUser(session.user, session.access_token);
        if (resolved) persistUser(resolved.user, resolved.token);
      } else {
        const isDemoUser = !!localStorage.getItem("heartspace_token")?.includes("demo");
        if (!isDemoUser) persistUser(null, null);
      }
    });

    return () => subscription.unsubscribe();
  }, [persistUser]);

  const login = useCallback((newUser: User, newToken: string) => {
    persistUser(newUser, newToken);
  }, [persistUser]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut().catch(() => {});
    persistUser(null, null);
  }, [persistUser]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
