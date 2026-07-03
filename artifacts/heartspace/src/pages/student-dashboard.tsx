import { useState, useMemo, Component, ReactNode, useEffect, useRef } from "react";
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
import { SYLLABUS, loadSyllabusProgress } from "./syllabus";
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
function loadPlanTasks(uid: string): PlanTask[] {
  try {
    const raw = localStorage.getItem(PLAN_KEY(uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (parsed.date !== todayDate()) return [];
    return parsed.tasks ?? [];
  } catch {
    return [];
  }
}
function savePlanTasks(uid: string, tasks: PlanTask[]) {
  localStorage.setItem(PLAN_KEY(uid), JSON.stringify({ date: todayDate(), tasks }));
}

function TodaysOverview({ uid, studySubjects, revisionSubjects, practiceSubjects }: {
  uid: string;
  studySubjects: Array<{id: string; name: string}>;
  revisionSubjects: Array<{id: string; name: string}>;
  practiceSubjects: Array<{id: string; name: string}>;
}) {
  const [tasks, setTasks] = useState<PlanTask[]>(() => loadPlanTasks(uid));
  const persist = (next: PlanTask[]) => { setTasks(next); savePlanTasks(uid, next); };
  const toggleDone = (id: string) => persist(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));

  const todayLocal = new Date();
  const todayKey = `${todayLocal.getFullYear()}-${String(todayLocal.getMonth()+1).padStart(2,'0')}-${String(todayLocal.getDate()).padStart(2,'0')}`;
  const todayLabel = todayLocal.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Get calendar entries for today
  const studyCal = (() => { try { return JSON.parse(localStorage.getItem(`hs_calendar_${uid}`) ?? "{}"); } catch { return {}; } })();
  const revCal = (() => { try { return JSON.parse(localStorage.getItem(`hs_cal_revision_${uid}`) ?? "{}"); } catch { return {}; } })();
  const pracCal = (() => { try { return JSON.parse(localStorage.getItem(`hs_cal_practice_${uid}`) ?? "{}"); } catch { return {}; } })();
  const customTasks = (() => { try { return JSON.parse(localStorage.getItem(`heartspace_custom_tasks_${uid}_${todayKey}`) ?? "[]"); } catch { return []; } })();

  const studyEntries = (studyCal[todayKey] ?? []).map((e: any) => ({ ...e, type: "Study", color: STUDY_BLUE, subj: studySubjects.find((s: any) => s.id === e.subjectId)?.name ?? e.subjectId }));
  const revEntries = (revCal[todayKey] ?? []).map((e: any) => ({ ...e, type: "Revision", color: REVISION_ORANGE, subj: revisionSubjects.find((s: any) => s.id === e.subjectId)?.name ?? e.subjectId }));
  const pracEntries = (pracCal[todayKey] ?? []).map((e: any) => ({ ...e, type: "Practice", color: "#2E7D52", subj: practiceSubjects.find((s: any) => s.id === e.subjectId)?.name ?? e.subjectId }));
  const allCalEntries = [...studyEntries, ...revEntries, ...pracEntries];
  const doneCount = tasks.filter(t => t.done).length;

  return (
    <Card className="lg:col-span-2 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-serif text-lg font-semibold" style={{ color: CHARCOAL }}>Today's Overview</h2>
          <p className="text-xs mt-0.5" style={{ color: MUTED }}>{todayLabel}</p>
        </div>
        {tasks.length > 0 && (
          <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: `${PROGRESS_PURPLE}15`, color: PROGRESS_PURPLE }}>
            {doneCount}/{tasks.length} done
          </span>
        )}
      </div>

      {/* Calendar scheduled items */}
      {allCalEntries.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: MUTED }}>📅 Scheduled Today</p>
          <div className="space-y-1.5">
            {allCalEntries.map((e: any, i: number) => (
              <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-xl" style={{ background: `${e.color}10`, border: `1px solid ${e.color}30` }}>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: e.color }} />
                <span className="text-xs font-semibold flex-1" style={{ color: CHARCOAL }}>{e.subj}</span>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: `${e.color}20`, color: e.color }}>{e.type}</span>
                <span className="text-[10px] font-bold" style={{ color: e.color }}>{e.hours}h</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom tasks */}
      {tasks.length > 0 && (
        <div className="mb-2">
          <p className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: MUTED }}>✏️ Tasks</p>
          <div className="space-y-1.5">
            {tasks.map(t => (
              <div key={t.id} className="flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer" style={{ background: CREAM, border: `1px solid ${BORDER}` }} onClick={() => toggleDone(t.id)}>
                <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0" style={{ borderColor: t.done ? OLIVE : BORDER, background: t.done ? OLIVE : 'transparent' }}>
                  {t.done && <span className="text-white text-[8px] font-bold">✓</span>}
                </div>
                <span className="text-xs font-semibold flex-1" style={{ color: CHARCOAL, textDecoration: t.done ? 'line-through' : 'none', opacity: t.done ? 0.6 : 1 }}>{t.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: `${CAT_COLORS[t.category]?.bg ?? CREAM}`, color: CAT_COLORS[t.category]?.text ?? MUTED }}>{t.category}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {allCalEntries.length === 0 && tasks.length === 0 && (
        <div className="text-center py-8" style={{ color: MUTED }}>
          <p className="text-sm">Nothing scheduled for today.</p>
          <p className="text-xs mt-1">Set up your roadmap calendar to see today's plan here.</p>
        </div>
      )}

      {/* Custom tasks from calendar popup also show here */}
      {customTasks.length > 0 && (
        <div className="mt-2">
          <p className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: MUTED }}>📌 Added Tasks</p>
          <div className="space-y-1.5">
            {customTasks.map((t: any, i: number) => (
              <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-xl" style={{ background: CREAM, border: `1px solid ${BORDER}` }}>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PROGRESS_PURPLE }} />
                <span className="text-xs font-semibold flex-1" style={{ color: CHARCOAL }}>{t.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: `${PROGRESS_PURPLE}15`, color: PROGRESS_PURPLE }}>{t.category}</span>
              </div>
            ))}
          </div>
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
  // Load speed multipliers
  const _uid = String((user as any)?.id ?? "");
  const _studySpeedMap = (() => { try { return JSON.parse(localStorage.getItem(`hs_topic_speed_${_uid}`) ?? "{}"); } catch { return {}; } })();
  const _revSpeedMap = (() => { try { return JSON.parse(localStorage.getItem(`hs_revision_speed_${_uid}`) ?? "{}"); } catch { return {}; } })();
  const _pracSpeedMap = (() => { try { return JSON.parse(localStorage.getItem(`hs_practice_speed_${_uid}`) ?? "{}"); } catch { return {}; } })();
  const SPEED_MULTS: Record<string, number> = { gentle: 1.40, steady: 1.30, standard: 1.00, accelerated: 0.70, rapid: 0.60 };
  const dashStudySubjects = dashRoadmapSubjects.map((s) => ({
    id: s.id, name: s.name,
    totalHours: Math.round(s.totalHours * (SPEED_MULTS[_studySpeedMap[s.id]] ?? 1.0) * 10) / 10,
  }));
  const dashRevisionSubjects = dashRoadmapSubjects.map((s) => {
    const studyHours = s.totalHours * (SPEED_MULTS[_studySpeedMap[s.id]] ?? 1.0);
    return { id: s.id, name: s.name, totalHours: Math.round(studyHours * 0.4 * (SPEED_MULTS[_revSpeedMap[s.id]] ?? 1.0) * 10) / 10 };
  });
  const dashPracticeSubjects = dashRoadmapSubjects.map((s) => {
    const studyHours = s.totalHours * (SPEED_MULTS[_studySpeedMap[s.id]] ?? 1.0);
    return { id: s.id, name: s.name, totalHours: Math.round(studyHours * 0.7 * (SPEED_MULTS[_pracSpeedMap[s.id]] ?? 1.0) * 10) / 10 };
  });

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
          {/* Speed pickers for study, revision and practice */}
          <div className="flex gap-3 mb-4 flex-wrap">
            {[
              { label: "Study Speed", key: `hs_topic_speed_${_uid}`, color: "#2C4A73" },
              { label: "Revision Speed", key: `hs_revision_speed_${_uid}`, color: "#E07A28" },
              { label: "Practice Speed", key: `hs_practice_speed_${_uid}`, color: "#2E7D52" },
            ].map(({ label, key, color }) => {
              const speedMap = (() => { try { return JSON.parse(localStorage.getItem(key) ?? "{}"); } catch { return {}; } })();
              const current = speedMap[dashRoadmapSubjects[0]?.id] ?? "standard";
              return (
                <div key={key} style={{ flex: 1, minWidth: 200, background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "0.5rem 0.75rem" }}>
                  <p style={{ fontSize: "0.65rem", fontWeight: 700, color: MUTED, margin: "0 0 0.35rem", textTransform: "uppercase" }}>{label}</p>
                  <div style={{ display: "flex", gap: "0.3rem" }}>
                    {[["gentle","🐢","+40%"],["steady","🌿","+30%"],["standard","⚖️","Std"],["accelerated","⚡","-30%"],["rapid","🚀","-40%"]].map(([k, e, l]) => (
                      <button key={k} onClick={() => {
                        const next: Record<string,string> = {};
                        dashRoadmapSubjects.forEach(s => { next[s.id] = k; });
                        localStorage.setItem(key, JSON.stringify(next));
                        window.location.reload();
                      }} style={{
                        flex: 1, padding: "0.25rem 0.1rem", borderRadius: 6, fontSize: "0.6rem", fontWeight: 600, cursor: "pointer",
                        background: current === k ? color : CREAM,
                        color: current === k ? "#fff" : MUTED,
                        border: `1px solid ${current === k ? color : BORDER}`,
                      }}>{e} {l}</button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
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
        <TodaysOverview uid={String(user?.id ?? "")} studySubjects={dashStudySubjects} revisionSubjects={dashRevisionSubjects} practiceSubjects={dashPracticeSubjects} />
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

      {/* ── Wellbeing prompts ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <SectionTitle>Reports Summary</SectionTitle>
          {(() => {
            try {
              const uid = String(user?.id ?? "");
              const todayLocal = new Date();
              const todayKey = `${todayLocal.getFullYear()}-${String(todayLocal.getMonth()+1).padStart(2,'0')}-${String(todayLocal.getDate()).padStart(2,'0')}`;
              const cal = JSON.parse(localStorage.getItem(`hs_calendar_${uid}`) ?? "{}");
              // Sum hours per subject up to and including today
              const coveredHours: Record<string, number> = {};
              Object.entries(cal).forEach(([day, entries]: [string, any]) => {
                if (day <= todayKey) {
                  entries.forEach((e: any) => {
                    coveredHours[e.subjectId] = (coveredHours[e.subjectId] ?? 0) + e.hours;
                  });
                }
              });
              const totalAllHours = dashStudySubjects.reduce((a, s) => a + s.totalHours, 0);
              const coveredAllHours = Object.values(coveredHours).reduce((a: number, b: any) => a + b, 0);
              const overallPct = totalAllHours > 0 ? Math.round((coveredAllHours / totalAllHours) * 100) : 0;
              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: CREAM }}>
                    <span className="text-xs font-semibold" style={{ color: CHARCOAL }}>📚 Overall Coverage</span>
                    <span className="text-xs font-bold" style={{ color: PROGRESS_PURPLE }}>{coveredAllHours}h / {totalAllHours}h ({overallPct}%)</span>
                  </div>
                  <div className="space-y-2">
                    {dashStudySubjects.map(s => {
                      const covered = Math.round((coveredHours[s.id] ?? 0) * 10) / 10;
                      const total = s.totalHours;
                      const pct = total > 0 ? Math.round((covered / total) * 100) : 0;
                      return (
                        <div key={s.id} className="p-2.5 rounded-xl" style={{ background: CREAM, border: `1px solid ${BORDER}` }}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold" style={{ color: CHARCOAL }}>{s.name}</span>
                            <span className="text-[10px] font-bold" style={{ color: pct >= 100 ? OLIVE : PROGRESS_PURPLE }}>
                              {covered}/{total}h · {pct}%
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full" style={{ background: BORDER }}>
                            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: pct >= 100 ? OLIVE : pct >= 50 ? PROGRESS_PURPLE : REVISION_ORANGE }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            } catch {
              return <p className="text-xs" style={{ color: MUTED }}>No calendar data yet. Set up your roadmap first.</p>;
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
