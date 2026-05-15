import { useState } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../lib/auth";
import { supabase, ROLE_MAP, type SupabaseRole } from "../lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const CREAM   = "#FAF7F2";
const CHARCOAL= "#3D3530";
const GOLD    = "#E6A756";
const SIDEBAR = "#3D2314";
const MUTED   = "#8C7B70";
const BORDER  = "#E8DDD0";

const loginSchema = z.object({
  email:    z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type LoginFormValues = z.infer<typeof loginSchema>;

interface DemoAccount {
  email: string; name: string;
  role: "student" | "counsellor"; space: "prep" | "self" | null; redirect: string;
}
const DEMO_ACCOUNTS: Record<string, DemoAccount> = {
  "vaishnavi@heartspace.com":  { email: "vaishnavi@heartspace.com",  name: "Vaishnavi Saxena",   role: "counsellor", space: null,   redirect: "/counsellor"     },
  "prep@heartspace.com":       { email: "prep@heartspace.com",       name: "Prep Space Student", role: "student",    space: "prep", redirect: "/dashboard"      },
  "counseling@heartspace.com": { email: "counseling@heartspace.com", name: "Counseling Client",  role: "student",    space: "self", redirect: "/self-dashboard" },
  "academy@heartspace.com":    { email: "academy@heartspace.com",    name: "Academy Student",    role: "student",    space: "prep", redirect: "/dashboard"      },
};
const DEMO_PASSWORD = "heartspace123";

/* Race Supabase calls against a timeout */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), ms))]);
}

export default function Login() {
  const [, setLocation]  = useLocation();
  const { login }        = useAuth();
  const { toast }        = useToast();
  const [isPending, setIsPending] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(v: LoginFormValues) {
    setIsPending(true);
    const email = v.email.toLowerCase().trim();

    /* ── 1. Demo accounts — INSTANT, no network ── */
    const demo = DEMO_ACCOUNTS[email];
    if (demo && v.password === DEMO_PASSWORD) {
      login({
        id: email as any, email: demo.email, name: demo.name,
        role: demo.role, space: demo.space, avatarUrl: null,
      } as any, btoa(`${email}:demo:heartspace`));
      setIsPending(false);
      setLocation(demo.redirect);
      return;
    }

    /* ── 2. Real Supabase auth — 5-second timeout ── */
    try {
      const authResult = await withTimeout(
        supabase.auth.signInWithPassword({ email: v.email.trim(), password: v.password }),
        5000,
      );

      if (!authResult) {
        throw new Error("Connection timed out. Please check your network.");
      }

      const { data, error } = authResult;
      if (error || !data.session) throw error ?? new Error("Sign-in failed");

      /* Fetch profile with a 3-second timeout */
      const profileResult = await withTimeout(
        supabase.from("profiles").select("full_name, role, avatar_url").eq("id", data.user.id).single(),
        3000,
      );

      const profile = profileResult?.data ?? null;
      const role    = (profile?.role as SupabaseRole) ?? "prep_student";
      const mapped  = ROLE_MAP[role] ?? ROLE_MAP["prep_student"];

      login({
        id: data.user.id as any, email: data.user.email ?? "",
        name: profile?.full_name ?? data.user.email ?? "User",
        role: mapped.role, space: mapped.space, avatarUrl: profile?.avatar_url ?? null,
      } as any, data.session.access_token);

      setIsPending(false);
      setLocation(mapped.redirect);
      return;
    } catch (err: any) {
      setIsPending(false);
      toast({
        title: "Login failed",
        description: err?.message ?? "Invalid email or password. Use the demo accounts below.",
        variant: "destructive",
      });
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden"
      style={{ background: `linear-gradient(155deg, ${CREAM} 0%, #EDE4D8 55%, #E8DDD0 100%)` }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-20 blur-3xl" style={{ background: GOLD }} />
        <div className="absolute bottom-10 -left-20 w-72 h-72 rounded-full opacity-15 blur-3xl" style={{ background: "#D4A5A5" }} />
        <div className="absolute top-1/3 left-1/4 w-48 h-48 rounded-full opacity-10 blur-2xl" style={{ background: "#A8BFA3" }} />
      </div>

      <div className="w-full max-w-[420px] z-10">
        {/* Brand */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-2">
            <svg width="28" height="26" viewBox="0 0 22 20" fill="none">
              <path d="M11 18.5C11 18.5 1.5 12.5 1.5 6.5C1.5 4.01 3.51 2 6 2C8 2 9.75 3.1 11 4.75C12.25 3.1 14 2 16 2C18.49 2 20.5 4.01 20.5 6.5C20.5 12.5 11 18.5 11 18.5Z"
                stroke={GOLD} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="8"  y1="7"   x2="6"  y2="4"  stroke={GOLD} strokeWidth="1" strokeLinecap="round" />
              <line x1="11" y1="5.5" x2="11" y2="2"  stroke={GOLD} strokeWidth="1" strokeLinecap="round" />
              <line x1="14" y1="7"   x2="16" y2="4"  stroke={GOLD} strokeWidth="1" strokeLinecap="round" />
            </svg>
            <h1 className="text-5xl font-serif font-bold tracking-tight" style={{ color: SIDEBAR }}>HeartSpace</h1>
          </div>
          <p className="font-serif italic" style={{ color: GOLD }}>with Vaishnavi Saxena</p>
          <div className="mt-3 mx-auto w-12 h-px rounded-full" style={{ background: GOLD }} />
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: "rgba(243,237,230,0.96)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(216,207,196,0.7)",
            boxShadow: "0 20px 60px rgba(61,53,48,.14), 0 6px 16px rgba(61,53,48,.08)",
          }}
        >
          <h2 className="font-serif text-xl font-bold mb-1" style={{ color: SIDEBAR }}>Welcome back</h2>
          <p className="text-sm mb-6" style={{ color: MUTED }}>Sign in to your account</p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {(["email", "password"] as const).map((name) => (
                <FormField key={name} control={form.control} name={name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold capitalize" style={{ color: SIDEBAR }}>{name}</FormLabel>
                      <FormControl>
                        <Input
                          type={name === "password" ? "password" : "email"}
                          placeholder={name === "email" ? "hello@example.com" : "••••••••"}
                          {...field}
                          className="h-11 rounded-xl border-2 transition-all focus-visible:ring-0"
                          style={{ background: CREAM, borderColor: BORDER, color: CHARCOAL }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}

              <Button
                type="submit" disabled={isPending}
                className="w-full h-12 rounded-xl font-semibold text-base mt-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: `linear-gradient(135deg, #C8922A 0%, ${GOLD} 100%)`,
                  color: CREAM, border: "none",
                  boxShadow: "0 4px 16px rgba(230,167,86,0.4)",
                }}
              >
                {isPending ? "Signing in…" : "Enter HeartSpace"}
              </Button>
            </form>
          </Form>

          <p className="text-center text-sm mt-5" style={{ color: MUTED }}>
            New here?{" "}
            <a href="/signup" className="font-semibold underline underline-offset-2" style={{ color: GOLD }}>
              Create an account
            </a>
          </p>
        </div>

        {/* Demo hint */}
        <div className="mt-4 px-4 py-3 rounded-2xl text-[11px] leading-relaxed"
          style={{ background: "rgba(230,167,86,.12)", border: `1px solid rgba(230,167,86,.25)`, color: SIDEBAR }}>
          <p className="font-semibold mb-1" style={{ color: SIDEBAR }}>Demo accounts (password: heartspace123)</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5" style={{ color: MUTED }}>
            <span>vaishnavi@heartspace.com → Counsellor</span>
            <span>prep@heartspace.com → Prep student</span>
            <span>counseling@heartspace.com → Self space</span>
            <span>academy@heartspace.com → Academy</span>
          </div>
        </div>

        <p className="text-center text-xs mt-4" style={{ color: MUTED }}>A safe space for student wellbeing</p>
      </div>
    </div>
  );
}
