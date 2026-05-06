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
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        login(data.user, data.token);
        if (data.user.role === "student") {
          setLocation("/dashboard");
        } else {
          setLocation("/counsellor");
        }
      },
      onError: (error) => {
        toast({
          title: "Login failed",
          description: error.error?.error || "Please check your credentials",
          variant: "destructive",
        });
      },
    },
  });

  function onSubmit(values: LoginFormValues) {
    loginMutation.mutate({ data: { ...values, role } });
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_right,rgba(201,169,110,0.1),transparent_40%)]" />
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_bottom_left,rgba(201,169,110,0.05),transparent_40%)]" />
      
      <div className="w-full max-w-md z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-serif font-bold text-foreground mb-2">HeartSpace</h1>
          <p className="text-primary font-serif italic text-lg">by Vaishnavi Saxena</p>
        </div>

        <Card className="border-none shadow-xl bg-card/90 backdrop-blur">
          <CardHeader className="pb-0">
            <Tabs value={role} onValueChange={(v) => setRole(v as LoginBodyRole)} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1 rounded-xl">
                <TabsTrigger value="student" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Student</TabsTrigger>
                <TabsTrigger value="counsellor" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Counsellor</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground/80">Email</FormLabel>
                      <FormControl>
                        <Input placeholder="hello@example.com" {...field} className="bg-background focus-visible:ring-primary/50" />
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
                      <FormLabel className="text-foreground/80">Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} className="bg-background focus-visible:ring-primary/50" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl h-11 mt-4 transition-all hover:shadow-md"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Entering..." : "Enter Sanctuary"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
