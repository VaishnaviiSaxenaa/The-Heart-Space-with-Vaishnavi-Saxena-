import { useState } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLogin, LoginBodyRole } from "@workspace/api-client-react";
import { useAuth } from "../lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const CREAM    = "#FAF7F2";
const CHARCOAL = "#3D3530";
const GOLD     = "#E6A756";
const CARD     = "#F3EDE6";
const SIDEBAR  = "#5C3D2E";
const MUTED    = "#8C7B70";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [role, setRole] = useState<LoginBodyRole>("student");

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        login(data.user, data.token);
        setLocation(data.user.role === "student" ? "/dashboard" : "/counsellor");
      },
      onError: () =>
        toast({ title: "Login failed", description: "Please check your credentials and selected role.", variant: "destructive" }),
    },
  });

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden"
      style={{ background: `linear-gradient(155deg, ${CREAM} 0%, #EDE4D8 55%, #E8DDD0 100%)` }}
    >
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-20 blur-3xl" style={{ background: GOLD }} />
        <div className="absolute bottom-10 -left-20 w-72 h-72 rounded-full opacity-15 blur-3xl" style={{ background: "#D4A5A5" }} />
        <div className="absolute top-1/3 left-1/4 w-48 h-48 rounded-full opacity-10 blur-2xl" style={{ background: "#A8BFA3" }} />
      </div>

      <div className="w-full max-w-[400px] z-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
        {/* Brand */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-2">
            <svg width="28" height="26" viewBox="0 0 22 20" fill="none">
              <path d="M11 18.5C11 18.5 1.5 12.5 1.5 6.5C1.5 4.01 3.51 2 6 2C8 2 9.75 3.1 11 4.75C12.25 3.1 14 2 16 2C18.49 2 20.5 4.01 20.5 6.5C20.5 12.5 11 18.5 11 18.5Z"
                stroke={GOLD} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="8" y1="7" x2="6" y2="4" stroke={GOLD} strokeWidth="1" strokeLinecap="round"/>
              <line x1="11" y1="5.5" x2="11" y2="2" stroke={GOLD} strokeWidth="1" strokeLinecap="round"/>
              <line x1="14" y1="7" x2="16" y2="4" stroke={GOLD} strokeWidth="1" strokeLinecap="round"/>
            </svg>
            <h1 className="text-5xl font-serif font-bold tracking-tight" style={{ color: SIDEBAR }}>
              HeartSpace
            </h1>
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
          {/* Role toggle */}
          <div className="flex gap-1.5 p-1 rounded-xl mb-7" style={{ background: "rgba(61,53,48,.07)" }}>
            {(["student", "counsellor"] as LoginBodyRole[]).map((r) => (
              <button key={r} onClick={() => setRole(r)}
                className="flex-1 py-2.5 text-sm font-semibold rounded-lg capitalize transition-all duration-200"
                style={role === r
                  ? { background: SIDEBAR, color: CREAM, boxShadow: "0 2px 8px rgba(92,61,46,.30)" }
                  : { background: "transparent", color: MUTED }
                }
              >
                {r}
              </button>
            ))}
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => loginMutation.mutate({ data: { ...v, role } }))} className="space-y-5">
              {(["email", "password"] as const).map((name) => (
                <FormField key={name} control={form.control} name={name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold capitalize" style={{ color: "#5C3D2E" }}>{name}</FormLabel>
                      <FormControl>
                        <Input
                          type={name === "password" ? "password" : "email"}
                          placeholder={name === "email" ? "hello@example.com" : "••••••••"}
                          {...field}
                          className="h-11 rounded-xl border-2 transition-all focus-visible:ring-0"
                          style={{ background: CREAM, borderColor: "#D8CFC4", color: CHARCOAL }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}

              <Button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full h-12 rounded-xl font-semibold text-base mt-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: `linear-gradient(135deg, #C8922A 0%, ${GOLD} 100%)`,
                  color: "#FAF7F2", border: "none",
                  boxShadow: "0 4px 16px rgba(230,167,86,.40)",
                }}
              >
                {loginMutation.isPending ? "Entering…" : "Enter HeartSpace"}
              </Button>
            </form>
          </Form>
        </div>

        <p className="text-center text-xs mt-5" style={{ color: MUTED }}>A safe space for student wellbeing</p>
      </div>
    </div>
  );
}
