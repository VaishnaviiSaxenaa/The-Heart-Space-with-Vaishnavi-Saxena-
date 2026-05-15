import { useState, useMemo } from "react";
import { useAuth } from "../lib/auth";
import {
  useGetDashboardSummary, useListMoods, useCreateMood, useListSessions,
  getGetDashboardSummaryQueryKey, getListMoodsQueryKey,
} from "../lib/api-client-react";
import { format, subDays } from "date-fns";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Loader2, Calendar, Clock, Zap, CheckCircle2, Droplets, BookOpen, Dumbbell, LeafyGreen, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

/* ─── Brand tokens ───────────────────────── */
const CREAM    = "#FAF7F2";
const CHARCOAL = "#2C1810";
const GOLD     = "#C9A96E";
const CARD     = "#FFFFFF";
const MUTED    = "#8C7B70";
const BORDER   = "#E8DDD0";
const SAGE     = "#A8BFA3";
const OLIVE    = "#6E8B6B";
const ROSE     = "#D4A5A5";
const SIDEBAR  = "#3D2314";

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

/* Tiny inline "Brain" icon since lucide doesn't export as Brain_ */
function Brain_({ className }: { className?: string }) {
  return <BookOpen className={className} />;
}

/* ─── Real analytics from localStorage ───── */
function AnalyticsSection({ userId }: { userId: string }) {
  const data = useMemo(() => {
    try {
      const raw = localStorage.getItem(`hs_daily_${userId}`);
      const all: Record<string, any> = raw ? JSON.parse(raw) : {};
      return Array.from({ length: 7 }, (_, i) => {
        const d   = subDays(new Date(), 6 - i);
        const key = d.toISOString().split("T")[0];
        const e   = all[key];
        return {
          day:   format(d, "EEE"),
          mood:  e?.mood   ?? null,
          study: e?.studyHours ?? null,
        };
      });
    } catch { return []; }
  }, [userId]);

  const hasData = data.some((d) => d.mood !== null || d.study !== null);

  if (!hasData) {
    return (
      <div className="text-center py-10 rounded-2xl"
        style={{ background: CREAM, border: `1.5px dashed ${BORDER}` }}>
        <p className="text-sm font-medium" style={{ color: CHARCOAL }}>No daily entries yet</p>
        <p className="text-xs mt-1" style={{ color: MUTED }}>
          Start logging in <strong>Daily Tracker</strong> to see your mood and study trends here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: MUTED }}>Mood Trend — last 7 days</p>
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={data} margin={{ top: 5, right: 8, left: -24, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: MUTED }} />
            <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 10, fill: MUTED }} />
            <Tooltip
              formatter={(val: any) => [val !== null ? `${val}/5` : "–", "Mood"]}
              contentStyle={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 11 }} />
            <Line type="monotone" dataKey="mood" stroke={GOLD} strokeWidth={2.5}
              dot={{ fill: GOLD, r: 4 }} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: MUTED }}>Study Hours — last 7 days</p>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={data} margin={{ top: 5, right: 8, left: -24, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: MUTED }} />
            <YAxis tick={{ fontSize: 10, fill: MUTED }} />
            <Tooltip
              formatter={(val: any) => [val !== null ? `${val}h` : "–", "Study"]}
              contentStyle={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 11 }} />
            <Bar dataKey="study" fill={OLIVE} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
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

/* ─── Today's Plan ───────────────────────── */
type PlanCategory = "Study" | "Revision" | "Practice" | "Physical" | "Personal";

interface PlanTask {
  id: string;
  name: string;
  category: PlanCategory;
  done: boolean;
}

const CATEGORIES: PlanCategory[] = ["Study", "Revision", "Practice", "Physical", "Personal"];

const CAT_COLORS: Record<PlanCategory, { bg: string; text: string; active: string }> = {
  Study:    { bg: `${OLIVE}22`,      text: OLIVE,    active: OLIVE    },
  Revision: { bg: `${GOLD}22`,       text: "#9A6010", active: "#9A6010" },
  Practice: { bg: `${ROSE}22`,       text: "#A05050", active: "#A05050" },
  Physical: { bg: `${SAGE}22`,       text: "#3A6A38", active: "#3A6A38" },
  Personal: { bg: "rgba(61,53,48,.08)", text: MUTED,  active: MUTED   },
};

const PLAN_KEY = "heartspace_today_plan";

function todayDate() {
  return new Date().toISOString().split("T")[0];
}

function loadPlanTasks(): PlanTask[] {
  try {
    const raw = localStorage.getItem(PLAN_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (parsed.date !== todayDate()) return [];
    return parsed.tasks ?? [];
  } catch {
    return [];
  }
}

function savePlanTasks(tasks: PlanTask[]) {
  localStorage.setItem(PLAN_KEY, JSON.stringify({ date: todayDate(), tasks }));
}

function TodaysPlan() {
  const [tasks, setTasks] = useState<PlanTask[]>(() => loadPlanTasks());
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCat, setNewCat] = useState<PlanCategory>("Study");

  const persist = (next: PlanTask[]) => { setTasks(next); savePlanTasks(next); };

  const addTask = () => {
    const name = newName.trim();
    if (!name) return;
    persist([...tasks, { id: `${Date.now()}`, name, category: newCat, done: false }]);
    setNewName("");
    setNewCat("Study");
    setAdding(false);
  };

  const toggleDone = (id: string) =>
    persist(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  const deleteTask = (id: string) =>
    persist(tasks.filter((t) => t.id !== id));

  const doneCount = tasks.filter((t) => t.done).length;

  return (
    <Card className="lg:col-span-2 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-serif text-lg font-semibold" style={{ color: CHARCOAL }}>
          Today's Plan
          {tasks.length > 0 && (
            <span className="ml-2 text-sm font-sans font-normal" style={{ color: MUTED }}>
              {doneCount}/{tasks.length} done
            </span>
          )}
        </h2>
        {tasks.length > 0 && (
          <button
            onClick={() => { setAdding(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:scale-[1.03] active:scale-[0.98]"
            style={{
              background: `linear-gradient(135deg, #C8922A 0%, ${GOLD} 100%)`,
              color: CREAM,
              boxShadow: "0 3px 10px rgba(230,167,86,.30)",
            }}
          >
            <Plus className="w-3.5 h-3.5" /> Add Task
          </button>
        )}
      </div>

      {/* Add-task form */}
      {adding && (
        <div
          className="mb-4 p-4 rounded-2xl space-y-3"
          style={{ background: CREAM, border: `1px solid ${BORDER}` }}
        >
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addTask();
              if (e.key === "Escape") { setAdding(false); setNewName(""); }
            }}
            placeholder="What do you want to get done today?"
            className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-sm"
            style={{ color: CHARCOAL }}
          />
          {/* Category pills */}
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setNewCat(cat)}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full transition-all duration-150"
                style={
                  newCat === cat
                    ? { background: SIDEBAR, color: CREAM }
                    : { background: CAT_COLORS[cat].bg, color: CAT_COLORS[cat].text }
                }
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="flex gap-2 pt-0.5">
            <button
              onClick={addTask}
              className="px-4 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
              style={{ background: `${GOLD}28`, color: "#9A6010" }}
            >
              Add
            </button>
            <button
              onClick={() => { setAdding(false); setNewName(""); }}
              className="px-4 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
              style={{ background: `${BORDER}88`, color: MUTED }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {tasks.length === 0 && !adding && (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: `${GOLD}15`, border: `1.5px dashed ${GOLD}55` }}
          >
            <Plus className="w-7 h-7" style={{ color: GOLD }} />
          </div>
          <p className="text-sm font-semibold mb-1" style={{ color: CHARCOAL }}>No tasks yet</p>
          <p className="text-xs mb-6" style={{ color: MUTED }}>Add your first task for today!</p>
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: `linear-gradient(135deg, #C8922A 0%, ${GOLD} 100%)`,
              color: CREAM,
              boxShadow: "0 4px 14px rgba(230,167,86,.35)",
            }}
          >
            <Plus className="w-4 h-4" /> Add Task
          </button>
        </div>
      )}

      {/* Task list */}
      {tasks.length > 0 && (
        <div className="space-y-2">
          {tasks.map((task) => {
            const cc = CAT_COLORS[task.category];
            return (
              <div
                key={task.id}
                className="flex items-center gap-3 px-4 py-3 rounded-xl group transition-all duration-200"
                style={{
                  background: task.done ? `${OLIVE}0C` : CREAM,
                  border: `1px solid ${task.done ? OLIVE + "35" : BORDER}`,
                }}
              >
                {/* Animated checkbox */}
                <button
                  onClick={() => toggleDone(task.id)}
                  className="flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200"
                  style={{
                    borderColor: task.done ? OLIVE : "#C5B8AC",
                    background: task.done ? OLIVE : "transparent",
                    transform: task.done ? "scale(1.08)" : "scale(1)",
                    boxShadow: task.done ? `0 0 0 3px ${OLIVE}22` : "none",
                  }}
                >
                  {task.done && (
                    <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                      <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>

                {/* Task name */}
                <span
                  className="flex-1 text-sm font-medium transition-all duration-200"
                  style={{
                    color: task.done ? MUTED : CHARCOAL,
                    textDecoration: task.done ? "line-through" : "none",
                    textDecorationColor: MUTED,
                  }}
                >
                  {task.name}
                </span>

                {/* Category badge */}
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: cc.bg, color: cc.text }}
                >
                  {task.category}
                </span>

                {/* Delete (visible on hover) */}
                <button
                  onClick={() => deleteTask(task.id)}
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 p-1 rounded-lg"
                  style={{ color: "#B03030" }}
                  title="Delete task"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </Card>
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
        {/* Today's Plan — editable, saved in localStorage */}
        <TodaysPlan />

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

      {/* ── Analytics ── */}
      <Card className="p-6">
        <SectionTitle>Your Analytics</SectionTitle>
        <AnalyticsSection userId={String(user?.id ?? "guest")} />
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
