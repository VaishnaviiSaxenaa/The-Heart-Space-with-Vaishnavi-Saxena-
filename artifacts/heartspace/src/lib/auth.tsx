import {
  createContext, useContext, useState, useEffect, useCallback, ReactNode,
} from "react";
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

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise.catch(() => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

async function resolveSupabaseUser(
  supabaseUser: { id: string; email?: string },
  accessToken: string,
): Promise<{ user: User; token: string } | null> {
  try {
    const result = await withTimeout(
      supabase.from("profiles").select("*").eq("id", supabaseUser.id).single(),
      3000,
    );
    /* null = timed out */
    if (!result) {
      console.warn("[HeartSpace auth] Profile fetch timed out for", supabaseUser.id);
      return null;
    }

    const { data: profile, error: profileError } = result;
    console.log("[HeartSpace auth] resolveSupabaseUser profile:", profile, "error:", profileError?.code);

    /* If a non-"not found" error comes back (e.g. RLS policy blocks read),
       return null so the caller keeps whatever user state it already has. */
    if (profileError && profileError.code !== "PGRST116") {
      console.warn("[HeartSpace auth] Profile blocked:", profileError.message,
        "— add RLS policy: CREATE POLICY \"Users can read own profile\" ON public.profiles FOR SELECT USING (auth.uid() = id);");
      return null;
    }

    const role   = (profile?.role as SupabaseRole) ?? "prep_student";
    const mapped = ROLE_MAP[role] ?? ROLE_MAP["prep_student"];
    console.log("[HeartSpace auth] role resolved:", role, "space:", mapped.space);

    const heartUser = {
      id:        supabaseUser.id as any,
      email:     supabaseUser.email ?? "",
      name:      profile?.full_name ?? supabaseUser.email ?? "User",
      role:      mapped.role,
      space:     mapped.space,
      avatarUrl: profile?.avatar_url ?? null,
    } as User;

    return { user: heartUser, token: accessToken };
  } catch (e) {
    console.error("[HeartSpace auth] resolveSupabaseUser error:", e);
    return null;
  }
}

/* A Supabase JWT has the form header.payload.signature (two dots).
   Demo/signup tokens are plain base64 and contain no dots. */
function isSupabaseJwt(token: string | null): boolean {
  return !!token && (token.match(/\./g) ?? []).length >= 2;
}

function readCachedUser(): User | null {
  try {
    const saved = localStorage.getItem("heartspace_user");
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  /* Only seed from localStorage for demo/signup sessions.
     Real Supabase users always start as null and wait for a fresh profile
     fetch — this prevents stale role/name data from a previous session
     from ever being shown. */
  const cachedToken = (() => { try { return localStorage.getItem("heartspace_token"); } catch { return null; } })();
  const isDemoSession = !isSupabaseJwt(cachedToken);

  const [user,  setUser]  = useState<User | null>(() => isDemoSession ? readCachedUser() : null);
  const [token, setToken] = useState<string | null>(() => isDemoSession ? cachedToken : null);

  /* Show a loading spinner until Supabase responds for real users.
     Demo users are shown immediately from cache. */
  const [isLoading, setIsLoading] = useState(!isDemoSession);

  const persistUser = useCallback((u: User | null, t: string | null) => {
    setUser(u);
    setToken(t);
    try {
      if (u && t) {
        localStorage.setItem("heartspace_user", JSON.stringify(u));
        localStorage.setItem("heartspace_token", t);
      } else {
        localStorage.removeItem("heartspace_user");
        localStorage.removeItem("heartspace_token");
        localStorage.removeItem("heartspace_role");
      }
    } catch { /* storage unavailable */ }
  }, []);

  useEffect(() => {
    /* Absolute hard cap — app is ALWAYS shown within 5 seconds */
    const hardCap = setTimeout(() => setIsLoading(false), 5000);

    (async () => {
      try {
        const result = await withTimeout(supabase.auth.getSession(), 4000);
        if (result?.data?.session) {
          /* Real Supabase session → always fetch fresh profile, never use cache */
          const session  = result.data.session;
          const resolved = await resolveSupabaseUser(session.user, session.access_token);
          if (resolved) {
            persistUser(resolved.user, resolved.token);
          }
          /* If resolved is null (timeout/RLS), keep whatever state exists
             rather than logging the user out — they can re-login if stale. */
        } else {
          /* No Supabase session.  If we have a demo token, keep it.
             Otherwise clear any leftover Supabase user data. */
          if (!isDemoSession) persistUser(null, null);
        }
      } catch { /* supabase unreachable — keep current state */ }
      clearTimeout(hardCap);
      setIsLoading(false);
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        if (session) {
          /* SIGNED_IN / TOKEN_REFRESHED → always fetch fresh profile */
          const resolved = await resolveSupabaseUser(session.user, session.access_token);
          if (resolved) persistUser(resolved.user, resolved.token);
        } else {
          /* SIGNED_OUT */
          const isDemoToken = !!localStorage.getItem("heartspace_token")?.includes(":demo:");
          if (!isDemoToken) persistUser(null, null);
        }
      } catch { /* ignore */ }
    });

    return () => {
      clearTimeout(hardCap);
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistUser]);

  const login = useCallback((newUser: User, newToken: string) => {
    persistUser(newUser, newToken);
  }, [persistUser]);

  const logout = useCallback(async () => {
    try { await supabase.auth.signOut(); } catch { /* ignore */ }
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
