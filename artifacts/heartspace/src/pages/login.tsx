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
      onError: () => {
        toast({ title: "Login failed", description: "Please check your credentials and selected role.", variant: "destructive" });
      },
    },
  });

  function onSubmit(values: LoginFormValues) {
    loginMutation.mutate({ data: { ...values, role } });
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "linear-gradient(160deg, hsl(37, 86%, 95%) 0%, hsl(355, 30%, 93%) 50%, hsl(37, 60%, 91%) 100%)" }}
    >
      {/* Decorative orbs */}
      <div
        className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-25 pointer-events-none"
        style={{ background: "hsl(351, 57%, 35%)" }}
      />
      <div
        className="absolute bottom-0 left-0 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: "hsl(38, 65%, 47%)" }}
      />
      <div
        className="absolute top-1/3 left-1/4 w-48 h-48 rounded-full blur-2xl opacity-15 pointer-events-none"
        style={{ background: "hsl(355, 43%, 75%)" }}
      />

      <div className="w-full max-w-sm z-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
        {/* Brand header */}
        <div className="text-center mb-10">
          <h1
            className="text-6xl font-serif font-bold mb-2 tracking-tight"
            style={{ color: "hsl(351, 57%, 33%)" }}
          >
            HeartSpace
          </h1>
          <p
            className="font-serif italic text-lg"
            style={{ color: "hsl(38, 65%, 47%)" }}
          >
            by Vaishnavi Saxena
          </p>
          <div className="mt-3 mx-auto w-16 h-0.5 rounded-full" style={{ background: "hsl(38, 65%, 60%)" }} />
        </div>

        {/* Login card */}
        <div
          className="rounded-2xl p-8 shadow-2xl"
          style={{
            background: "rgba(255,250,243,0.95)",
            backdropFilter: "blur(16px)",
            border: "1px solid hsl(35, 40%, 88%)",
            boxShadow: "0 25px 60px -10px rgba(61,28,2,0.18), 0 8px 20px -4px rgba(139,38,53,0.12)",
          }}
        >
          {/* Role toggle */}
          <div className="flex gap-2 p-1 rounded-xl mb-7" style={{ background: "hsl(35, 30%, 91%)" }}>
            {(["student", "counsellor"] as LoginBodyRole[]).map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className="flex-1 py-2.5 text-sm font-semibold rounded-lg capitalize transition-all duration-200"
                style={{
                  background: role === r ? "linear-gradient(135deg, hsl(351, 57%, 33%) 0%, hsl(351, 57%, 42%) 100%)" : "transparent",
                  color: role === r ? "hsl(37, 86%, 96%)" : "hsl(25, 40%, 42%)",
                  boxShadow: role === r ? "0 2px 8px rgba(139,38,53,0.25)" : "none",
                }}
              >
                {r}
              </button>
            ))}
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold" style={{ color: "hsl(25, 60%, 22%)" }}>Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="hello@example.com"
                        {...field}
                        className="h-11 rounded-xl border-2 transition-all"
                        style={{
                          background: "hsl(37, 86%, 98%)",
                          borderColor: "hsl(35, 40%, 86%)",
                          color: "hsl(25, 94%, 12%)",
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold" style={{ color: "hsl(25, 60%, 22%)" }}>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                        className="h-11 rounded-xl border-2 transition-all"
                        style={{
                          background: "hsl(37, 86%, 98%)",
                          borderColor: "hsl(35, 40%, 86%)",
                          color: "hsl(25, 94%, 12%)",
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-12 rounded-xl font-semibold text-base mt-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                disabled={loginMutation.isPending}
                style={{
                  background: "linear-gradient(135deg, hsl(38, 65%, 42%) 0%, hsl(38, 65%, 54%) 100%)",
                  color: "hsl(37, 86%, 97%)",
                  boxShadow: "0 4px 14px rgba(201,149,42,0.40)",
                  border: "none",
                }}
              >
                {loginMutation.isPending ? "Entering…" : "Enter HeartSpace"}
              </Button>
            </form>
          </Form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "hsl(25, 30%, 55%)" }}>
          A safe space for student wellbeing
        </p>
      </div>
    </div>
  );
}
