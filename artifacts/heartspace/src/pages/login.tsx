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

/* Brand tokens */
const BROWN   = "hsl(20, 33%, 27%)";
const BROWN_D = "hsl(20, 33%, 20%)";
const GOLD    = "hsl(43, 89%, 38%)";
const GOLD_L  = "hsl(43, 80%, 58%)";
const CREAM   = "hsl(37, 86%, 96%)";
const DUST    = "hsl(27, 46%, 59%)";
const IVORY   = "hsl(38, 78%, 95%)";
const TEXT    = "hsl(15, 47%, 12%)";
const MUTED   = "hsl(20, 20%, 45%)";

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
      style={{ background: `linear-gradient(160deg, ${CREAM} 0%, hsl(32,55%,91%) 55%, hsl(38,70%,93%) 100%)` }}
    >
      {/* Warm decorative blobs */}
      <div className="absolute top-[-4rem] right-[-4rem] w-96 h-96 rounded-full blur-3xl opacity-30 pointer-events-none"
        style={{ background: DUST }} />
      <div className="absolute bottom-[-4rem] left-[-4rem] w-80 h-80 rounded-full blur-3xl opacity-25 pointer-events-none"
        style={{ background: GOLD }} />
      <div className="absolute top-1/2 left-1/3 w-56 h-56 rounded-full blur-2xl opacity-15 pointer-events-none"
        style={{ background: BROWN }} />

      <div className="w-full max-w-sm z-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
        {/* Branding */}
        <div className="text-center mb-10">
          <h1 className="text-6xl font-serif font-bold mb-2 tracking-tight" style={{ color: BROWN }}>
            HeartSpace
          </h1>
          <p className="font-serif italic text-lg" style={{ color: GOLD }}>
            by Vaishnavi Saxena
          </p>
          <div className="mt-3 mx-auto w-14 h-0.5 rounded-full" style={{ background: GOLD_L }} />
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: "rgba(250,243,232,0.97)",
            backdropFilter: "blur(16px)",
            border: "1px solid hsl(32,40%,88%)",
            boxShadow: "0 24px 56px -10px rgba(44,24,16,0.18), 0 8px 20px -4px rgba(92,61,46,0.10)",
          }}
        >
          {/* Role toggle */}
          <div className="flex gap-2 p-1 rounded-xl mb-7" style={{ background: "hsl(35,30%,91%)" }}>
            {(["student", "counsellor"] as LoginBodyRole[]).map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className="flex-1 py-2.5 text-sm font-semibold rounded-lg capitalize transition-all duration-200"
                style={
                  role === r
                    ? {
                        background: `linear-gradient(135deg, ${BROWN_D} 0%, ${BROWN} 100%)`,
                        color: CREAM,
                        boxShadow: "0 2px 8px rgba(92,61,46,0.30)",
                      }
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
                <FormField
                  key={name}
                  control={form.control}
                  name={name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold capitalize" style={{ color: "hsl(20,33%,30%)" }}>
                        {name}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type={name === "password" ? "password" : "email"}
                          placeholder={name === "email" ? "hello@example.com" : "••••••••"}
                          {...field}
                          className="h-11 rounded-xl border-2 transition-all"
                          style={{ background: CREAM, borderColor: "hsl(32,35%,86%)", color: TEXT }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}

              <Button
                type="submit"
                className="w-full h-12 rounded-xl font-semibold text-base mt-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                disabled={loginMutation.isPending}
                style={{
                  background: `linear-gradient(135deg, hsl(43,89%,34%) 0%, hsl(43,85%,46%) 100%)`,
                  color: "hsl(37,86%,97%)",
                  boxShadow: "0 4px 16px rgba(184,134,11,0.38)",
                  border: "none",
                }}
              >
                {loginMutation.isPending ? "Entering…" : "Enter HeartSpace"}
              </Button>
            </form>
          </Form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: MUTED }}>
          A safe space for student wellbeing
        </p>
      </div>
    </div>
  );
}
