import { useGetStudentsOverview, useGetDashboardSummary } from "../lib/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Calendar, AlertTriangle, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";
import { useAuth } from "../lib/auth";

const CREAM    = "#FAF7F2";
const CHARCOAL = "#2C1810";
const GOLD     = "#C9A96E";
const DARK     = "#3D2314";
const CARD     = "#FFFFFF";
const MUTED    = "#8C7B70";
const BORDER   = "#E8DDD0";
const SAGE     = "#A8BFA3";
const OLIVE    = "#6E8B6B";
const RISK_RED = "#C0392B";

const MOOD_COLORS = ["", "#C4785A", "#C9A05A", "#B5A060", SAGE, OLIVE];
const MOOD_BG     = ["", "#F4E4DC", "#F5EDD8", "#F0E8CC", "#E8F0E6", "#DFF0DA"];
const MOOD_LABELS = ["", "Struggling", "Low", "Okay", "Good", "Great"];

/* Demo student data (shown when API is unavailable) */
const DEMO_STUDENTS = [
  {
    id: "prep@heartspace.com",
    name: "Prep Space Student",
    space: "prep",
    moodAvg: 3.8,
    sleepAvg: 7.2,
    riskFlag: false,
    totalSessions: 4,
    latestMood: 4,
    lastSession: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    upcomingSession: null,
    avatarUrl: null,
  },
  {
    id: "counseling@heartspace.com",
    name: "Counseling Client",
    space: "self",
    moodAvg: 2.1,
    sleepAvg: 5.8,
    riskFlag: true,
    totalSessions: 7,
    latestMood: 2,
    lastSession: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    upcomingSession: { scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() },
    avatarUrl: null,
  },
  {
    id: "academy@heartspace.com",
    name: "Academy Student",
    space: "prep",
    moodAvg: 4.2,
    sleepAvg: 7.8,
    riskFlag: false,
    totalSessions: 2,
    latestMood: 5,
    lastSession: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    upcomingSession: null,
    avatarUrl: null,
  },
];

function MoodBar({ avg }: { avg: number | null | undefined }) {
  if (avg == null) return <span style={{ color: MUTED }}>No data</span>;
  const pct   = ((avg - 1) / 4) * 100;
  const color = avg >= 4 ? OLIVE : avg >= 3 ? GOLD : RISK_RED;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: BORDER }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-bold" style={{ color }}>{avg.toFixed(1)}</span>
    </div>
  );
}

interface StudentCardData {
  id: string | number;
  name: string;
  space: string | null;
  moodAvg: number | null;
  sleepAvg: number | null;
  riskFlag: boolean;
  totalSessions: number;
  latestMood: number | null;
  lastSession: string | null;
  upcomingSession: { scheduledAt: string } | null;
  avatarUrl: string | null;
}

function StudentCard({ s }: { s: StudentCardData }) {
  const mood = s.latestMood ?? null;

  return (
    <Link href={`/student/${s.id}`}>
      <div
        className="rounded-2xl p-5 cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 group"
        style={{
          background: CARD,
          border: s.riskFlag ? `1.5px solid ${RISK_RED}66` : `1px solid ${BORDER}`,
          boxShadow: s.riskFlag
            ? "0 4px 16px rgba(192,57,43,.12)"
            : "0 2px 10px rgba(44,24,16,.07)",
        }}>
        <div className="flex items-start gap-4">
          <div className="relative flex-shrink-0">
            <Avatar className="h-12 w-12">
              <AvatarImage src={s.avatarUrl || undefined} />
              <AvatarFallback className="font-bold text-sm"
                style={{ background: `${DARK}18`, color: DARK }}>
                {s.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {s.riskFlag && (
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                style={{ background: RISK_RED }}>
                <span className="text-white text-[8px] font-bold">!</span>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-base group-hover:underline" style={{ color: CHARCOAL }}>
                  {s.name}
                </h3>
                {s.space && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: s.space === "prep" ? `${GOLD}28` : `${SAGE}33`,
                      color: s.space === "prep" ? "#7A5510" : OLIVE,
                    }}>
                    {s.space === "prep" ? "📚 Prep" : "🌿 Self"}
                  </span>
                )}
                {s.riskFlag && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: "#FCE4E4", color: RISK_RED }}>
                    ⚠ Needs Attention
                  </span>
                )}
              </div>
              {mood !== null && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
                  style={{ background: MOOD_BG[mood], color: MOOD_COLORS[mood] }}>
                  {MOOD_LABELS[mood]}
                </span>
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-semibold mb-1 uppercase tracking-wide" style={{ color: MUTED }}>7-day mood avg</p>
                <MoodBar avg={s.moodAvg} />
              </div>
              <div>
                <p className="text-[10px] font-semibold mb-1 uppercase tracking-wide" style={{ color: MUTED }}>Sleep avg</p>
                <p className="text-xs font-semibold"
                  style={{ color: s.sleepAvg != null ? (s.sleepAvg >= 7 ? OLIVE : s.sleepAvg >= 6 ? GOLD : RISK_RED) : MUTED }}>
                  {s.sleepAvg != null ? `${s.sleepAvg.toFixed(1)}h / night` : "Not logged"}
                </p>
              </div>
            </div>

            <div className="mt-2.5 text-xs" style={{ color: MUTED }}>
              <span>{s.totalSessions} session{s.totalSessions !== 1 ? "s" : ""}</span>
              {s.lastSession && (
                <span className="ml-2">· Last: {format(new Date(s.lastSession), "MMM d")}</span>
              )}
            </div>
          </div>
        </div>

        {s.upcomingSession && (
          <div className="mt-4 pt-3 flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-xl"
            style={{ borderTop: `1px solid ${BORDER}`, background: `${GOLD}14`, color: "#7A5510" }}>
            <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
            Next: {format(new Date(s.upcomingSession.scheduledAt), "MMM d, h:mm a")}
          </div>
        )}
      </div>
    </Link>
  );
}

export default function CounsellorDashboard() {
  const { user } = useAuth();
  const { data: overviews, isLoading, isError } = useGetStudentsOverview();
  const { data: globalSummary } = useGetDashboardSummary({});

  const hour      = new Date().getHours();
  const greetWord = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = user?.name?.split(" ")[0] ?? "";

  /* Use API data if available, otherwise fall back to demo data */
  const students: StudentCardData[] = isError || (!isLoading && !overviews?.length)
    ? DEMO_STUDENTS
    : (overviews ?? []).map((o) => ({
        id: o.student.id,
        name: o.student.name,
        space: (o.student as any).space ?? null,
        moodAvg: (o as any).moodAvg ?? null,
        sleepAvg: (o as any).sleepAvg ?? null,
        riskFlag: (o as any).riskFlag ?? false,
        totalSessions: o.totalSessions,
        latestMood: o.latestMood ?? null,
        lastSession: o.lastSession ?? null,
        upcomingSession: o.upcomingSession ?? null,
        avatarUrl: o.student.avatarUrl ?? null,
      }));

  const riskCount      = students.filter((s) => s.riskFlag).length;
  const upcomingCount  = students.filter((s) => s.upcomingSession).length;
  const totalSessions  = globalSummary?.totalSessions ?? students.reduce((a, s) => a + s.totalSessions, 0);

  if (isLoading) return (
    <div className="flex justify-center items-center h-64">
      <Loader2 className="w-7 h-7 animate-spin" style={{ color: GOLD }} />
    </div>
  );

  return (
    <div className="space-y-7 animate-in fade-in duration-500">

      {/* Greeting */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold" style={{ color: CHARCOAL }}>
            {greetWord}{firstName ? `, ${firstName}` : ""} ✨
          </h1>
          <p className="mt-1.5 text-sm" style={{ color: MUTED }}>
            Here is your students' wellbeing overview.
          </p>
        </div>
        <Link href="/sessions">
          <button className="self-start flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02]"
            style={{ background: `linear-gradient(135deg, #A07840 0%, ${GOLD} 100%)`, color: "#fff", boxShadow: "0 4px 14px rgba(201,169,110,.30)" }}>
            <Calendar className="w-4 h-4" /> Manage Sessions
          </button>
        </Link>
      </div>

      {/* Risk banner */}
      {riskCount > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-2xl"
          style={{ background: "#FCE4E4", border: `1.5px solid ${RISK_RED}44` }}>
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: RISK_RED }} />
          <div>
            <p className="font-semibold text-sm" style={{ color: RISK_RED }}>
              {riskCount} student{riskCount > 1 ? "s" : ""} flagged for immediate attention
            </p>
            <p className="text-xs mt-0.5" style={{ color: "#8B2020" }}>
              Mood score ≤ 2 logged for 3+ consecutive days. Click the student card to review their data.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Students",    value: students.length, sub: "enrolled",  color: DARK,     icon: "👤" },
          { label: "Sessions Upcoming", value: upcomingCount,   sub: "scheduled", color: "#8A5A10", icon: "📅" },
          { label: "Total Sessions",    value: totalSessions,   sub: "all time",  color: OLIVE,    icon: "📊" },
          { label: "Needs Attention",   value: riskCount,       sub: "risk flag", color: riskCount ? RISK_RED : MUTED, icon: "⚠️" },
        ].map(({ label, value, sub, color, icon }) => (
          <div key={label} className="rounded-2xl p-5"
            style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: "0 2px 10px rgba(44,24,16,.07)" }}>
            <div className="text-2xl mb-1">{icon}</div>
            <div className="text-3xl font-serif font-bold mb-1" style={{ color }}>{value}</div>
            <div className="text-xs font-semibold" style={{ color: CHARCOAL }}>{label}</div>
            <div className="text-xs" style={{ color: MUTED }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Students grid */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-serif text-xl font-semibold" style={{ color: CHARCOAL }}>Your Students</h2>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: RISK_RED }} />
            <span className="text-xs" style={{ color: MUTED }}>Needs attention</span>
            <div className="w-2 h-2 rounded-full ml-2" style={{ background: OLIVE }} />
            <span className="text-xs" style={{ color: MUTED }}>On track</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {students.map((s) => <StudentCard key={String(s.id)} s={s} />)}
          {students.length === 0 && (
            <div className="col-span-2 text-center py-16 rounded-2xl"
              style={{ background: CREAM, border: `1.5px dashed ${BORDER}` }}>
              <TrendingUp className="w-8 h-8 mx-auto mb-3 opacity-30" style={{ color: GOLD }} />
              <p className="text-sm font-medium" style={{ color: CHARCOAL }}>No students assigned yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
