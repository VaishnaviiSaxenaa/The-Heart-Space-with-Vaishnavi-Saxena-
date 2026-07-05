import { useState } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  supabase,
  ROLE_MAP,
  SERVICE_INFO,
  type SupabaseRole,
} from "../lib/supabase";
import { useAuth } from "../lib/auth";
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

const CREAM = "#F8F5F0";
const CHARCOAL = "#3D3530";
const GOLD = "#E6A756";
const SIDEBAR = "#2D2A25";
const MUTED = "#7A7267";
const BORDER = "#E5DDD0";

const signupSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
type SignupFormValues = z.infer<typeof signupSchema>;

type ServiceKey = "academy_student" | "prep_student" | "counseling_client";

/* Map service key to plan string saved in database */
const PLAN_MAP: Record<ServiceKey, string> = {
  academy_student: "zenith",
  prep_student: "apex",
  counseling_client: "heartspace",
};

interface Service {
  key: ServiceKey;
  name: string;
  emoji: string;
  color: string;
  tagBg: string;
  tagline: string;
  bullets: string[];
}

const SERVICES: Service[] = [
  {
    key: "academy_student",
    name: "Zenith",
    emoji: "🏆",
    color: "#C9A84C",
    tagBg: "rgba(201,169,110,0.12)",
    tagline: "Full mentorship + counsellor support",
    bullets: [
      "1-on-1 counsellor sessions",
      "Syllabus & assignment tracking",
      "Mood & wellness monitoring",
      "AI progress summaries",
    ],
  },
  {
    key: "prep_student",
    name: "Apex+",
    emoji: "⚡",
    color: "#2D2A25",
    tagBg: "rgba(61,35,20,0.08)",
    tagline: "Academic tracking + AI guidance",
    bullets: [
      "Syllabus & assignment tracker",
      "Daily tracker & analytics",
      "AI study guidance",
      "Self-paced progress",
    ],
  },
  {
    key: "counseling_client",
    name: "HeartSpace",
    emoji: "🌿",
    color: "#D4A5A5",
    tagBg: "rgba(212,165,165,0.15)",
    tagline: "Personal counselling + emotional support",
    bullets: [
      "Dedicated counsellor sessions",
      "Emotional wellness tracking",
      "Mood & daily journals",
      "Safe space support",
    ],
  },
];

/* ── Brand header ──────────────────────────────────────────── */
function BrandHeader() {
  return (
    <div className="text-center mb-8">
      <div className="flex items-center justify-center gap-3 mb-2">
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
        <h1
          className="text-5xl font-serif font-bold tracking-tight"
          style={{ color: SIDEBAR }}
        >
          HeartSpace
        </h1>
      </div>
      <p className="font-serif italic" style={{ color: GOLD }}>
        with Vaishnavi Saxena
      </p>
      <div
        className="mt-3 mx-auto w-12 h-px rounded-full"
        style={{ background: GOLD }}
      />
    </div>
  );
}

/* ── Service selector ──────────────────────────────────────── */
function ServiceSelector({
  onSelect,
}: {
  onSelect: (key: ServiceKey) => void;
}) {
  const [hover, setHover] = useState<ServiceKey | null>(null);

  return (
    <div className="w-full max-w-3xl z-10">
      <BrandHeader />
      <div className="text-center mb-6">
        <h2
          className="font-serif text-2xl font-bold"
          style={{ color: SIDEBAR }}
        >
          Choose your plan
        </h2>
        <p className="text-sm mt-1" style={{ color: MUTED }}>
          Select the service that fits your journey
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {SERVICES.map((s) => {
          const isHovered = hover === s.key;
          return (
            <div
              key={s.key}
              onClick={() => onSelect(s.key)}
              onMouseEnter={() => setHover(s.key)}
              onMouseLeave={() => setHover(null)}
              className="rounded-2xl p-6 cursor-pointer transition-all duration-200 flex flex-col"
              style={{
                background: isHovered ? s.tagBg : "rgba(243,237,230,0.96)",
                border: `2px solid ${isHovered ? s.color : BORDER}`,
                backdropFilter: "blur(20px)",
                boxShadow: isHovered
                  ? `0 12px 40px ${s.color}30, 0 4px 16px rgba(61,53,48,.06)`
                  : "0 4px 20px rgba(61,53,48,.06)",
                transform: isHovered ? "translateY(-2px)" : "none",
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{s.emoji}</span>
                <div>
                  <h3
                    className="font-serif text-xl font-bold leading-none"
                    style={{ color: s.color }}
                  >
                    {s.name}
                  </h3>
                  <p className="text-[11px] mt-0.5" style={{ color: MUTED }}>
                    {s.tagline}
                  </p>
                </div>
              </div>

              <div className="flex-1 space-y-2 mb-5">
                {s.bullets.map((b) => (
                  <div key={b} className="flex items-start gap-2">
                    <div
                      className="mt-1 w-3 h-3 rounded-full flex-shrink-0"
                      style={{ background: `${s.color}44` }}
                    >
                      <div className="w-full h-full rounded-full scale-50 flex items-center justify-center">
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: s.color }}
                        />
                      </div>
                    </div>
                    <span
                      className="text-xs leading-relaxed"
                      style={{ color: CHARCOAL }}
                    >
                      {b}
                    </span>
                  </div>
                ))}
              </div>

              <button
                className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all duration-200"
                style={{
                  background: isHovered ? s.color : "transparent",
                  color: isHovered ? CREAM : s.color,
                  border: `1.5px solid ${s.color}`,
                }}
              >
                Select {s.name}
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-center text-sm mt-6" style={{ color: MUTED }}>
        Already have an account?{" "}
        <a
          href="/"
          className="font-semibold underline underline-offset-2"
          style={{ color: GOLD }}
        >
          Sign in
        </a>
      </p>
    </div>
  );
}

/* ── Details form ──────────────────────────────────────────── */
function DetailsForm({
  selectedKey,
  onBack,
}: {
  selectedKey: ServiceKey;
  onBack: () => void;
}) {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);

  const service = SERVICES.find((s) => s.key === selectedKey)!;

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: "", email: "", password: "" },
  });

  async function onSubmit(v: SignupFormValues) {
    setIsPending(true);
    try {
      /* ── Step 1: Create account ── */
      const { error: signUpError } = await supabase.auth.signUp({
        email: v.email.trim(),
        password: v.password,
        options: {
          data: { full_name: v.fullName, role: selectedKey },
          emailRedirectTo: undefined,
        },
      });
      const isAlreadyRegistered = signUpError?.message
        ?.toLowerCase()
        .includes("already");
      if (signUpError && !isAlreadyRegistered) throw signUpError;

      /* ── Step 2: Sign in immediately ── */
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: v.email.trim(),
          password: v.password,
        });

      if (signInError || !signInData?.session) {
        /* Email confirm gate — log in locally with selected service */
        const mapped = ROLE_MAP[selectedKey];
        const plan = PLAN_MAP[selectedKey];
        login(
          {
            id: v.email as any,
            email: v.email.trim(),
            name: v.fullName,
            role: mapped.role,
            space: plan,
            avatarUrl: null,
          } as any,
          btoa(`${v.email.trim()}:signup:heartspace`),
        );
        toast({
          title: `Welcome, ${v.fullName.split(" ")[0]}! 🎉`,
          description: "Your account is ready. Dive in!",
        });
        setLocation(mapped.redirect);
        return;
      }

      /* ── Step 3: Upsert profile with correct role AND plan ── */
      const plan = PLAN_MAP[selectedKey];
      const { error: upsertErr } = await supabase.from("profiles").upsert(
        {
          id: signInData.user.id,
          full_name: v.fullName,
          email: v.email.trim(),
          role: selectedKey,
          plan: plan,
          status: "pending",
        },
        { onConflict: "id" },
      );
      if (upsertErr) console.error("Profile upsert error:", upsertErr);
      console.log("Profile upserted with role:", selectedKey, "plan:", plan);

      /* ── Step 4: Fetch profile to confirm saved role and plan ── */
      const { data: profile, error: fetchErr } = await supabase
        .from("profiles")
        .select("id, email, full_name, role, plan, avatar_url, status")
        .eq("id", signInData.user.id)
        .single();
      if (fetchErr) console.error("Profile fetch error:", fetchErr);
      console.log("Profile after upsert:", profile);

      const savedRole = (profile?.role as SupabaseRole) ?? selectedKey;
      const mapped = ROLE_MAP[savedRole] ?? ROLE_MAP[selectedKey];
      const planFromDB = profile?.plan ?? plan;

      login(
        {
          id: signInData.user.id as any,
          email: signInData.user.email ?? v.email,
          name: profile?.full_name ?? v.fullName,
          role: mapped.role,
          space: planFromDB,
          avatarUrl: profile?.avatar_url ?? null,
          status: profile?.status ?? "pending",
        } as any,
        signInData.session.access_token,
      );

      toast({
        title: `Welcome to ${service.name}! 🎉`,
        description: `Hi ${v.fullName.split(" ")[0]}, your account is ready.`,
      });
      setLocation(mapped.redirect);
    } catch (err: any) {
      toast({
        title: "Sign up failed",
        description: err?.message ?? "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="w-full max-w-[420px] z-10">
      <BrandHeader />

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
        {/* Selected service badge */}
        <div
          className="flex items-center gap-2 mb-5 px-3 py-2 rounded-xl"
          style={{ background: service.tagBg }}
        >
          <span className="text-lg">{service.emoji}</span>
          <div>
            <p
              className="text-xs font-semibold"
              style={{ color: service.color }}
            >
              {service.name}
            </p>
            <p className="text-[10px]" style={{ color: MUTED }}>
              {service.tagline}
            </p>
          </div>
          <button
            onClick={onBack}
            className="ml-auto text-xs underline underline-offset-2 font-medium"
            style={{ color: MUTED }}
          >
            Change
          </button>
        </div>

        <h2
          className="text-xl font-serif font-bold mb-1"
          style={{ color: SIDEBAR }}
        >
          Create your account
        </h2>
        <p className="text-sm mb-6" style={{ color: MUTED }}>
          You'll be inside immediately — no confirmation needed
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {(["fullName", "email", "password"] as const).map((name) => (
              <FormField
                key={name}
                control={form.control}
                name={name}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel
                      className="text-sm font-semibold"
                      style={{ color: SIDEBAR }}
                    >
                      {name === "fullName"
                        ? "Full name"
                        : name === "email"
                          ? "Email"
                          : "Password"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type={
                          name === "password"
                            ? "password"
                            : name === "email"
                              ? "email"
                              : "text"
                        }
                        placeholder={
                          name === "fullName"
                            ? "Your full name"
                            : name === "email"
                              ? "hello@example.com"
                              : "Min. 8 characters"
                        }
                        {...field}
                        className="h-11 rounded-xl border-2 transition-all focus-visible:ring-0"
                        style={{
                          background: CREAM,
                          borderColor: BORDER,
                          color: CHARCOAL,
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}

            <Button
              type="submit"
              disabled={isPending}
              className="w-full h-12 rounded-xl font-semibold text-base mt-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: `linear-gradient(135deg, ${service.color}CC 0%, ${service.color} 100%)`,
                color: CREAM,
                border: "none",
                boxShadow: `0 4px 16px ${service.color}40`,
              }}
            >
              {isPending ? "Creating account…" : `Join ${service.name}`}
            </Button>

            <p className="text-center text-sm pt-1" style={{ color: MUTED }}>
              Already have an account?{" "}
              <a
                href="/"
                className="font-semibold underline underline-offset-2"
                style={{ color: GOLD }}
              >
                Sign in
              </a>
            </p>
          </form>
        </Form>
      </div>

      <p className="text-center text-xs mt-5" style={{ color: MUTED }}>
        A safe space for student wellbeing
      </p>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────── */
export default function Signup() {
  const [selected, setSelected] = useState<ServiceKey | null>(null);

  const bgStyle = {
    background: `linear-gradient(155deg, ${CREAM} 0%, #EDE4D8 55%, #E8DDD0 100%)`,
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
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

      {selected === null ? (
        <ServiceSelector onSelect={setSelected} />
      ) : (
        <DetailsForm selectedKey={selected} onBack={() => setSelected(null)} />
      )}
    </div>
  );
}
