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

import logoImg from "../assets/logo-transparent.png";
import { User, Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
const CREAM = "#F8F5F0";
const CHARCOAL = "#3D3530";
const GOLD = "#8B7FC7";
const SIDEBAR = "#2D2A25";
const MUTED = "#7A7267";
const BORDER = "#E5DDD0";
const LEAF_GREEN = "#6B8F5A";

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

/* Price in INR. 0 = free, no payment required */
const PRICES: Record<ServiceKey, number> = {
  academy_student: 0,
  prep_student: 149,
  counseling_client: 999,
};

declare global {
  interface Window {
    Razorpay: any;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

async function payForPlan(
  amountRupees: number,
  fullName: string,
  email: string,
  description: string = "Plan purchase",
): Promise<boolean> {
  const scriptLoaded = await loadRazorpayScript();
  if (!scriptLoaded) {
    alert("Unable to load payment gateway. Please check your connection.");
    return false;
  }

  const orderRes = await fetch("/api/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: amountRupees,
      receipt: `receipt_${Date.now()}`,
      notes: { email, fullName, description },
    }),
  });
  if (!orderRes.ok) {
    alert("Could not start payment. Please try again.");
    return false;
  }
  const order = await orderRes.json();

  return new Promise((resolve) => {
    const rzp = new window.Razorpay({
      key: "rzp_test_TCvJJxH73s7fsp",
      amount: order.amount,
      currency: order.currency,
      name: "PrepPilot",
      description,
      order_id: order.id,
      prefill: { name: fullName, email },
      handler: async (response: any) => {
        const verifyRes = await fetch("/api/verify-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(response),
        });
        const verifyData = await verifyRes.json();
        resolve(Boolean(verifyData.verified));
      },
      modal: {
        ondismiss: () => resolve(false),
      },
      theme: { color: "#8B7FC7" },
    });
    rzp.on("payment.failed", () => resolve(false));
    rzp.open();
  });
}

interface Service {
  key: ServiceKey;
  name: string;
  emoji: string;
  color: string;
  tagBg: string;
  tagline: string;
  priceLabel: string;
  bullets: string[];
}

const SERVICES: Service[] = [
  {
    key: "academy_student",
    name: "Zenith",
    emoji: "🏆",
    color: "#6B568F",
    tagBg: "rgba(107,86,143,0.12)",
    tagline: "Full mentorship + counsellor support",
    priceLabel: "Free",
    bullets: [
      "1-on-1 sessions with Sagar Sir and Vaishnavi Ma'am",
      "Fully customized to your pace and schedule",
      "Syllabus & question practice tracking",
      "Personalized roadmap & revision tracker",
      "Mood, sleep & daily habit tracking",
    ],
  },
  {
    key: "prep_student",
    name: "Apex+",
    emoji: "⚡",
    color: "#8B7FC7",
    tagBg: "rgba(139,127,199,0.12)",
    tagline: "Self-prep plan for independent learners",
    priceLabel: "₹149/month",
    bullets: [
      "Syllabus & question practice tracking",
      "Fully customized to your pace and schedule",
      "Personalized roadmap & revision tracker",
      "Daily tracker & progress reports",
      "Entirely self-paced, self-directed learning",
    ],
  },
  {
    key: "counseling_client",
    name: "HeartSpace",
    emoji: "🌿",
    color: "#D4A5A5",
    tagBg: "rgba(212,165,165,0.15)",
    tagline: "Personal counselling + emotional support",
    priceLabel: "From ₹999/month",
    bullets: [
      "Dedicated counsellor sessions (1 hour each)",
      "Emotional wellness tracking",
      "Mood & daily journals",
      "Safe space support",
    ],
  },
];

/* ── Brand header ──────────────────────────────────────────── */
function BrandHeader() {
  return (
    <div className="text-center mb-2">
      <img src={logoImg} alt="PrepPilot by The Heart Space with Vaishnavi Saxena" style={{ width: 130, height: "auto", margin: "0 auto" }} />
    </div>
  );
}

/* ── Service selector ──────────────────────────────────────── */
function ServiceSelector({
  onSelect,
}: {
  onSelect: (key: ServiceKey, heartspaceTier?: 1 | 2) => void;
}) {
  const [hover, setHover] = useState<ServiceKey | null>(null);

  return (
    <div className="w-full max-w-3xl z-10">
      <BrandHeader />
      <div className="text-center mb-3">
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
              onClick={() => { if (s.key !== "counseling_client") onSelect(s.key); }}
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
              <div
                className="text-lg font-extrabold mb-3"
                style={{ color: s.key === "counseling_client" ? LEAF_GREEN : s.color }}
              >
                {s.priceLabel}
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

              {s.key === "counseling_client" ? (
                <div className="space-y-2.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(s.key, 1);
                    }}
                    className="w-full py-2.5 rounded-xl font-semibold text-xs transition-all duration-150 text-left px-3.5 hover:shadow-md active:scale-[0.98]"
                    style={{
                      background: "rgba(212,165,165,0.10)",
                      color: CHARCOAL,
                      border: `1.5px solid ${LEAF_GREEN}`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[13px]" style={{ color: s.color }}>1 session/month</span>
                      <span className="font-extrabold text-[13px]" style={{ color: LEAF_GREEN }}>₹999</span>
                    </div>
                    <div className="text-[10px] font-normal mt-0.5" style={{ color: MUTED }}>
                      One 1-hour counselling session per month
                    </div>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(s.key, 2);
                    }}
                    className="w-full py-2.5 rounded-xl font-semibold text-xs transition-all duration-150 text-left px-3.5 hover:shadow-md active:scale-[0.98]"
                    style={{
                      background: "rgba(212,165,165,0.10)",
                      color: CHARCOAL,
                      border: `1.5px solid ${LEAF_GREEN}`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[13px]" style={{ color: s.color }}>2 sessions/month</span>
                      <span className="font-extrabold text-[13px]" style={{ color: LEAF_GREEN }}>₹1,899</span>
                    </div>
                    <div className="text-[10px] font-normal mt-0.5" style={{ color: MUTED }}>
                      Two 1-hour counselling sessions per month
                    </div>
                  </button>
                </div>
              ) : (
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
              )}
            </div>
          );
        })}
      </div>
      <div
        className="text-center text-xs mt-6 max-w-2xl mx-auto leading-relaxed rounded-xl px-5 py-3"
        style={{ color: CHARCOAL, background: "rgba(212,165,165,0.15)", border: "1px solid rgba(212,165,165,0.35)" }}
      >
        <strong>Please choose your plan carefully.</strong> If it is found that a plan or batch was
        selected intentionally to access content not meant for you, your subscription
        will be permanently cancelled with no refund.
        <br />
        <a href="https://wa.me/919336019395?text=Hello%2C%20I%20need%20help%20regarding%20PrepPilot." target="_blank" rel="noopener noreferrer" className="inline-block mt-2 underline font-bold text-sm" style={{ color: GOLD }}>Contact us</a>{" "}
        in case of any issue.
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
  heartspaceTier,
  onBack,
}: {
  selectedKey: ServiceKey;
  heartspaceTier?: 1 | 2;
  onBack: () => void;
}) {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

      /* ── Step 2.5: Payment (skip for free plans) ── */
      const price =
        selectedKey === "counseling_client"
          ? heartspaceTier === 2
            ? 1899
            : 999
          : PRICES[selectedKey];
      if (price > 0) {
        const paymentDescription =
          selectedKey === "counseling_client"
            ? heartspaceTier === 2
              ? "HeartSpace — 2 sessions/month (1 hour each)"
              : "HeartSpace — 1 session/month (1 hour)"
            : `${service.name} plan`;
        const paid = await payForPlan(
          price,
          v.fullName,
          v.email.trim(),
          paymentDescription,
        );
        if (!paid) {
          toast({
            title: "Payment not completed",
            description: "Please complete payment to activate this plan.",
            variant: "destructive",
          });
          setIsPending(false);
          return;
        }
      }

      /* ── Step 3: Upsert profile with correct role AND plan ── */
      const plan =
        selectedKey === "counseling_client"
          ? `heartspace_${heartspaceTier ?? 1}`
          : PLAN_MAP[selectedKey];
      const paidUntil =
        price > 0
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          : null;
      const { error: upsertErr } = await supabase.from("profiles").upsert(
        {
          id: signInData.user.id,
          full_name: v.fullName,
          email: v.email.trim(),
          role: selectedKey,
          plan: plan,
          status: price > 0 ? "active" : "pending",
          paid_until: paidUntil,
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
        <div className="flex mb-6" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <a
            href="/"
            className="flex-1 text-center pb-3 font-semibold text-sm cursor-pointer"
            style={{ color: MUTED }}
          >
            Sign In
          </a>
          <div
            className="flex-1 text-center pb-3 font-semibold text-sm cursor-pointer"
            style={{ color: GOLD, borderBottom: `2px solid ${GOLD}` }}
          >
            Create Account
          </div>
        </div>
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
                      <div style={{ position: "relative" }}>
                        <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: GOLD, pointerEvents: "none" }}>
                          {name === "fullName" ? <User size={18} /> : name === "email" ? <Mail size={18} /> : <Lock size={18} />}
                        </div>
                        <Input
                          type={
                            name === "password"
                              ? (showPassword ? "text" : "password")
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

            <Button
              type="submit"
              disabled={isPending}
              className="w-full h-12 rounded-xl font-semibold text-base mt-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: `linear-gradient(135deg, ${service.color}CC 0%, ${service.color} 100%)`,
                color: CREAM,
                border: "none",
                boxShadow: `0 4px 16px ${service.color}40`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {isPending ? "Creating account…" : (
                <>
                  {`Join ${service.name}`}
                  <ArrowRight size={18} />
                </>
              )}
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
  const [heartspaceTier, setHeartspaceTier] = useState<1 | 2 | undefined>(undefined);

  const bgStyle = {
    background: "#F5EEEC",
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start pt-3 p-6 relative overflow-hidden"
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
        <ServiceSelector
          onSelect={(key, tier) => {
            setHeartspaceTier(tier);
            setSelected(key);
          }}
        />
      ) : (
        <DetailsForm
          selectedKey={selected}
          heartspaceTier={heartspaceTier}
          onBack={() => setSelected(null)}
        />
      )}
    </div>
  );
}
