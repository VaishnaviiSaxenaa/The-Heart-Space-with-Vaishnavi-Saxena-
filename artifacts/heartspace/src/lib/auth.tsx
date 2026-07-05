import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
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

const ADMIN_EMAIL = "theheartspacewithvs@gmail.com";

async function resolveSupabaseUser(
  supabaseUser: { id: string; email?: string },
  accessToken: string,
): Promise<{ user: User; token: string } | null> {
  if (supabaseUser.email === ADMIN_EMAIL) {
    return {
      user: {
        id: supabaseUser.id as any,
        email: supabaseUser.email,
        name: "Vaishnavi Saxena",
        role: "counsellor",
        space: null,
        avatarUrl: null,
        exam_type: null,
      } as any,
      token: accessToken,
    };
  }

  try {
    const result = await withTimeout(
      supabase
        .from("profiles")
        .select("id, email, full_name, role, plan, avatar_url, exam_type, status")
        .eq("id", supabaseUser.id)
        .single()
        .then((r) => r),
      10000,
    );

    if (!result) {
      console.warn(
        "[HeartSpace auth] Profile fetch timed out — using fallback",
      );
      return {
        user: {
          id: supabaseUser.id as any,
          email: supabaseUser.email ?? "",
          name: supabaseUser.email?.split("@")[0] ?? "User",
          role: "student" as any,
          space: "zenith",
          plan: "zenith",
          exam_type: "JAM",
          avatarUrl: null,
        } as any,
        token: accessToken,
      };
    }

    const { data: profile, error: profileError } = result;
    console.log(
      "[HeartSpace auth] profile:",
      profile,
      "error:",
      profileError?.code,
    );

    if (profileError && profileError.code !== "PGRST116") {
      console.warn("[HeartSpace auth] Profile error — using fallback");
      return {
        user: {
          id: supabaseUser.id as any,
          email: supabaseUser.email ?? "",
          name: supabaseUser.email?.split("@")[0] ?? "User",
          role: "student" as any,
          space: "zenith",
          plan: "zenith",
          exam_type: "JAM",
          avatarUrl: null,
        } as any,
        token: accessToken,
      };
    }

    const supaRole = (profile?.role as SupabaseRole) ?? "prep_student";
    const mapped = ROLE_MAP[supaRole] ?? ROLE_MAP["prep_student"];
    const planFromDB = profile?.plan ?? mapped.space;
    const examType = profile?.exam_type ?? null;

    console.log(
      "[HeartSpace auth] role:",
      supaRole,
      "plan:",
      planFromDB,
      "exam_type:",
      examType,
    );

    const displayName =
      profile?.full_name?.trim() ||
      (supabaseUser.email?.split("@")[0] ?? "User");

    const heartUser = {
      id: supabaseUser.id as any,
      email: supabaseUser.email ?? "",
      name: displayName,
      role: mapped.role,
      space: planFromDB,
      avatarUrl: profile?.avatar_url ?? null,
      exam_type: examType,
      status: profile?.status ?? null,
    } as any;

    return { user: heartUser, token: accessToken };
  } catch (e) {
    console.error("[HeartSpace auth] resolveSupabaseUser error:", e);
    return null;
  }
}

function isSupabaseJwt(token: string | null): boolean {
  return !!token && (token.match(/\./g) ?? []).length >= 2;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const t = localStorage.getItem("heartspace_token");
      if (isSupabaseJwt(t)) return null;
      const saved = localStorage.getItem("heartspace_user");
      return saved ? (JSON.parse(saved) as User) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    try {
      const t = localStorage.getItem("heartspace_token");
      return isSupabaseJwt(t) ? null : t;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(() => {
    try {
      return isSupabaseJwt(localStorage.getItem("heartspace_token"));
    } catch {
      return true;
    }
  });

  const isDemoSession = !isSupabaseJwt(
    (() => {
      try {
        return localStorage.getItem("heartspace_token");
      } catch {
        return null;
      }
    })(),
  );

  const persistUser = useCallback((u: User | null, t: string | null) => {
    setUser(u);
    setToken(t);
    try {
      if (u && t) {
        localStorage.setItem("heartspace_user", JSON.stringify(u));
        localStorage.setItem("heartspace_token", t);
        pushAllToDB(u.id)
          .then(() => syncAllFromDB(u.id))
          .catch(() => {});
      } else {
        localStorage.removeItem("heartspace_user");
        localStorage.removeItem("heartspace_token");
        localStorage.removeItem("heartspace_role");
      }
    } catch {
      /* storage unavailable */
    }
  }, []);

  useEffect(() => {
    const hardCap = setTimeout(() => setIsLoading(false), 5000);

    (async () => {
      try {
        const result = await withTimeout(
          supabase.auth.getSession().then((r) => r),
          4000,
        );
        if (result?.data?.session) {
          const session = result.data.session;
          const resolved = await resolveSupabaseUser(
            session.user,
            session.access_token,
          );
          if (resolved) persistUser(resolved.user, resolved.token);
        } else {
          if (!isDemoSession) persistUser(null, null);
        }
      } catch {
        /* supabase unreachable */
      }
      clearTimeout(hardCap);
      setIsLoading(false);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        if (session) {
          const resolved = await resolveSupabaseUser(
            session.user,
            session.access_token,
          );
          if (resolved) persistUser(resolved.user, resolved.token);
        } else {
          const isDemoToken = !!localStorage
            .getItem("heartspace_token")
            ?.includes(":demo:");
          if (!isDemoToken) persistUser(null, null);
        }
      } catch {
        /* ignore */
      }
    });

    return () => {
      clearTimeout(hardCap);
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistUser]);

  const login = useCallback(
    (newUser: User, newToken: string) => {
      persistUser(newUser, newToken);
    },
    [persistUser],
  );

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
    persistUser(null, null);
  }, [persistUser]);

  return (
    <AuthContext.Provider
      value={{ user, token, login, logout, isAuthenticated: !!user, isLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined)
    throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
