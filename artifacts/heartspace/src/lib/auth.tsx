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

/* Race a promise against a timeout — returns null if it times out */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

async function resolveSupabaseUser(
  supabaseUser: { id: string; email?: string },
  accessToken: string,
): Promise<{ user: User; token: string } | null> {
  try {
    const result = await withTimeout(
      supabase.from("profiles").select("full_name, role, avatar_url").eq("id", supabaseUser.id).single(),
      3000,
    );
    if (!result) return null; // timed out

    const { data: profile } = result;
    const role   = (profile?.role as SupabaseRole) ?? "prep_student";
    const mapped = ROLE_MAP[role] ?? ROLE_MAP["prep_student"];

    const heartUser = {
      id:        supabaseUser.id as any,
      email:     supabaseUser.email ?? "",
      name:      profile?.full_name ?? supabaseUser.email ?? "User",
      role:      mapped.role,
      space:     mapped.space,
      avatarUrl: profile?.avatar_url ?? null,
    } as User;

    return { user: heartUser, token: accessToken };
  } catch {
    return null;
  }
}

/* Read cached user from localStorage (sync, instant) */
function readCachedUser(): User | null {
  try {
    const saved = localStorage.getItem("heartspace_user");
    return saved ? JSON.parse(saved) : null;
  } catch { return null; }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,  setUser]  = useState<User | null>(readCachedUser);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("heartspace_token"));

  /* If we already have a cached user, don't block the UI at all.
     Only show the loading spinner for truly fresh sessions. */
  const [isLoading, setIsLoading] = useState(() => !readCachedUser());

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
    /* Hard cap: never show loading screen for more than 3 seconds */
    const hardCap = setTimeout(() => setIsLoading(false), 3000);

    const sessionPromise = withTimeout(supabase.auth.getSession(), 3000);

    sessionPromise.then(async (result) => {
      clearTimeout(hardCap);
      if (result) {
        const { data: { session } } = result;
        if (session) {
          const resolved = await withTimeout(
            resolveSupabaseUser(session.user, session.access_token).then(r => r),
            3000,
          );
          if (resolved) persistUser(resolved.user, resolved.token);
        }
      }
      setIsLoading(false);
    }).catch(() => {
      clearTimeout(hardCap);
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

    return () => {
      clearTimeout(hardCap);
      subscription.unsubscribe();
    };
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
