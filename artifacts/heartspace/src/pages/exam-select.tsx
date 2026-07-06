import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { useToast } from "@/hooks/use-toast";

const CREAM = "#FAF7F2";
const GOLD = "#C9A96E";
const SIDEBAR = "#3D2314";
const MUTED = "#8C7B70";
const BORDER = "#E8DDD0";
const CHARCOAL = "#2C1810";

interface Exam {
  key: "JAM" | "NET_GATE";
  name: string;
  subtitle: string;
  emoji: string;
  color: string;
  tagBg: string;
  bullets: string[];
}

const EXAMS: Exam[] = [
  {
    key: "JAM",
    name: "IIT JAM",
    subtitle: "Joint Admission Test for MSc",
    emoji: "🎓",
    color: "#C9A96E",
    tagBg: "rgba(201,169,110,0.12)",
    bullets: [
      "MSc admission at IITs & IISc",
      "February exam every year",
      "Mathematics paper (MA)",
      "Qualify for top MSc programmes",
    ],
  },
  {
    key: "NET_GATE",
    name: "CSIR NET / GATE",
    subtitle: "National Eligibility Test / Graduate Aptitude",
    emoji: "🔬",
    color: "#7B9E87",
    tagBg: "rgba(123,158,135,0.12)",
    bullets: [
      "JRF fellowship + Lectureship eligibility",
      "PhD admissions at top universities",
      "June & December attempts",
      "GATE for engineering mathematics",
    ],
  },
];

export default function ExamSelect() {
  const [, setLocation] = useLocation();
  const { user, login, token } = useAuth();
  const { toast } = useToast();
  const [hover, setHover] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const space = (user as any)?.space as string | null;
  if (space === "heartspace") {
    setLocation("/self-dashboard");
    return null;
  }

  async function handleSelect(examKey: "JAM" | "NET_GATE") {
    if (!user || saving) return;
    setSaving(true);

    try {
      /* Save exam_type to Supabase profiles */
      const { error } = await supabase
        .from("profiles")
        .update({ exam_type: examKey })
        .eq("id", user.id as string)
        .then((r) => r);

      if (error) {
        console.error("Failed to save exam type:", error);
        toast({
          title: "Could not save selection",
          description: "Please try again.",
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      /* Update local user state with exam_type */
      login({ ...user, exam_type: examKey } as any, token ?? "");

      toast({
        title: `${examKey === "JAM" ? "IIT JAM" : "CSIR NET / GATE"} selected! 🎉`,
        description: "Your preparation journey begins now.",
      });

      /* Redirect to correct dashboard */
      const space = (user as any)?.space as string | null;
      if (space === "heartspace") setLocation("/self-dashboard");
      else setLocation("/dashboard");
    } catch (err) {
      console.error("Exam select error:", err);
      setSaving(false);
    }
  }

  const bgStyle = {
    background: `linear-gradient(155deg, ${CREAM} 0%, #EDE4D8 55%, #E8DDD0 100%)`,
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
      style={bgStyle}
    >
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-20 blur-3xl"
          style={{ background: GOLD }}
        />
        <div
          className="absolute bottom-10 -left-20 w-72 h-72 rounded-full opacity-15 blur-3xl"
          style={{ background: "#D4A5A5" }}
        />
      </div>

      <div className="w-full max-w-2xl z-10">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-3">
            <svg width="28" height="26" viewBox="0 0 22 20" fill="none">
              <path
                d="M11 18.5C11 18.5 1.5 12.5 1.5 6.5C1.5 4.01 3.51 2 6 2C8 2 9.75 3.1 11 4.75C12.25 3.1 14 2 16 2C18.49 2 20.5 4.01 20.5 6.5C20.5 12.5 11 18.5 11 18.5Z"
                stroke={GOLD}
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <h1
              className="text-4xl font-serif font-bold"
              style={{ color: SIDEBAR }}
            >
              HeartSpace
            </h1>
          </div>
          <p className="font-serif italic text-sm mb-4" style={{ color: GOLD }}>
            with Vaishnavi Saxena
          </p>
          <h2
            className="text-2xl font-serif font-bold mb-2"
            style={{ color: CHARCOAL }}
          >
            Which exam are you preparing for?
          </h2>
          <p className="text-sm" style={{ color: MUTED }}>
            This helps us show you the right syllabus and roadmap. You can
            change this later.
          </p>
        </div>

        {/* Exam cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
          {EXAMS.map((exam) => {
            const isHovered = hover === exam.key;
            return (
              <div
                key={exam.key}
                onClick={() => !saving && handleSelect(exam.key)}
                onMouseEnter={() => setHover(exam.key)}
                onMouseLeave={() => setHover(null)}
                className="rounded-2xl p-6 cursor-pointer transition-all duration-200 flex flex-col"
                style={{
                  background: isHovered ? exam.tagBg : "rgba(243,237,230,0.96)",
                  border: `2px solid ${isHovered ? exam.color : BORDER}`,
                  backdropFilter: "blur(20px)",
                  boxShadow: isHovered
                    ? `0 12px 40px ${exam.color}30`
                    : "0 4px 20px rgba(61,53,48,.06)",
                  transform: isHovered ? "translateY(-2px)" : "none",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{exam.emoji}</span>
                  <div>
                    <h3
                      className="font-serif text-xl font-bold leading-tight"
                      style={{ color: exam.color }}
                    >
                      {exam.name}
                    </h3>
                    <p className="text-xs mt-0.5" style={{ color: MUTED }}>
                      {exam.subtitle}
                    </p>
                  </div>
                </div>

                <div className="flex-1 space-y-2 mb-5">
                  {exam.bullets.map((b) => (
                    <div key={b} className="flex items-start gap-2">
                      <div
                        className="mt-1.5 w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: exam.color }}
                      />
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
                  disabled={saving}
                  className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200"
                  style={{
                    background: isHovered ? exam.color : "transparent",
                    color: isHovered ? CREAM : exam.color,
                    border: `1.5px solid ${exam.color}`,
                  }}
                >
                  {saving ? "Saving…" : `Select ${exam.name}`}
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs" style={{ color: MUTED }}>
          You can change your exam selection anytime from your profile settings.
        </p>
      </div>
    </div>
  );
}
