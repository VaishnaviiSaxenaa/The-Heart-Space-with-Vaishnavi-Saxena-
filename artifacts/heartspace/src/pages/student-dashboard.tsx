import { useState } from "react";
import { useAuth } from "../lib/auth";
import {
  useGetDashboardSummary, useListMoods, useCreateMood, useListSessions,
  getGetDashboardSummaryQueryKey, getListMoodsQueryKey,
} from "../lib/api-client-react";
import { format } from "date-fns";
import { Loader2, Calendar, Clock, Zap, CheckCircle2, Droplets, BookOpen, Dumbbell, LeafyGreen, Coffee, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

/* ─── Brand tokens ───────────────────────── */
const CREAM    = "#FAF7F2";
const CHARCOAL = "#3D3530";
const GOLD     = "#E6A756";
const CARD     = "#F3EDE6";
const MUTED    = "#8C7B70";
const BORDER   = "#D8CFC4";
const SAGE     = "#A8BFA3";
const OLIVE    = "#6E8B6B";
const ROSE     = "#D4A5A5";
const SIDEBAR  = "#5C3D2E";

/* Mood palette */
const MOODS = [
  { label: "Struggling", color: "#C4785A", bg: "#F4E4DC", text: "#7A3A22" },
  { label: "Low",        color: "#C9A05A", bg: "#F5EDD8", text: "#7A5520" },
  { label: "Okay",       color: "#B5A060", bg: "#F0E8CC", text: "#605020" },
  { label: "Good",       color: SAGE,      bg: "#E8F0E6", text: "#3A5A30" },
  { label: "Great",      color: OLIVE,     bg: "#DFF0DA", text: "#2A5020" },
];

/* Static demo data */
const PROGRESS_ITEMS = [
  { label: "Academics",      pct: 72, color: OLIVE },
  { label: "PhD Journey",    pct: 55, color: SAGE  },
  { label: "Business",       pct: 80, color: GOLD  },
  { label: "Health & Wellness", pct: 65, color: ROSE },
];

const HABITS = [
  { icon: Brain_,   label: "Meditation",   streak: 7  },
  { icon: BookOpen, label: "Reading",      streak: 5  },
  { icon: Dumbbell, label: "Workout",      streak: 3  },
  { icon: Droplets, label: "Water Intake", streak: 12 },
  { icon: LeafyGreen, label: "No Sugar",   streak: 2  },
];

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const DONE_DAYS = [true, true, true, true, false, false, false];

const CHART_DATA = {
  Academics:  [45, 52, 58, 63, 67, 70, 74, 72],
  "PhD Journey": [30, 35, 40, 44, 48, 51, 55, 55],
  Business:   [55, 60, 65, 70, 66, 74, 78, 80],
  Health:     [40, 43, 50, 54, 58, 60, 63, 65],
};
const CHART_COLORS = [OLIVE, SAGE, GOLD, ROSE];

/* Tiny inline "Brain" icon since lucide doesn't export as Brain_ */
function Brain_({ className }: { className?: string }) {
  return <BookOpen className={className} />;
}

/* ─── Sub-components ─────────────────────── */
function Card({ children, className = "", style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: "0 2px 8px rgba(61,53,48,.06)", ...style }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-serif text-lg font-semibold mb-4" style={{ color: CHARCOAL }}>{children}</h2>;
}

/* Circular progress SVG */
function CircularProgress({ pct, size = 120 }: { pct: number; size?: number }) {
  const r = 45; const c = 2 * Math.PI * r;
  const offset = c * (1 - pct / 100);
  return (
    <svg width={size} height={size} viewBox="0 0 110 110">
      <circle cx="55" cy="55" r={r} fill="none" stroke="#E8DDD0" strokeWidth="9" />
      <circle cx="55" cy="55" r={r} fill="none" stroke={GOLD} strokeWidth="9"
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        transform="rotate(-90 55 55)" style={{ transition: "stroke-dashoffset .6s ease" }} />
      <text x="55" y="52" textAnchor="middle" style={{ fontSize: "18px", fontFamily: "'Playfair Display',serif", fill: CHARCOAL, fontWeight: 700 }}>{pct}%</text>
      <text x="55" y="67" textAnchor="middle" style={{ fontSize: "9px", fill: MUTED }}>overall</text>
    </svg>
  );
}

/* Simple SVG line chart */
function GrowthChart() {
  const W = 560; const H = 160; const PAD = { t: 12, r: 20, b: 30, l: 36 };
  const IW = W - PAD.l - PAD.r; const IH = H - PAD.t - PAD.b;
  const weeks = 8;
  const xStep = IW / (weeks - 1);

  const toPath = (vals: number[]) =>
    vals.map((v, i) => `${i === 0 ? "M" : "L"} ${PAD.l + i * xStep} ${PAD.t + IH - (v / 100) * IH}`).join(" ");

  const colors = Object.values(CHART_COLORS);
  const entries = Object.entries(CHART_DATA);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 200 }}>
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((v) => {
          const y = PAD.t + IH - (v / 100) * IH;
          return (
            <g key={v}>
              <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="#E8DDD0" strokeWidth="1" />
              <text x={PAD.l - 6} y={y + 4} textAnchor="end" style={{ fontSize: "9px", fill: MUTED }}>{v}</text>
            </g>
          );
        })}
        {/* X labels */}
        {Array.from({ length: weeks }, (_, i) => (
          <text key={i} x={PAD.l + i * xStep} y={H - 4} textAnchor="middle" style={{ fontSize: "9px", fill: MUTED }}>W{i + 1}</text>
        ))}
        {/* Lines */}
        {entries.map(([key, vals], idx) => (
          <g key={key}>
            <path d={toPath(vals)} fill="none" stroke={colors[idx]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {vals.map((v, i) => (
              <circle key={i} cx={PAD.l + i * xStep} cy={PAD.t + IH - (v / 100) * IH} r="3" fill={colors[idx]} />
            ))}
          </g>
        ))}
      </svg>
      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-3">
        {entries.map(([key], idx) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className="w-3 h-1.5 rounded-full" style={{ background: colors[idx] }} />
            <span className="text-xs" style={{ color: MUTED }}>{key}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main dashboard ─────────────────────── */
export default function StudentDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedMood, setSelectedMood] = useState<number | null>(null);

  const { data: summary, isLoading: loadS } = useGetDashboardSummary(
    { studentId: user?.id }, { query: { enabled: !!user?.id } }
  );
  const { data: moods, isLoading: loadM } = useListMoods(
    { studentId: user?.id, limit: 5 }, { query: { enabled: !!user?.id } }
  );
  const { data: sessions } = useListSessions(
    { studentId: user?.id }, { query: { enabled: !!user?.id } }
  );
  const moodMutation = useCreateMood({
    mutation: {
      onSuccess: () => {
        toast({ title: "Mood logged ✨", description: "Thank you for checking in." });
        qc.invalidateQueries({ queryKey: getListMoodsQueryKey({ studentId: user?.id, limit: 5 }) });
        qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey({ studentId: user?.id }) });
      },
    },
  });

  const handleLogMood = () => {
    if (selectedMood === null || !user?.id) return;
    moodMutation.mutate({ data: { studentId: user.id, mood: selectedMood } });
    setSelectedMood(null);
  };

  /* Time-based greeting */
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = user?.name?.split(" ")[0] ?? "there";

  if (loadS || loadM) return (
    <div className="flex justify-center items-center h-64">
      <Loader2 className="w-7 h-7 animate-spin" style={{ color: GOLD }} />
    </div>
  );

  const upcomingSessions = (sessions ?? []).filter((s) => s.status === "scheduled").slice(0, 5);
  const overallPct = Math.round(PROGRESS_ITEMS.reduce((a, p) => a + p.pct, 0) / PROGRESS_ITEMS.length);

  return (
    <div className="space-y-7 animate-in fade-in duration-500">

      {/* ── Greeting ── */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold" style={{ color: CHARCOAL }}>
            {greeting}, {firstName} ✨
          </h1>
          <p className="mt-1.5 text-sm" style={{ color: MUTED }}>
            You're building your dream life, one intentional day at a time.
          </p>
        </div>
        <button
          className="self-start flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02]"
          style={{
            background: `linear-gradient(135deg, #C8922A 0%, ${GOLD} 100%)`,
            color: "#FAF7F2",
            boxShadow: "0 4px 14px rgba(230,167,86,.35)",
          }}
        >
          <Zap className="w-4 h-4" />Focus Mode
        </button>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: "Total Sessions",   value: summary?.totalSessions ?? 0,  sub: "all time",   color: SIDEBAR },
          { label: "Upcoming",          value: summary?.upcomingSessions ?? 0, sub: "scheduled", color: GOLD },
          { label: "Completed",         value: summary?.completedSessions ?? 0, sub: "sessions", color: OLIVE },
          { label: "Avg Mood",          value: summary?.averageMood ? `${summary.averageMood.toFixed(1)}/5` : "—", sub: "this month", color: ROSE },
          { label: "Daily Progress",    value: "68%",  sub: "today",         color: SAGE },
        ].map(({ label, value, sub, color }) => (
          <Card key={label} className="p-5">
            <div className="text-2xl md:text-3xl font-serif font-bold mb-1" style={{ color }}>{value}</div>
            <div className="text-xs font-semibold" style={{ color: CHARCOAL }}>{label}</div>
            <div className="text-xs" style={{ color: MUTED }}>{sub}</div>
          </Card>
        ))}
      </div>

      {/* ── Today's Plan + Progress ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Plan */}
        <Card className="lg:col-span-2 p-6">
          <SectionTitle>Today's Plan</SectionTitle>
          {upcomingSessions.length > 0 ? (
            <div className="space-y-0">
              {upcomingSessions.map((s, idx) => {
                const tags = ["Academics", "Wellness", "Personal", "Business"];
                const tagColors = [OLIVE, SAGE, GOLD, ROSE];
                const tag = tags[idx % tags.length];
                const tc = tagColors[idx % tagColors.length];
                return (
                  <div key={s.id} className={`flex gap-4 py-4 ${idx < upcomingSessions.length - 1 ? "border-b" : ""}`}
                    style={{ borderColor: BORDER }}>
                    {/* Time */}
                    <div className="w-14 flex-shrink-0 pt-0.5">
                      <span className="text-xs font-medium" style={{ color: MUTED }}>
                        {format(new Date(s.scheduledAt), "h:mm")}
                        <span className="block text-[10px]">{format(new Date(s.scheduledAt), "a")}</span>
                      </span>
                    </div>
                    {/* Dot + line */}
                    <div className="flex flex-col items-center">
                      <div className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: tc }} />
                      {idx < upcomingSessions.length - 1 && (
                        <div className="flex-1 w-px my-1" style={{ background: BORDER }} />
                      )}
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm" style={{ color: CHARCOAL }}>{s.topic || "Counselling Session"}</p>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: `${tc}22`, color: tc }}>{tag}</span>
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: MUTED }}>
                        with {s.counsellor?.name} · {s.durationMinutes} min
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Static demo plan if no sessions */
            <div className="space-y-0">
              {[
                { time: "9:00 AM",  label: "Deep Work Session",    tag: "Academics", icon: BookOpen },
                { time: "11:30 AM", label: "Content Creation",      tag: "Business",  icon: TrendingUp },
                { time: "1:00 PM",  label: "Movement Break",        tag: "Wellness",  icon: Dumbbell },
                { time: "3:00 PM",  label: "PhD Proposal Work",     tag: "PhD",       icon: BookOpen },
                { time: "6:00 PM",  label: "Sunday Reset",          tag: "Personal",  icon: Coffee },
              ].map(({ time, label, tag, icon: Icon }, idx, arr) => {
                const tc = [OLIVE, GOLD, SAGE, ROSE, MUTED][idx];
                return (
                  <div key={time} className={`flex gap-4 py-4 ${idx < arr.length - 1 ? "border-b" : ""}`} style={{ borderColor: BORDER }}>
                    <div className="w-14 flex-shrink-0 pt-0.5">
                      <span className="text-xs font-medium leading-tight" style={{ color: MUTED }}>{time}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: tc }} />
                      {idx < arr.length - 1 && <div className="flex-1 w-px my-1" style={{ background: BORDER }} />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm" style={{ color: CHARCOAL }}>{label}</p>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: `${tc}22`, color: tc }}>{tag}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Progress Overview */}
        <Card className="p-6 flex flex-col">
          <SectionTitle>Progress Overview</SectionTitle>
          <div className="space-y-4 mb-6">
            {PROGRESS_ITEMS.map(({ label, pct, color }) => (
              <div key={label}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-medium" style={{ color: CHARCOAL }}>{label}</span>
                  <span className="text-xs font-semibold" style={{ color }}>{pct}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#E8DDD0" }}>
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-auto pt-4" style={{ borderTop: `1px solid ${BORDER}` }}>
            <div className="text-center">
              <CircularProgress pct={overallPct} />
              <p className="text-xs font-medium mt-2" style={{ color: MUTED }}>Overall Progress</p>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Mood Check-in + Focus Mode ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Mood */}
        <Card className="p-6">
          <SectionTitle>How are you feeling today?</SectionTitle>
          <div className="flex gap-2 mb-5">
            {MOODS.map((m, idx) => {
              const val = idx + 1;
              const active = selectedMood === val;
              return (
                <button key={val} onClick={() => setSelectedMood(active ? null : val)}
                  className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all duration-200 hover:scale-105"
                  style={{
                    background: active ? m.color : m.bg,
                    border: `1.5px solid ${active ? m.color : "transparent"}`,
                    boxShadow: active ? `0 4px 12px ${m.color}44` : "none",
                  }}
                >
                  <span className="text-xl font-bold font-serif" style={{ color: active ? "white" : m.color }}>{val}</span>
                  <span className="text-[9px] font-semibold leading-tight text-center" style={{ color: active ? "rgba(255,255,255,.85)" : m.text }}>
                    {m.label}
                  </span>
                </button>
              );
            })}
          </div>
          <button
            onClick={handleLogMood}
            disabled={selectedMood === null || moodMutation.isPending}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
            style={{
              background: selectedMood ? `linear-gradient(135deg, #C8922A 0%, ${GOLD} 100%)` : "#E8DDD0",
              color: selectedMood ? CREAM : MUTED,
              boxShadow: selectedMood ? "0 4px 12px rgba(230,167,86,.30)" : "none",
            }}
          >
            {moodMutation.isPending ? "Logging…" : "Log My Mood"}
          </button>

          {/* Recent mood history */}
          {moods && moods.length > 0 && (
            <div className="mt-5 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: MUTED }}>Recent</p>
              {moods.slice(0, 3).map((m) => {
                const mood = MOODS[m.mood - 1];
                return (
                  <div key={m.id} className="flex items-center justify-between px-3 py-2 rounded-xl"
                    style={{ background: mood?.bg ?? CARD }}>
                    <span className="text-xs" style={{ color: MUTED }}>{format(new Date(m.createdAt), "MMM d")}</span>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: mood?.color ?? GOLD, color: "white" }}>
                      {mood?.label ?? m.mood}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Focus Mode */}
        <Card className="p-6 flex flex-col" style={{
          background: `linear-gradient(145deg, ${SIDEBAR} 0%, #3A2518 100%)`,
          border: "none",
        }}>
          <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
            {/* Minimal gradient circle */}
            <div className="relative w-28 h-28 mb-6">
              <div className="absolute inset-0 rounded-full opacity-20" style={{ background: GOLD }} />
              <div className="absolute inset-3 rounded-full opacity-30" style={{ background: GOLD }} />
              <div className="absolute inset-6 rounded-full flex items-center justify-center" style={{ background: `${GOLD}50` }}>
                <Zap className="w-7 h-7" style={{ color: GOLD }} />
              </div>
            </div>
            <h3 className="font-serif text-xl font-bold mb-2" style={{ color: "#FAF7F2" }}>Focus Mode</h3>
            <p className="text-sm leading-relaxed mb-6" style={{ color: "rgba(250,247,242,.60)" }}>
              Deep work. No distractions.<br />Just you and your goals.
            </p>
            <button
              className="px-7 py-2.5 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02]"
              style={{ background: `linear-gradient(135deg, #C8922A 0%, ${GOLD} 100%)`, color: "#FAF7F2", boxShadow: `0 4px 14px ${GOLD}55` }}
            >
              Start Focus Session
            </button>
          </div>
        </Card>
      </div>

      {/* ── Habits + Weekly Rhythm ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Habits */}
        <Card className="p-6">
          <SectionTitle>Habit Streaks</SectionTitle>
          <div className="space-y-3">
            {HABITS.map(({ icon: Icon, label, streak }) => (
              <div key={label} className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: CREAM }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${GOLD}22` }}>
                  <Icon className="w-4 h-4" style={{ color: GOLD }} />
                </div>
                <span className="flex-1 text-sm font-medium" style={{ color: CHARCOAL }}>{label}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-bold font-serif" style={{ color: streak >= 7 ? OLIVE : streak >= 5 ? GOLD : CHARCOAL }}>
                    {streak}
                  </span>
                  <span className="text-xs" style={{ color: MUTED }}>day{streak !== 1 ? "s" : ""}</span>
                  {streak >= 7 && <span className="text-sm">🔥</span>}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Weekly Rhythm */}
        <Card className="p-6">
          <SectionTitle>Weekly Rhythm</SectionTitle>
          <div className="flex gap-2">
            {DAYS.map((day, idx) => {
              const isToday = idx === new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
              const isSunday = idx === 6;
              const done = DONE_DAYS[idx];
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-[11px] font-semibold" style={{ color: MUTED }}>{day}</span>
                  <div
                    className="w-full aspect-square rounded-xl flex items-center justify-center text-xs font-medium"
                    style={{
                      background: isSunday ? `${SAGE}33` : done ? `${OLIVE}22` : CREAM,
                      border: `1.5px solid ${isSunday ? SAGE : done ? OLIVE : BORDER}`,
                    }}
                  >
                    {isSunday ? (
                      <span className="text-[9px]" style={{ color: OLIVE }}>Free</span>
                    ) : done ? (
                      <CheckCircle2 className="w-4 h-4" style={{ color: OLIVE }} />
                    ) : (
                      <span className="text-[11px]" style={{ color: BORDER }}>—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mini session summary */}
          <div className="mt-6 pt-5" style={{ borderTop: `1px solid ${BORDER}` }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: MUTED }}>Next Session</p>
            {upcomingSessions[0] ? (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: CREAM }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${GOLD}22` }}>
                  <Calendar className="w-4 h-4" style={{ color: GOLD }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: CHARCOAL }}>
                    {upcomingSessions[0].topic || "Counselling Session"}
                  </p>
                  <p className="text-xs" style={{ color: MUTED }}>
                    {format(new Date(upcomingSessions[0].scheduledAt), "MMM d, h:mm a")}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm" style={{ color: MUTED }}>No upcoming sessions.</p>
            )}
          </div>
        </Card>
      </div>

      {/* ── Growth Insights ── */}
      <Card className="p-6">
        <SectionTitle>Growth Insights</SectionTitle>
        <GrowthChart />
      </Card>

      {/* ── Quote card ── */}
      <Card className="p-7 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${CREAM} 0%, #EDE4D8 100%)` }}>
        {/* Decorative gold lines */}
        <svg className="absolute top-4 right-6 opacity-20" width="60" height="50" viewBox="0 0 60 50">
          <path d="M10 40 Q30 5 50 40" stroke={GOLD} strokeWidth="1.5" fill="none" />
          <path d="M5 45 Q25 10 45 45" stroke={GOLD} strokeWidth="1" fill="none" />
          <circle cx="30" cy="10" r="3" fill={GOLD} />
        </svg>
        <p className="font-serif italic text-lg leading-relaxed max-w-lg" style={{ color: SIDEBAR }}>
          "You don't have to do it all today. Just don't stop showing up."
        </p>
        <p className="text-xs mt-3 font-medium" style={{ color: GOLD }}>Daily Affirmation</p>
      </Card>
    </div>
  );
}
