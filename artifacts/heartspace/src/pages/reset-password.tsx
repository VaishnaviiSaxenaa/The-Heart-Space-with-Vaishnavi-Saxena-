import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "../lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const CREAM    = "#FAF7F2";
const CHARCOAL = "#3D3530";
const GOLD     = "#E6A756";
const SIDEBAR  = "#3D2314";
const MUTED    = "#8C7B70";
const BORDER   = "#E8DDD0";

const schema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirm:  z.string().min(1, "Please confirm your password"),
}).refine((d) => d.password === d.confirm, {
  message: "Passwords do not match",
  path:    ["confirm"],
});
type FormValues = z.infer<typeof schema>;

type PageState = "loading" | "ready" | "success" | "error";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const { toast }       = useToast();
  const [pageState, setPageState] = useState<PageState>("loading");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg]     = useState<string>("");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirm: "" },
  });

  /* Supabase v2 automatically exchanges the hash token (#access_token=...&type=recovery)
     when the page loads. We listen for the PASSWORD_RECOVERY event to know when it's ready. */
  useEffect(() => {
    let settled = false;

    /* Listen for auth state changes — Supabase fires PASSWORD_RECOVERY after
       it successfully exchanges the recovery token from the URL hash. */
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (settled) return;
      if (event === "PASSWORD_RECOVERY") {
        settled = true;
        setPageState("ready");
      } else if (event === "SIGNED_IN") {
        /* Recovery token exchanged, user is now signed in — allow reset */
        settled = true;
        setPageState("ready");
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!settled && data.session) {
        settled = true;
        setPageState("ready");
      }
    });

    /* Fallback: if no token in hash at all, show error after longer delay */
    const timer = setTimeout(() => {
      if (!settled) {
        supabase.auth.getSession().then(({ data }) => {
          if (data.session) {
            settled = true;
            setPageState("ready");
          } else {
            setPageState("error");
            setErrorMsg("This reset link is invalid or has expired. Please request a new one.");
          }
        });
      }
    }, 6000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  async function onSubmit(v: FormValues) {
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: v.password });
      if (error) throw error;
      setPageState("success");
    } catch (err: any) {
      toast({
        title:       "Reset failed",
        description: err?.message ?? "Something went wrong. Please try again.",
        variant:     "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const bgStyle = {
    background: `linear-gradient(155deg, ${CREAM} 0%, #EDE4D8 55%, #E8DDD0 100%)`,
  };

  const cardStyle = {
    background:     "rgba(243,237,230,0.96)",
    backdropFilter: "blur(20px)",
    border:         `1px solid ${BORDER}`,
    boxShadow:      "0 20px 60px rgba(61,53,48,.14), 0 6px 16px rgba(61,53,48,.08)",
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={bgStyle}>
      <div className="w-full max-w-[420px]">
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

        <div className="rounded-2xl p-8" style={cardStyle}>
          {/* Loading */}
          {pageState === "loading" && (
            <div className="flex flex-col items-center justify-center py-8 text-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
              <p className="text-sm" style={{ color: MUTED }}>Verifying your reset link…</p>
            </div>
          )}

          {/* Invalid / expired */}
          {pageState === "error" && (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: "#FDECEA" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 8v5M12 16h.01" stroke="#C0392B" strokeWidth="2.5" strokeLinecap="round" />
                  <circle cx="12" cy="12" r="10" stroke="#C0392B" strokeWidth="2" />
                </svg>
              </div>
              <h2 className="font-serif text-xl font-bold mb-2" style={{ color: SIDEBAR }}>Link expired</h2>
              <p className="text-sm mb-6" style={{ color: MUTED }}>{errorMsg}</p>
              <button
                onClick={() => setLocation("/")}
                className="text-sm font-semibold underline underline-offset-2"
                style={{ color: GOLD }}
              >
                Back to login
              </button>
            </div>
          )}

          {/* Password form */}
          {pageState === "ready" && (
            <>
              <h2 className="font-serif text-xl font-bold mb-1" style={{ color: SIDEBAR }}>Set new password</h2>
              <p className="text-sm mb-6" style={{ color: MUTED }}>Choose a strong password for your account.</p>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {(["password", "confirm"] as const).map((name) => (
                    <FormField key={name} control={form.control} name={name}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold" style={{ color: SIDEBAR }}>
                            {name === "password" ? "New password" : "Confirm password"}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="••••••••"
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
                    type="submit" disabled={submitting}
                    className="w-full h-12 rounded-xl font-semibold text-base mt-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      background: `linear-gradient(135deg, #C8922A 0%, ${GOLD} 100%)`,
                      color: CREAM, border: "none",
                      boxShadow: "0 4px 16px rgba(230,167,86,0.4)",
                    }}
                  >
                    {submitting ? "Saving…" : "Save New Password"}
                  </Button>
                </form>
              </Form>
            </>
          )}

          {/* Success */}
          {pageState === "success" && (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: `${GOLD}22` }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17L4 12" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h2 className="font-serif text-xl font-bold mb-2" style={{ color: SIDEBAR }}>Password updated!</h2>
              <p className="text-sm mb-6" style={{ color: MUTED }}>
                Your password has been changed. Sign in with your new password.
              </p>
              <Button
                onClick={() => setLocation("/")}
                className="w-full h-12 rounded-xl font-semibold text-base transition-all duration-200 hover:scale-[1.02]"
                style={{
                  background: `linear-gradient(135deg, #C8922A 0%, ${GOLD} 100%)`,
                  color: CREAM, border: "none",
                  boxShadow: "0 4px 16px rgba(230,167,86,0.4)",
                }}
              >
                Go to Login
              </Button>
            </div>
          )}
        </div>

        <p className="text-center text-xs mt-4" style={{ color: MUTED }}>A safe space for student wellbeing</p>
      </div>
    </div>
  );
}
