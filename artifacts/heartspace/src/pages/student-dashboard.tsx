import { useState, useMemo, Component, ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import {
  useGetDashboardSummary,
  useListMoods,
  useCreateMood,
  useListSessions,
  getGetDashboardSummaryQueryKey,
  getListMoodsQueryKey,
} from "../lib/api-client-react";
import { format, subDays } from "date-fns";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Calendar, LeafyGreen, Plus, Trash2 } from "lucide-react";
import DashboardCalendar from "./dashboard-calendar";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

/* ─── Brand tokens ───────────────────────── */
const CREAM = "#F8F5F0";
const CHARCOAL = "#2D2A25";
const GOLD = "#C9A84C";
const PROGRESS_PURPLE = "#6B568F";
const STUDY_BLUE = "#2C4A73";
const REVISION_ORANGE = "#E07A28";
const PRACTICE_YELLOW = "#E0B428";
const CARD = "#FFFDF9";
const MUTED = "#7A7267";
const BORDER = "#E5DDD0";
const SAGE = "#A8BFA3";
const OLIVE = "#6E8B6B";
const ROSE = "#D4A5A5";
const SIDEBAR = "#3D2314";

/* Mood palette */
const MOODS = [
  { label: "Struggling", color: "#C4785A", bg: "#F4E4DC", text: "#7A3A22" },
  { label: "Low", color: "#C9A05A", bg: "#F5EDD8", text: "#7A5520" },
  { label: "Okay", color: "#B5A060", bg: "#F0E8CC", text: "#605020" },
  { label: "Good", color: SAGE, bg: "#E8F0E6", text: "#3A5A30" },
  { label: "Great", color: OLIVE, bg: "#DFF0DA", text: "#2A5020" },
];

function safeFormat(
  input: string | null | undefined,
  fmt: string,
  fallback = "—",
): string {
  try {
    if (!input) return fallback;
    const d = new Date(input);
    if (isNaN(d.getTime())) return fallback;
    return format(d, fmt);
  } catch {
    return fallback;
  }
}

class SectionBoundary extends Component<
  { label: string; children: ReactNode },
  { crashed: boolean }
> {
  constructor(props: { label: string; children: ReactNode }) {
    super(props);
    this.state = { crashed: false };
  }
  static getDerivedStateFromError() {
    return { crashed: true };
  }
  componentDidCatch(err: unknown) {
    console.error(`[${this.props.label}] crashed:`, err);
  }
  render() {
    if (this.state.crashed) {
      return (
        <div
          className="rounded-2xl p-6 text-center"
          style={{ background: "#FAF7F2", border: "1.5px dashed #E8DDD0" }}
        >
          <p className="text-sm" style={{ color: "#8C7B70" }}>
            {this.props.label} is temporarily unavailable.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

function AnalyticsSection({ userId }: { userId: string }) {
  const data = useMemo(() => {
    try {
      const raw = localStorage.getItem(`hs_daily_${userId}`);
      const all: Record<string, any> = raw ? JSON.parse(raw) : {};
      return Array.from({ length: 7 }, (_, i) => {
        const d = subDays(new Date(), 6 - i);
        const key = d.toISOString().split("T")[0];
        const e = all[key];
        return {
          day: format(d, "EEE"),
          mood: e?.mood ?? null,
          study: e?.studyHours ?? null,
        };
      });
    } catch {
      return [];
    }
  }, [userId]);

  const hasData = data.some((d) => d.mood !== null || d.study !== null);

  if (!hasData) {
    return (
      <div
        className="text-center py-10 rounded-2xl"
        style={{ background: CREAM, border: `1.5px dashed ${BORDER}` }}
      >
        <p className="text-sm font-medium" style={{ color: CHARCOAL }}>
          No daily entries yet
        </p>
        <p className="text-xs mt-1" style={{ color: MUTED }}>
          Start logging in <strong>Daily Tracker</strong> to see your mood and
          study trends here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <p
          className="text-xs font-semibold uppercase tracking-wide mb-3"
          style={{ color: MUTED }}
        >
          Mood Trend — last 7 days
        </p>
        <ResponsiveContainer width="100%" height={150}>
          <LineChart
            data={data}
            margin={{ top: 5, right: 8, left: -24, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: MUTED }} />
            <YAxis
              domain={[1, 5]}
              ticks={[1, 2, 3, 4, 5]}
              tick={{ fontSize: 10, fill: MUTED }}
            />
            <Tooltip
              formatter={(val: any) => [
                val !== null ? `${val}/5` : "–",
                "Mood",
              ]}
              contentStyle={{
                background: "#fff",
                border: `1px solid ${BORDER}`,
                borderRadius: 10,
                fontSize: 11,
              }}
            />
            <Line
              type="monotone"
              dataKey="mood"
              stroke={PROGRESS_PURPLE}
              strokeWidth={2.5}
              dot={{ fill: PROGRESS_PURPLE, r: 4 }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div>
        <p
          className="text-xs font-semibold uppercase tracking-wide mb-3"
          style={{ color: MUTED }}
        >
          Study Hours — last 7 days
        </p>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart
            data={data}
            margin={{ top: 5, right: 8, left: -24, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: MUTED }} />
            <YAxis tick={{ fontSize: 10, fill: MUTED }} />
            <Tooltip
              formatter={(val: any) => [
                val !== null ? `${val}h` : "–",
                "Study",
              ]}
              contentStyle={{
                background: "#fff",
                border: `1px solid ${BORDER}`,
                borderRadius: 10,
                fontSize: 11,
              }}
            />
            <Bar dataKey="study" fill={OLIVE} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Card({
  children,
  className = "",
  style = {},
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{
        background: CARD,
        border: `1px solid ${BORDER}`,
        boxShadow: "0 2px 8px rgba(61,53,48,.06)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="font-serif text-lg font-semibold mb-4"
      style={{ color: CHARCOAL }}
    >
      {children}
    </h2>
  );
}

type PlanCategory = "Study" | "Revision" | "Practice" | "Physical" | "Personal";
interface PlanTask {
  id: string;
  name: string;
  category: PlanCategory;
  done: boolean;
}
const CATEGORIES: PlanCategory[] = [
  "Study",
  "Revision",
  "Practice",
  "Physical",
  "Personal",
];
const CAT_COLORS: Record<
  PlanCategory,
  { bg: string; text: string; active: string }
> = {
  Study: { bg: `${STUDY_BLUE}1A`, text: STUDY_BLUE, active: STUDY_BLUE },
  Revision: { bg: `${REVISION_ORANGE}1A`, text: REVISION_ORANGE, active: REVISION_ORANGE },
  Practice: { bg: `${PRACTICE_YELLOW}1A`, text: "#9C7E10", active: "#9C7E10" },
  Physical: { bg: `${SAGE}22`, text: "#3A6A38", active: "#3A6A38" },
  Personal: { bg: "rgba(61,53,48,.08)", text: MUTED, active: MUTED },
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

  const persist = (next: PlanTask[]) => {
    setTasks(next);
    savePlanTasks(next);
  };
  const addTask = () => {
    const name = newName.trim();
    if (!name) return;
    persist([
      ...tasks,
      { id: `${Date.now()}`, name, category: newCat, done: false },
    ]);
    setNewName("");
    setNewCat("Study");
    setAdding(false);
  };
  const toggleDone = (id: string) =>
    persist(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const deleteTask = (id: string) => persist(tasks.filter((t) => t.id !== id));
  const doneCount = tasks.filter((t) => t.done).length;

  return (
    <Card className="lg:col-span-2 p-6">
      <div className="flex items-center justify-between mb-5">
        <h2
          className="font-serif text-lg font-semibold"
          style={{ color: CHARCOAL }}
        >
          Today's Plan
          {tasks.length > 0 && (
            <span
              className="ml-2 text-sm font-sans font-normal"
              style={{ color: MUTED }}
            >
              {doneCount}/{tasks.length} done
            </span>
          )}
        </h2>
        {tasks.length > 0 && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:scale-[1.03] active:scale-[0.98]"
            style={{
              background: `linear-gradient(135deg, #C8922A 0%, ${PROGRESS_PURPLE} 100%)`,
              color: CREAM,
              boxShadow: "0 3px 10px rgba(230,167,86,.30)",
            }}
          >
            <Plus className="w-3.5 h-3.5" /> Add Task
          </button>
        )}
      </div>

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
              if (e.key === "Escape") {
                setAdding(false);
                setNewName("");
              }
            }}
            placeholder="What do you want to get done today?"
            className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-sm"
            style={{ color: CHARCOAL }}
          />
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
                    : {
                        background: CAT_COLORS[cat].bg,
                        color: CAT_COLORS[cat].text,
                      }
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
              style={{ background: `${PROGRESS_PURPLE}28`, color: "#9A6010" }}
            >
              Add
            </button>
            <button
              onClick={() => {
                setAdding(false);
                setNewName("");
              }}
              className="px-4 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
              style={{ background: `${BORDER}88`, color: MUTED }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {tasks.length === 0 && !adding && (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{
              background: `${PROGRESS_PURPLE}15`,
              border: `1.5px dashed ${PROGRESS_PURPLE}55`,
            }}
          >
            <Plus className="w-7 h-7" style={{ color: PROGRESS_PURPLE }} />
          </div>
          <p className="text-sm font-semibold mb-1" style={{ color: CHARCOAL }}>
            No tasks yet
          </p>
          <p className="text-xs mb-6" style={{ color: MUTED }}>
            Add your first task for today!
          </p>
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: `linear-gradient(135deg, #C8922A 0%, ${PROGRESS_PURPLE} 100%)`,
              color: CREAM,
              boxShadow: "0 4px 14px rgba(230,167,86,.35)",
            }}
          >
            <Plus className="w-4 h-4" /> Add Task
          </button>
        </div>
      )}

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
                      <path
                        d="M1 3.5L3.5 6L8 1"
                        stroke="white"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
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
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: cc.bg, color: cc.text }}
                >
                  {task.category}
                </span>
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

export default function StudentDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedMood, setSelectedMood] = useState<number | null>(null);

  const { data: summary } = useGetDashboardSummary(
    { studentId: user?.id },
    { query: { enabled: !!user?.id } },
  );
  const { data: moods } = useListMoods(
    { studentId: user?.id, limit: 5 },
    { query: { enabled: !!user?.id } },
  );
  const { data: sessions } = useListSessions(
    { studentId: user?.id },
    { query: { enabled: !!user?.id } },
  );

  /* Load Sagar Sir sessions from Supabase */
  const [sagarSessions, setSagarSessions] = useState<Array<Record<string,unknown>>>([]);
  const [vaishnaviSession, setVaishnaviSession] = useState<{id:string,scheduled_at:string,note?:string}|null>(null);
  const [allVaishnaviSessions, setAllVaishnaviSessions] = useState<Array<{id:string,scheduled_at:string,note?:string,rescheduled_at?:string}>>([]);
  const [showSessionPopup, setShowSessionPopup] = useState(false);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  useEffect(() => {
    if (!user?.id) return;
    supabase.from("sessions_data").select("data").eq("user_id", user.id).single()
      .then(({ data: sd }) => {
        if (sd?.data) setSagarSessions(sd.data as Array<Record<string,unknown>>);
      });
    supabase.from("vaishnavi_sessions").select("*").eq("student_id", user.id).eq("status", "upcoming").order("scheduled_at", { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setVaishnaviSession(data[0] as any);
          setAllVaishnaviSessions(data as any);
          // Show popup if any session was rescheduled
          if (data.some((s: any) => s.rescheduled_at && !s.student_response)) setShowSessionPopup(true);
        }
      });
    supabase.from("vaishnavi_sessions").select("*").eq("student_id", user.id).eq("status", "upcoming").order("scheduled_at", { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setVaishnaviSession(data[0] as any);
          setAllVaishnaviSessions(data as any);
          // Show popup if any session was rescheduled
          if (data.some((s: any) => s.rescheduled_at && !s.student_response)) setShowSessionPopup(true);
        }
      });
  }, [user?.id]);
  const approvedSession = sagarSessions.find(s => s.status === "approved");
  const doneCount = sagarSessions.filter(s => s.status === "done").length;

  const moodMutation = useCreateMood({
    mutation: {
      onSuccess: () => {
        toast({
          title: "Mood logged ✨",
          description: "Thank you for checking in.",
        });
        qc.invalidateQueries({
          queryKey: getListMoodsQueryKey({ studentId: user?.id, limit: 5 }),
        });
        qc.invalidateQueries({
          queryKey: getGetDashboardSummaryQueryKey({ studentId: user?.id }),
        });
      },
    },
  });

  const handleLogMood = () => {
    if (selectedMood === null || !user?.id) return;
    moodMutation.mutate({ data: { studentId: user.id, mood: selectedMood } });
    setSelectedMood(null);
  };

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = user?.name?.split(" ")[0] ?? "there";
  const space = (user as any)?.space as string | null;
  const examType = (user as any)?.exam_type as string | null;

  const ROADMAP_SUBJECTS_JAM_DASH = [
    { id: "la", name: "Linear Algebra", totalHours: 60 },
    { id: "ra", name: "Real Analysis", totalHours: 60 },
    { id: "dc", name: "Functions of One Variable", totalHours: 50 },
    { id: "gt", name: "Group Theory", totalHours: 50 },
    { id: "ode", name: "ODE", totalHours: 40 },
    { id: "mvc", name: "Functions of Two Variables", totalHours: 25 },
    { id: "mi", name: "Multiple Integration", totalHours: 30 },
  ];
  const ROADMAP_SUBJECTS_NET_DASH = [
    { id: "ra", name: "Real Analysis", totalHours: 60 },
    { id: "la", name: "Linear Algebra", totalHours: 60 },
    { id: "ca", name: "Complex Analysis", totalHours: 50 },
    { id: "ma", name: "Modern Algebra (Group + Ring + Field)", totalHours: 90 },
    { id: "tp", name: "Topology", totalHours: 40 },
    { id: "fa", name: "Functional Analysis", totalHours: 40 },
    { id: "ode", name: "ODE", totalHours: 40 },
    { id: "pde", name: "PDE", totalHours: 40 },
    { id: "na", name: "Numerical Analysis", totalHours: 30 },
    { id: "ie", name: "Integral Equations", totalHours: 30 },
    { id: "cv", name: "Calculus of Variations", totalHours: 30 },
  ];
  const dashRoadmapSubjects = examType === "NET_GATE" ? ROADMAP_SUBJECTS_NET_DASH : ROADMAP_SUBJECTS_JAM_DASH;
  const dashStudySubjects = dashRoadmapSubjects.map((s) => ({ id: s.id, name: s.name, totalHours: s.totalHours }));
  const dashRevisionSubjects = dashRoadmapSubjects.map((s) => ({ id: s.id, name: s.name, totalHours: Math.round(s.totalHours * 0.4 * 10) / 10 }));
  const dashPracticeSubjects = dashRoadmapSubjects.map((s) => ({ id: s.id, name: s.name, totalHours: Math.round(s.totalHours * 0.7 * 10) / 10 }));

  const SERVICE: Record<
    string,
    { name: string; emoji: string; color: string; sub: string }
  > = {
    zenith: {
      name: "Zenith",
      emoji: "🏆",
      color: "#C9A96E",
      sub: "Full mentorship + counsellor support",
    },
    apex: {
      name: "Apex+",
      emoji: "⚡",
      color: "#3D2314",
      sub: "Academic tracking + AI guidance",
    },
    heartspace: {
      name: "HeartSpace",
      emoji: "🌿",
      color: "#D4A5A5",
      sub: "Personal counselling + emotional support",
    },
  };
  const svc = space ? SERVICE[space] : null;

  const EXAM_LABEL: Record<string, { label: string; emoji: string }> = {
    JAM: { label: "IIT JAM", emoji: "🎓" },
    NET_GATE: { label: "CSIR NET / GATE", emoji: "🔬" },
  };
  const exam = examType ? EXAM_LABEL[examType] : null;

  const sessionList = Array.isArray(sessions) ? sessions : [];
  const upcomingSessions = sessionList
    .filter((s: any) => s.status === "scheduled")
    .slice(0, 5);

  return (
    <div className="space-y-7 animate-in fade-in duration-500">
      {/* ── Greeting ── */}
      <div>
        {(svc || exam) && (
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {svc && (
              <>
                <span className="text-base">{svc.emoji}</span>
                <span
                  className="text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide"
                  style={{ background: `${svc.color}20`, color: svc.color }}
                >
                  {svc.name}
                </span>
              </>
            )}
            {exam && (
              <span
                className="text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wide"
                style={{
                  background: "rgba(61,35,20,0.08)",
                  color: SIDEBAR,
                  border: `1px solid ${BORDER}`,
                }}
              >
                {exam.emoji} {exam.label}
              </span>
            )}
          </div>
        )}
        <h1
          className="text-3xl md:text-4xl font-serif font-bold"
          style={{ color: CHARCOAL }}
        >
          {greeting}, {firstName} ✨
        </h1>
        <p className="mt-1.5 text-sm" style={{ color: MUTED }}>
          {svc
            ? svc.sub
            : "You're building your dream life, one intentional day at a time."}
        </p>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total Sessions",
            value: summary?.totalSessions ?? 0,
            sub: "all time",
            color: SIDEBAR,
          },
          {
            label: "Upcoming",
            value: summary?.upcomingSessions ?? 0,
            sub: "scheduled",
            color: PROGRESS_PURPLE,
          },
          {
            label: "Completed",
            value: summary?.completedSessions ?? 0,
            sub: "sessions",
            color: OLIVE,
          },
          {
            label: "Avg Mood",
            value: summary?.averageMood
              ? `${summary.averageMood.toFixed(1)}/5`
              : "—",
            sub: "this month",
            color: ROSE,
          },
        ].map(({ label, value, sub, color }) => (
          <Card key={label} className="p-5">
            <div
              className="text-2xl md:text-3xl font-serif font-bold mb-1"
              style={{ color }}
            >
              {value}
            </div>
            <div className="text-xs font-semibold" style={{ color: CHARCOAL }}>
              {label}
            </div>
            <div className="text-xs" style={{ color: MUTED }}>
              {sub}
            </div>
          </Card>
        ))}
      </div>

      {/* ── Combined Calendar ── */}
      {user?.id && (
        <Card className="p-6" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <DashboardCalendar
            uid={String(user.id)}
            studySubjects={dashStudySubjects}
            revisionSubjects={dashRevisionSubjects}
            practiceSubjects={dashPracticeSubjects}
          />
        </Card>
      )}

      {/* ── Today's Plan + Next Session ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TodaysPlan />
        <Card className="p-6 flex flex-col">
          <SectionTitle>Upcoming Session</SectionTitle>
          {/* Reschedule popup */}
          {showSessionPopup && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
              <div style={{ background: "#FAF7F2", borderRadius: 20, padding: "2rem", maxWidth: 380, width: "90vw", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
                <div style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>📅</div>
                <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#3D2314", margin: "0 0 0.75rem" }}>Your session has been rescheduled!</h2>
                <p style={{ fontSize: "0.9rem", color: "#8C7B70", margin: "0 0 1.5rem", lineHeight: 1.5 }}>
                  Vaishnavi Ma'am has updated your session timing. Please review and accept or cancel your session.
                </p>
                <button onClick={() => { setShowSessionPopup(false); setLocation("/my-sessions"); }} style={{ width: "100%", background: "#C9A96E", color: "#fff", border: "none", borderRadius: 10, padding: "0.75rem", fontWeight: 600, fontSize: "0.95rem", cursor: "pointer" }}>View My Sessions</button>
              </div>
            </div>
          )}
          {allVaishnaviSessions.length > 0 ? (
            <div className="space-y-3">
              {(showAllUpcoming ? allVaishnaviSessions : allVaishnaviSessions.slice(0, 1)).map((s, i) => (
                <div key={s.id} className="p-4 rounded-2xl" style={{ background: "#C9A96E11", border: "1.5px solid #C9A96E44" }}>
                  <p className="text-xs font-bold mb-1" style={{ color: "#C9A96E" }}>📅 Session with Vaishnavi Ma'am</p>
                  <p className="text-sm font-medium" style={{ color: "#2C1810" }}>
                    {new Date(s.scheduled_at).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "#8C7B70" }}>
                    🕐 {new Date(s.scheduled_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  {s.note && <p className="text-xs mt-1" style={{ color: "#8C7B70" }}>📝 {s.note}</p>}
                </div>
              ))}
              {allVaishnaviSessions.length > 1 && (
                <button onClick={() => setShowAllUpcoming(p => !p)}
                  style={{ width: "100%", background: "none", border: "1px solid #E8DDD0", borderRadius: 8, padding: "0.35rem", fontSize: "0.8rem", color: "#8C7B70", cursor: "pointer", fontWeight: 600 }}>
                  {showAllUpcoming ? "Show less ↑" : `Show all ${allVaishnaviSessions.length} sessions ↓`}
                </button>
              )}
              <p className="text-xs italic" style={{ color: "#8C7B70", lineHeight: 1.5 }}>
                If you are unavailable at your allotted session time without prior notice to Vaishnavi Ma'am, your session will be conducted in the next session cycle.
              </p>
            </div>
          ) : approvedSession ? (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl" style={{ background: "#6E8B6B11", border: "1.5px solid #6E8B6B44" }}>
                <p className="text-xs font-bold mb-1" style={{ color: "#6E8B6B" }}>✅ Session Approved — Sagar Sir</p>
                <p className="text-sm font-medium" style={{ color: "#2C1810" }}>
                  {approvedSession.callMessage as string || approvedSession.scheduledDate as string}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
              <div className="text-3xl mb-2">📅</div>
              <p className="text-sm font-medium" style={{ color: "#2C1810" }}>No upcoming sessions</p>
              <p className="text-xs mt-1" style={{ color: "#8C7B70" }}>Your next session will be scheduled by Vaishnavi Ma'am</p>
            </div>
          )}
        </Card>
      </div>

      {/* ── Mood Check-in ── */}
      <Card className="p-6">
        <SectionTitle>How are you feeling today?</SectionTitle>
        <div className="flex gap-2 mb-5">
          {MOODS.map((m, idx) => {
            const val = idx + 1;
            const active = selectedMood === val;
            return (
              <button
                key={val}
                onClick={() => setSelectedMood(active ? null : val)}
                className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all duration-200 hover:scale-105"
                style={{
                  background: active ? m.color : m.bg,
                  border: `1.5px solid ${active ? m.color : "transparent"}`,
                  boxShadow: active ? `0 4px 12px ${m.color}44` : "none",
                }}
              >
                <span
                  className="text-xl font-bold font-serif"
                  style={{ color: active ? "white" : m.color }}
                >
                  {val}
                </span>
                <span
                  className="text-[9px] font-semibold leading-tight text-center"
                  style={{ color: active ? "rgba(255,255,255,.85)" : m.text }}
                >
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
            background: selectedMood
              ? `linear-gradient(135deg, #C8922A 0%, ${PROGRESS_PURPLE} 100%)`
              : "#E8DDD0",
            color: selectedMood ? CREAM : MUTED,
            boxShadow: selectedMood
              ? "0 4px 12px rgba(230,167,86,.30)"
              : "none",
          }}
        >
          {moodMutation.isPending ? "Logging…" : "Log My Mood"}
        </button>
        {Array.isArray(moods) && moods.length > 0 && (
          <div className="mt-5 space-y-2">
            <p
              className="text-xs font-semibold uppercase tracking-wide mb-2"
              style={{ color: MUTED }}
            >
              Recent
            </p>
            {moods.slice(0, 3).map((m: any) => {
              const mood = MOODS[m.mood - 1];
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between px-3 py-2 rounded-xl"
                  style={{ background: mood?.bg ?? CARD }}
                >
                  <span className="text-xs" style={{ color: MUTED }}>
                    {safeFormat(m.createdAt, "MMM d")}
                  </span>
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: mood?.color ?? PROGRESS_PURPLE, color: "white" }}
                  >
                    {mood?.label ?? m.mood}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ── Wellbeing prompts ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <SectionTitle>Reports Summary</SectionTitle>
          {(() => {
            try {
              const uid = String(user?.id ?? "");
              const cal = JSON.parse(localStorage.getItem(`hs_calendar_${uid}`) ?? "{}");
              const speedMap = JSON.parse(localStorage.getItem(`hs_topic_speed_${uid}`) ?? "{}");
              const SPEED_LABELS: Record<string, string> = {
                gentle: "🐢 Gentle", steady: "🌿 Steady", standard: "⚖️ Standard",
                accelerated: "⚡ Accelerated", rapid: "🚀 Rapid",
              };
              const consumed: Record<string, number> = {};
              Object.values(cal).forEach((entries: any) =>
                entries.forEach((e: any) => {
                  consumed[e.subjectId] = (consumed[e.subjectId] ?? 0) + e.hours;
                })
              );
              const totalScheduled = Object.values(consumed).reduce((a: number, b: any) => a + b, 0);
              const totalHours = dashStudySubjects.reduce((a, s) => a + s.totalHours, 0);
              const pct = totalHours > 0 ? Math.round((totalScheduled / totalHours) * 100) : 0;
              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: CREAM }}>
                    <span className="text-xs font-semibold" style={{ color: CHARCOAL }}>📅 Calendar Coverage</span>
                    <span className="text-xs font-bold" style={{ color: PROGRESS_PURPLE }}>{totalScheduled}h / {totalHours}h ({pct}%)</span>
                  </div>
                  <div className="space-y-2">
                    {dashStudySubjects.map((s) => {
                      const done = consumed[s.id] ?? 0;
                      const p = s.totalHours > 0 ? Math.round((done / s.totalHours) * 100) : 0;
                      const speed = SPEED_LABELS[speedMap[s.id]] ?? "⚖️ Standard";
                      return (
                        <div key={s.id} className="p-2.5 rounded-xl" style={{ background: CREAM, border: `1px solid ${BORDER}` }}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold" style={{ color: CHARCOAL }}>{s.name}</span>
                            <span className="text-[10px]" style={{ color: MUTED }}>{speed}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full" style={{ background: BORDER }}>
                              <div className="h-full rounded-full" style={{ width: `${Math.min(p, 100)}%`, background: p >= 100 ? OLIVE : PROGRESS_PURPLE }} />
                            </div>
                            <span className="text-[10px] font-bold" style={{ color: p >= 100 ? OLIVE : PROGRESS_PURPLE }}>{done}h/{s.totalHours}h</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            } catch {
              return <p className="text-xs" style={{ color: MUTED }}>No data yet. Start from My Roadmap.</p>;
            }
          })()}
        </Card>

        <Card className="p-6">
          <SectionTitle>Weekly Rhythm</SectionTitle>
          <div className="flex gap-2 mb-4">
            {["M", "T", "W", "T", "F", "S", "S"].map((day, idx) => {
              const todayIdx = (new Date().getDay() + 6) % 7;
              const isToday = idx === todayIdx;
              return (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center gap-2"
                >
                  <span
                    className="text-[11px] font-semibold"
                    style={{ color: isToday ? PROGRESS_PURPLE : MUTED }}
                  >
                    {day}
                  </span>
                  <div
                    className="w-full aspect-square rounded-xl flex items-center justify-center"
                    style={{
                      background: isToday ? `${PROGRESS_PURPLE}22` : CREAM,
                      border: `1.5px solid ${isToday ? PROGRESS_PURPLE : BORDER}`,
                    }}
                  >
                    <span
                      className="text-[10px]"
                      style={{ color: isToday ? PROGRESS_PURPLE : BORDER }}
                    >
                      {isToday ? "today" : "—"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-center" style={{ color: MUTED }}>
            Daily Tracker entries will appear here week by week.
          </p>
        </Card>
      </div>

      {/* ── Analytics ── */}
      <Card className="p-6">
        <SectionTitle>Your Analytics</SectionTitle>
        <AnalyticsSection userId={String(user?.id ?? "guest")} />
      </Card>

      {/* ── Quote card ── */}
      <Card
        className="p-7 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${CREAM} 0%, #EDE4D8 100%)`,
        }}
      >
        <svg
          className="absolute top-4 right-6 opacity-20"
          width="60"
          height="50"
          viewBox="0 0 60 50"
        >
          <path
            d="M10 40 Q30 5 50 40"
            stroke={PROGRESS_PURPLE}
            strokeWidth="1.5"
            fill="none"
          />
          <path
            d="M5 45 Q25 10 45 45"
            stroke={PROGRESS_PURPLE}
            strokeWidth="1"
            fill="none"
          />
          <circle cx="30" cy="10" r="3" fill={PROGRESS_PURPLE} />
        </svg>
        <p
          className="font-serif italic text-lg leading-relaxed max-w-lg"
          style={{ color: SIDEBAR }}
        >
          "You don't have to do it all today. Just don't stop showing up."
        </p>
        <p className="text-xs mt-3 font-medium" style={{ color: PROGRESS_PURPLE }}>
          Daily Affirmation
        </p>
      </Card>
    </div>
  );
}
