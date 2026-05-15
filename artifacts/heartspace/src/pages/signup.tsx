import { useState } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase, ROLE_MAP, type SupabaseRole } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const CREAM    = "#FAF7F2";
const CHARCOAL = "#3D3530";
const GOLD     = "#E6A756";
const SIDEBAR  = "#3D2314";
const MUTED    = "#8C7B70";
const BORDER   = "#E8DDD0";

const signupSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email:    z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
type SignupFormValues = z.infer<typeof signupSchema>;

export default function Signup() {
  const [, setLocation]   = useLocation();
  const { login }         = useAuth();
  const { toast }         = useToast();
  const [isPending, setIsPending] = useState(false);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: "", email: "", password: "" },
  });

  async function onSubmit(v: SignupFormValues) {
    setIsPending(true);
    try {
      /* ── Step 1: Create account ── */
      const { error: signUpError } = await supabase.auth.signUp({
        email:    v.email,
        password: v.password,
        options:  { data: { full_name: v.fullName } },
      });

      if (signUpError) throw signUpError;

      /* ── Step 2: Sign in immediately — no email confirmation needed ── */
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email:    v.email,
        password: v.password,
      });

      if (signInError || !signInData?.session) {
        /* Account created but sign-in failed — send to login with a hint */
        toast({
          title:       "Account created!",
          description: "Please sign in with your new credentials.",
        });
        setLocation("/");
        return;
      }

      /* ── Step 3: Resolve profile (may not exist yet — use fallback) ── */
      const profileResult = await supabase
        .from("profiles")
        .select("full_name, role, avatar_url")
        .eq("id", signInData.user.id)
        .single()
        .catch(() => ({ data: null, error: null }));

      const profile = profileResult.data ?? null;
      const role    = (profile?.role as SupabaseRole) ?? "prep_student";
      const mapped  = ROLE_MAP[role] ?? ROLE_MAP["prep_student"];

      login({
        id:        signInData.user.id as any,
        email:     signInData.user.email ?? v.email,
        name:      profile?.full_name ?? v.fullName,
        role:      mapped.role,
        space:     mapped.space,
        avatarUrl: profile?.avatar_url ?? null,
      } as any, signInData.session.access_token);

      toast({
        title:       "Welcome to HeartSpace! 🎉",
        description: `Hi ${v.fullName.split(" ")[0]}, your account is ready.`,
      });

      setLocation(mapped.redirect);
    } catch (err: any) {
      toast({
        title:       "Sign up failed",
        description: err?.message ?? "Something went wrong. Please try again.",
        variant:     "destructive",
      });
    } finally {
      setIsPending(false);
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

        <div
          className="rounded-2xl p-8"
          style={{
            background:    "rgba(243,237,230,0.96)",
            backdropFilter: "blur(20px)",
            border:        `1px solid ${BORDER}`,
            boxShadow:     "0 20px 60px rgba(61,53,48,.14), 0 6px 16px rgba(61,53,48,.08)",
          }}
        >
          <h2 className="text-xl font-serif font-bold mb-1" style={{ color: SIDEBAR }}>Create your account</h2>
          <p className="text-sm mb-6" style={{ color: MUTED }}>Join HeartSpace as a student — no confirmation email needed</p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {(["fullName", "email", "password"] as const).map((name) => (
                <FormField key={name} control={form.control} name={name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold" style={{ color: SIDEBAR }}>
                        {name === "fullName" ? "Full name" : name === "email" ? "Email" : "Password"}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type={name === "password" ? "password" : name === "email" ? "email" : "text"}
                          placeholder={
                            name === "fullName" ? "Your full name"
                            : name === "email"  ? "hello@example.com"
                            : "Min. 8 characters"
                          }
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
                {isPending ? "Creating account…" : "Create Account"}
              </Button>

              <p className="text-center text-sm pt-1" style={{ color: MUTED }}>
                Already have an account?{" "}
                <button type="button" onClick={() => setLocation("/")}
                  className="font-semibold underline underline-offset-2" style={{ color: GOLD }}>
                  Sign in
                </button>
              </p>
            </form>
          </Form>
        </div>

        <p className="text-center text-xs mt-5" style={{ color: MUTED }}>A safe space for student wellbeing</p>
      </div>
    </div>
  );
}
