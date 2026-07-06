import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../lib/auth";
import { supabase, ROLE_MAP, type SupabaseRole } from "../lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, Eye, EyeOff, ArrowRight, GraduationCap } from "lucide-react";

import logoImg from "../assets/logo-transparent.png";
const CREAM = "#F8F5F0";
const CHARCOAL = "#3D3530";
const GOLD = "#8B7FC7";
const SIDEBAR = "#2D2A25";
const MUTED = "#7A7267";
const BORDER = "#E5DDD0";

const RESET_REDIRECT =
  "https://the-heart-space-with-vaishnavi-saxe-eight.vercel.app";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type LoginFormValues = z.infer<typeof loginSchema>;

/* ── Demo accounts ─────────────────────────────────────────── */
interface DemoAccount {
  email: string;
  name: string;
  role: "student" | "counsellor";
  space: "prep" | "self" | null;
  redirect: string;
}
const DEMO_ACCOUNTS: Record<string, DemoAccount> = {
  "vaishnavi@heartspace.com": {
    email: "vaishnavi@heartspace.com",
    name: "Vaishnavi Saxena",
    role: "counsellor",
    space: null,
    redirect: "/counsellor",
  },
  "counsellor@heartspace.com": {
    email: "counsellor@heartspace.com",
    name: "Dr. Priya Sharma",
    role: "counsellor",
    space: null,
    redirect: "/counsellor",
  },
  "student1@heartspace.com": {
    email: "student1@heartspace.com",
    name: "Arjun Mehta",
    role: "student",
    space: "prep",
    redirect: "/dashboard",
  },
  "student2@heartspace.com": {
    email: "student2@heartspace.com",
    name: "Sneha Kapoor",
    role: "student",
    space: "prep",
    redirect: "/dashboard",
  },
  "student3@heartspace.com": {
    email: "student3@heartspace.com",
    name: "Rohan Verma",
    role: "student",
    space: "self",
    redirect: "/self-dashboard",
  },
  "prep@heartspace.com": {
    email: "prep@heartspace.com",
    name: "Prep Space Student",
    role: "student",
    space: "prep",
    redirect: "/dashboard",
  },
  "counseling@heartspace.com": {
    email: "counseling@heartspace.com",
    name: "Counseling Client",
    role: "student",
    space: "self",
    redirect: "/self-dashboard",
  },
  "academy@heartspace.com": {
    email: "academy@heartspace.com",
    name: "Academy Student",
    role: "student",
    space: "prep",
    redirect: "/dashboard",
  },
};
const DEMO_PASSWORDS = ["heartspace123", "password123"];

function isDemoMatch(email: string, password: string): DemoAccount | null {
  const account = DEMO_ACCOUNTS[email.toLowerCase().trim()];
  if (account && DEMO_PASSWORDS.includes(password.trim())) return account;
  return null;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise.catch(() => null),
    new Promise<null>((r) => setTimeout(() => r(null), ms)),
  ]);
}

/* ── Logo ─────────────────────────────────────────────────── */
function HeartLogo() {
  return (
    <svg width="28" height="26" viewBox="0 0 22 20" fill="none">
      <path
        d="M11 18.5C11 18.5 1.5 12.5 1.5 6.5C1.5 4.01 3.51 2 6 2C8 2 9.75 3.1 11 4.75C12.25 3.1 14 2 16 2C18.49 2 20.5 4.01 20.5 6.5C20.5 12.5 11 18.5 11 18.5Z"
        stroke={GOLD}
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="8"
        y1="7"
        x2="6"
        y2="4"
        stroke={GOLD}
        strokeWidth="1"
        strokeLinecap="round"
      />
      <line
        x1="11"
        y1="5.5"
        x2="11"
        y2="2"
        stroke={GOLD}
        strokeWidth="1"
        strokeLinecap="round"
      />
      <line
        x1="14"
        y1="7"
        x2="16"
        y2="4"
        stroke={GOLD}
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BrandHeader() {
  return (
    <div className="text-center mb-2">
      <img src={logoImg} alt="PrepPilot by The Heart Space with Vaishnavi Saxena" style={{ width: 260, height: "auto", margin: "0 auto" }} />
    </div>
  );
}

/* ── Forgot password view ─────────────────────────────────── */
function ForgotPasswordView({ onBack }: { onBack: () => void }) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSend() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: RESET_REDIRECT,
      });
      if (error) throw error;
      setSent(true);
    } catch (err: any) {
      toast({
        title: "Failed to send",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="rounded-2xl p-8"
      style={{
        background: "rgba(243,237,230,0.96)",
        backdropFilter: "blur(20px)",
        border: `1px solid ${BORDER}`,
        boxShadow:
          "0 20px 60px rgba(61,53,48,.14), 0 6px 16px rgba(61,53,48,.08)",
      }}
    >
      {sent ? (
        <div className="text-center py-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: `${GOLD}22` }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M20 6L9 17L4 12"
                stroke={GOLD}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h2
            className="font-serif text-xl font-bold mb-2"
            style={{ color: SIDEBAR }}
          >
            Check your email
          </h2>
          <p className="text-sm mb-6" style={{ color: MUTED }}>
            We've sent a password reset link to <strong>{email}</strong>.
          </p>
          <button
            onClick={onBack}
            className="text-sm font-semibold underline underline-offset-2"
            style={{ color: GOLD }}
          >
            Back to login
          </button>
        </div>
      ) : (
        <>
          <h2
            className="font-serif text-xl font-bold mb-1"
            style={{ color: SIDEBAR }}
          >
            Reset password
          </h2>
          <p className="text-sm mb-6" style={{ color: MUTED }}>
            Enter your email and we'll send you a reset link.
          </p>
          <div className="space-y-4">
            <div>
              <label
                className="text-sm font-semibold block mb-1.5"
                style={{ color: SIDEBAR }}
              >
                Email
              </label>
              <Input
                type="email"
                placeholder="hello@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSend();
                }}
                className="h-11 rounded-xl border-2 transition-all focus-visible:ring-0"
                style={{
                  background: CREAM,
                  borderColor: BORDER,
                  color: CHARCOAL,
                }}
              />
            </div>
            <Button
              onClick={handleSend}
              disabled={sending}
              className="w-full h-12 rounded-xl font-semibold text-base transition-all duration-200"
              style={{
                background: `linear-gradient(135deg, #6B568F 0%, ${GOLD} 100%)`,
                color: CREAM,
                border: "none",
                boxShadow: "0 4px 16px rgba(230,167,86,0.4)",
              }}
            >
              {sending ? "Sending…" : "Send Reset Link"}
            </Button>
            <p className="text-center text-sm" style={{ color: MUTED }}>
              <button
                onClick={onBack}
                className="font-semibold underline underline-offset-2"
                style={{ color: GOLD }}
              >
                Back to login
              </button>
            </p>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Main login view ──────────────────────────────────────── */
export default function Login() {
  const [, setLocation] = useLocation();
  const { login, isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const space = (user as any)?.space as string | null;
    if (user.role === "counsellor") setLocation("/counsellor");
    else if (space === "heartspace") setLocation("/self-dashboard");
    else setLocation("/dashboard");
  }, [isAuthenticated, user, setLocation]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(v: LoginFormValues) {
    setIsPending(true);
    const email = v.email.toLowerCase().trim();
    const password = v.password.trim();

    localStorage.removeItem("heartspace_user");
    localStorage.removeItem("heartspace_token");
    localStorage.removeItem("heartspace_role");

    /* ── Step 1: Try Supabase ── */
    try {
      const authResult = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }).then((r) => r),
        5000,
      );

      if (authResult?.data?.session) {
        const { data } = authResult;
        console.log("[HeartSpace login] Auth success, user id:", data.user.id);

        /* Hardcoded admin override */
        const ADMIN_EMAIL = "theheartspacewithvs@gmail.com";
        if (data.user.email === ADMIN_EMAIL) {
          login(
            {
              id: data.user.id as any,
              email: data.user.email,
              name: "Vaishnavi Saxena",
              role: "counsellor",
              space: null,
              avatarUrl: null,
              exam_type: null,
            } as any,
            data.session.access_token,
          );
          setIsPending(false);
          setLocation("/counsellor");
          return;
        }

        /* Fetch profile — NOW includes exam_type */
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("id, email, full_name, role, plan, avatar_url, exam_type, status")
          .eq("id", data.user.id)
          .single()
          .then((r) => r);

        if (error) console.error("Profile fetch error:", error);
        console.log("Profile:", profile);

        let resolvedProfile = profile;

        if (!profile && error?.code === "PGRST116") {
          await supabase.from("profiles").insert({
            id: data.user.id,
            full_name: data.user.email?.split("@")[0] ?? "User",
            email: data.user.email ?? null,
            role: "prep_student",
            plan: "apex",
          });
          const { data: fresh } = await supabase
            .from("profiles")
            .select("id, email, full_name, role, plan, avatar_url, exam_type, status")
            .eq("id", data.user.id)
            .single()
            .then((r) => r);
          resolvedProfile = fresh ?? null;
        }

        const supaRole =
          (resolvedProfile?.role as SupabaseRole) ?? "prep_student";
        const mapped = ROLE_MAP[supaRole] ?? ROLE_MAP["prep_student"];
        const planFromDB = resolvedProfile?.plan ?? mapped.space;
        const examType = resolvedProfile?.exam_type ?? null;

        console.log(
          "[HeartSpace login] Role:",
          supaRole,
          "Plan:",
          planFromDB,
          "Exam:",
          examType,
          "→",
          mapped.redirect,
        );

        const displayName =
          resolvedProfile?.full_name?.trim() ||
          (data.user.email?.split("@")[0] ?? "User");

        /* ← exam_type now saved into user object */
        login(
          {
            id: data.user.id as any,
            email: data.user.email ?? email,
            name: displayName,
            role: mapped.role,
            space: planFromDB,
            avatarUrl: resolvedProfile?.avatar_url ?? null,
            exam_type: examType,
            status: resolvedProfile?.status ?? null,
          } as any,
          data.session.access_token,
        );

        setIsPending(false);
        setLocation(mapped.redirect);
        return;
      }
    } catch (authErr) {
      console.warn("[HeartSpace login] Supabase error, trying demo:", authErr);
    }

    /* ── Step 2: Demo account fallback ── */
    const demo = isDemoMatch(email, password);
    if (demo) {
      login(
        {
          id: email as any,
          email: demo.email,
          name: demo.name,
          role: demo.role,
          space: demo.space,
          avatarUrl: null,
          exam_type: null,
        } as any,
        btoa(`${email}:demo:heartspace`),
      );
      setIsPending(false);
      setLocation(demo.redirect);
      return;
    }

    /* ── Step 3: Nothing worked ── */
    setIsPending(false);
    toast({
      title: "Login failed",
      description: "Invalid email or password.",
      variant: "destructive",
    });
  }

  const bgStyle = {
    background: "#F5EEEC",
  };

  const cardStyle = {
    background: "rgba(243,237,230,0.96)",
    backdropFilter: "blur(20px)",
    border: `1px solid ${BORDER}`,
    boxShadow: "0 20px 60px rgba(61,53,48,.14), 0 6px 16px rgba(61,53,48,.08)",
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start pt-8 p-4 relative overflow-hidden"
      style={bgStyle}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-20 blur-3xl"
          style={{ background: GOLD }}
        />
        <div
          className="absolute bottom-10 -left-20 w-72 h-72 rounded-full opacity-15 blur-3xl"
          style={{ background: "#D4A5A5" }}
        />
        <div
          className="absolute top-1/3 left-1/4 w-48 h-48 rounded-full opacity-10 blur-2xl"
          style={{ background: "#A8BFA3" }}
        />
      </div>

      <div className="w-full max-w-[420px] z-10">
        <BrandHeader />

        {showForgot ? (
          <ForgotPasswordView onBack={() => setShowForgot(false)} />
        ) : (
          <>
            <div className="rounded-2xl p-6" style={cardStyle}>
              <div className="flex mb-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
                <div
                  className="flex-1 text-center pb-3 font-semibold text-sm cursor-pointer"
                  style={{ color: GOLD, borderBottom: `2px solid ${GOLD}` }}
                >
                  Sign In
                </div>
                <a
                  href="/signup"
                  className="flex-1 text-center pb-3 font-semibold text-sm cursor-pointer"
                  style={{ color: MUTED }}
                >
                  Create Account
                </a>
              </div>
              <h2
                className="font-serif text-xl font-bold mb-1"
                style={{ color: SIDEBAR }}
              >
                Welcome back
              </h2>
              <p className="text-sm mb-3" style={{ color: MUTED }}>
                Sign in to your account
              </p>

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-3"
                >
                  {(["email", "password"] as const).map((name) => (
                    <FormField
                      key={name}
                      control={form.control}
                      name={name}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel
                            className="text-sm font-semibold capitalize"
                            style={{ color: SIDEBAR }}
                          >
                            {name}
                          </FormLabel>
                          <FormControl>
                            <div style={{ position: "relative" }}>
                              <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: GOLD, pointerEvents: "none" }}>
                                {name === "email" ? <Mail size={18} /> : <Lock size={18} />}
                              </div>
                              <Input
                                type={name === "password" ? (showPassword ? "text" : "password") : "email"}
                                placeholder={
                                  name === "email"
                                    ? "hello@example.com"
                                    : "••••••••"
                                }
                                {...field}
                                className="h-11 rounded-xl border-2 transition-all focus-visible:ring-0"
                                style={{
                                  background: CREAM,
                                  borderColor: BORDER,
                                  color: CHARCOAL,
                                  paddingLeft: 40,
                                  paddingRight: name === "password" ? 40 : undefined,
                                }}
                              />
                              {name === "password" && (
                                <button
                                  type="button"
                                  onClick={() => setShowPassword((p) => !p)}
                                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: MUTED, background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}
                                >
                                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}

                  <div className="text-right -mt-2">
                    <button
                      type="button"
                      onClick={() => setShowForgot(true)}
                      className="text-xs font-medium underline underline-offset-2"
                      style={{ color: MUTED }}
                    >
                      Forgot password?
                    </button>
                  </div>

                  <Button
                    type="submit"
                    disabled={isPending}
                    className="w-full h-12 rounded-xl font-semibold text-base transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      background: `linear-gradient(135deg, #6B568F 0%, ${GOLD} 100%)`,
                      color: CREAM,
                      border: "none",
                      boxShadow: "0 4px 16px rgba(230,167,86,0.4)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    {isPending ? "Signing in…" : (
                      <>
                        Enter HeartSpace
                        <ArrowRight size={18} />
                      </>
                    )}
                  </Button>
                </form>
              </Form>

              <p className="text-center text-sm mt-5" style={{ color: MUTED }}>
                New here?{" "}
                <a
                  href="/signup"
                  className="font-semibold underline underline-offset-2"
                  style={{ color: GOLD }}
                >
                  Create an account
                </a>
              </p>
            </div>


          </>
        )}

        <div className="text-center mt-4">
          <GraduationCap size={28} style={{ color: GOLD, margin: "0 auto 0.5rem" }} />
          <p className="font-serif font-bold text-lg" style={{ color: SIDEBAR }}>
            Imagine having everything you need to prepare,
          </p>
          <p className="text-sm mb-3" style={{ color: MUTED }}>
            in one intelligent space.
          </p>
          <p className="text-xs" style={{ color: MUTED }}>
            Roadmaps &middot; Question Practice &middot; Studies &middot; Revision &middot; Notes
          </p>
          <p className="text-xs" style={{ color: MUTED }}>
            Mood Tracking &middot; Trends &middot; Reports &middot; And more.
          </p>
        </div>
      </div>
    </div>
  );
}
