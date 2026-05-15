import { useState, useEffect, Component, ReactNode } from "react";
import { useGetStudentsOverview, useGetDashboardSummary } from "../lib/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Calendar, AlertTriangle, TrendingUp, Users, ChevronDown, Check, X } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";
import { useAuth } from "../lib/auth";
import { supabase, type SupabaseRole } from "../lib/supabase";
import { useToast } from "@/hooks/use-toast";

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

const ROLE_LABELS: Record<string, string> = {
  admin:             "Counsellor (Admin)",
  prep_student:      "Prep Space Student",
  counseling_client: "Self Space Student",
  academy_student:   "Academy Student",
};
const ALL_ROLES: SupabaseRole[] = ["admin", "prep_student", "counseling_client", "academy_student"];

/* Safe date formatter — never throws */
function safeFormat(input: string | null | undefined, fmt: string, fallback = "—"): string {
  try {
    if (!input) return fallback;
    const d = new Date(input);
    if (isNaN(d.getTime())) return fallback;
    return format(d, fmt);
  } catch {
    return fallback;
  }
}

/* Section-level error boundary — shows empty state instead of crashing the whole page */
class SectionBoundary extends Component<{ label: string; children: ReactNode }, { crashed: boolean }> {
  constructor(props: { label: string; children: ReactNode }) {
    super(props);
    this.state = { crashed: false };
  }
  static getDerivedStateFromError() { return { crashed: true }; }
  componentDidCatch(err: unknown) { console.error(`[${this.props.label}] crashed:`, err); }
  render() {
    if (this.state.crashed) {
      return (
        <div className="rounded-2xl p-6 text-center" style={{ background: CREAM, border: `1.5px dashed ${BORDER}` }}>
          <p className="text-sm" style={{ color: MUTED }}>{this.props.label} is temporarily unavailable.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

/* Demo student data (shown when API is unavailable) */
const DEMO_STUDENTS = [
  {
    id: "prep@heartspace.com", name: "Prep Space Student", space: "prep",
    moodAvg: 3.8, sleepAvg: 7.2, riskFlag: false, totalSessions: 4,
    latestMood: 4, lastSession: new Date(Date.now() - 5 * 86400000).toISOString(), upcomingSession: null, avatarUrl: null,
  },
  {
    id: "counseling@heartspace.com", name: "Counseling Client", space: "self",
    moodAvg: 2.1, sleepAvg: 5.8, riskFlag: true, totalSessions: 7,
    latestMood: 2, lastSession: new Date(Date.now() - 2 * 86400000).toISOString(),
    upcomingSession: { scheduledAt: new Date(Date.now() + 2 * 86400000).toISOString() }, avatarUrl: null,
  },
  {
    id: "academy@heartspace.com", name: "Academy Student", space: "prep",
    moodAvg: 4.2, sleepAvg: 7.8, riskFlag: false, totalSessions: 2,
    latestMood: 5, lastSession: new Date(Date.now() - 10 * 86400000).toISOString(), upcomingSession: null, avatarUrl: null,
  },
];

function MoodBar({ avg }: { avg: number | null | undefined }) {
  if (avg == null) return <span style={{ color: MUTED }}>No data</span>;
  const pct   = ((avg - 1) / 4) * 100;
  const color = avg >= 4 ? OLIVE : avg >= 3 ? GOLD : RISK_RED;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: BORDER }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-bold" style={{ color }}>{avg.toFixed(1)}</span>
    </div>
  );
}

interface StudentCardData {
  id: string | number; name: string; space: string | null;
  moodAvg: number | null; sleepAvg: number | null; riskFlag: boolean;
  totalSessions: number; latestMood: number | null;
  lastSession: string | null; upcomingSession: { scheduledAt: string } | null;
  avatarUrl: string | null;
}

function StudentCard({ s }: { s: StudentCardData }) {
  const mood = s.latestMood ?? null;
  return (
    <Link href={`/student/${s.id}`}>
      <div className="rounded-2xl p-5 cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 group"
        style={{
          background: CARD,
          border: s.riskFlag ? `1.5px solid ${RISK_RED}66` : `1px solid ${BORDER}`,
          boxShadow: s.riskFlag ? "0 4px 16px rgba(192,57,43,.12)" : "0 2px 10px rgba(44,24,16,.07)",
        }}>
        <div className="flex items-start gap-4">
          <div className="relative flex-shrink-0">
            <Avatar className="h-12 w-12">
              <AvatarImage src={s.avatarUrl || undefined} />
              <AvatarFallback className="font-bold text-sm" style={{ background: `${DARK}18`, color: DARK }}>
                {(s.name ?? "??").substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {s.riskFlag && (
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: RISK_RED }}>
                <span className="text-white text-[8px] font-bold">!</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-base group-hover:underline" style={{ color: CHARCOAL }}>{s.name}</h3>
                {s.space && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: s.space === "prep" ? `${GOLD}28` : `${SAGE}33`, color: s.space === "prep" ? "#7A5510" : OLIVE }}>
                    {s.space === "prep" ? "📚 Prep" : "🌿 Self"}
                  </span>
                )}
                {s.riskFlag && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#FCE4E4", color: RISK_RED }}>
                    ⚠ Needs Attention
                  </span>
                )}
              </div>
              {mood !== null && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
                  style={{ background: MOOD_BG[mood] ?? CREAM, color: MOOD_COLORS[mood] ?? MUTED }}>
                  {MOOD_LABELS[mood] ?? mood}
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
              <span>{s.totalSessions ?? 0} session{s.totalSessions !== 1 ? "s" : ""}</span>
              {s.lastSession && (
                <span className="ml-2">· Last: {safeFormat(s.lastSession, "MMM d")}</span>
              )}
            </div>
          </div>
        </div>
        {s.upcomingSession && (
          <div className="mt-4 pt-3 flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-xl"
            style={{ borderTop: `1px solid ${BORDER}`, background: `${GOLD}14`, color: "#7A5510" }}>
            <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
            Next: {safeFormat(s.upcomingSession.scheduledAt, "MMM d, h:mm a")}
          </div>
        )}
      </div>
    </Link>
  );
}

/* ─── Student Profiles Manager ─────────────── */
interface Profile {
  id: string;
  full_name: string | null;
  role: string;
  avatar_url: string | null;
}

function StudentProfilesManager() {
  const { toast }         = useToast();
  const [profiles, setProfiles]   = useState<Profile[]>([]);
  const [loading, setLoading]     = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole]   = useState<SupabaseRole>("prep_student");
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, full_name, role, avatar_url")
      .order("full_name", { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setProfiles(data as Profile[]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSaveRole(id: string) {
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({ role: editRole }).eq("id", id);
      if (error) {
        toast({ title: "Failed to update role", description: error.message, variant: "destructive" });
      } else {
        setProfiles((p) => p.map((pr) => pr.id === id ? { ...pr, role: editRole } : pr));
        toast({ title: "Role updated", description: `Updated to "${ROLE_LABELS[editRole] ?? editRole}"` });
      }
    } catch (err: any) {
      toast({ title: "Failed to update role", description: err?.message ?? "Unknown error", variant: "destructive" });
    }
    setSaving(false);
    setEditingId(null);
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: "0 2px 10px rgba(44,24,16,.07)" }}>
      <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${BORDER}`, background: CREAM }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${GOLD}22` }}>
            <Users className="w-4 h-4" style={{ color: GOLD }} />
          </div>
          <div>
            <h3 className="font-semibold text-sm" style={{ color: CHARCOAL }}>Manage Student Profiles</h3>
            <p className="text-xs" style={{ color: MUTED }}>View and edit roles for all registered users</p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: `${DARK}14`, color: DARK }}>
          {profiles.length} users
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: GOLD }} />
        </div>
      ) : profiles.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm" style={{ color: MUTED }}>No profiles found in Supabase yet.</p>
          <p className="text-xs mt-1" style={{ color: MUTED }}>Users will appear here after they sign up.</p>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: BORDER }}>
          {profiles.map((p) => {
            const isEditing = editingId === p.id;
            const initials  = (p.full_name ?? "??").substring(0, 2).toUpperCase();
            return (
              <div key={p.id} className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-[#FAF7F2]">
                <Avatar className="h-9 w-9 flex-shrink-0">
                  <AvatarImage src={p.avatar_url || undefined} />
                  <AvatarFallback className="text-xs font-bold" style={{ background: `${DARK}14`, color: DARK }}>{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: CHARCOAL }}>{p.full_name ?? "Unknown"}</p>
                </div>
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <select value={editRole} onChange={(e) => setEditRole(e.target.value as SupabaseRole)}
                        className="appearance-none pl-3 pr-8 py-1.5 rounded-xl text-xs font-semibold cursor-pointer outline-none"
                        style={{ background: `${GOLD}18`, border: `1.5px solid ${GOLD}55`, color: CHARCOAL }}>
                        {ALL_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: MUTED }} />
                    </div>
                    <button onClick={() => handleSaveRole(p.id)} disabled={saving}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-opacity hover:opacity-70"
                      style={{ background: OLIVE, color: "#fff" }}>
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => setEditingId(null)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-opacity hover:opacity-70"
                      style={{ background: BORDER, color: MUTED }}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{
                        background: p.role === "admin" ? `${DARK}14` : p.role === "prep_student" ? `${GOLD}22` : p.role === "counseling_client" ? `${SAGE}33` : `${OLIVE}22`,
                        color: p.role === "admin" ? DARK : p.role === "prep_student" ? "#7A5510" : OLIVE,
                      }}>
                      {ROLE_LABELS[p.role] ?? p.role}
                    </span>
                    <button onClick={() => { setEditingId(p.id); setEditRole((p.role as SupabaseRole) ?? "prep_student"); }}
                      className="text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-opacity hover:opacity-70"
                      style={{ background: `${GOLD}18`, color: "#7A5510" }}>
                      Edit
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Main counsellor dashboard ─────────────── */
export default function CounsellorDashboard() {
  const { user } = useAuth();
  const { data: overviews, isLoading, isError } = useGetStudentsOverview();
  const { data: globalSummary } = useGetDashboardSummary({});

  const hour      = new Date().getHours();
  const greetWord = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = user?.name?.split(" ")[0] ?? "";

  const students: StudentCardData[] = (() => {
    try {
      const list = Array.isArray(overviews) ? overviews : [];
      if (isError || (!isLoading && !list.length)) return DEMO_STUDENTS;
      return list.map((o) => ({
        id:             o.student.id,
        name:           o.student.name ?? "Student",
        space:          (o.student as any).space ?? null,
        moodAvg:        (o as any).moodAvg ?? null,
        sleepAvg:       (o as any).sleepAvg ?? null,
        riskFlag:       (o as any).riskFlag ?? false,
        totalSessions:  o.totalSessions ?? 0,
        latestMood:     o.latestMood ?? null,
        lastSession:    o.lastSession ?? null,
        upcomingSession: o.upcomingSession ?? null,
        avatarUrl:      o.student.avatarUrl ?? null,
      }));
    } catch {
      return DEMO_STUDENTS;
    }
  })();

  const riskCount     = students.filter((s) => s.riskFlag).length;
  const upcomingCount = students.filter((s) => s.upcomingSession).length;
  const totalSessions = globalSummary?.totalSessions ?? students.reduce((a, s) => a + (s.totalSessions ?? 0), 0);

  return (
    <div className="space-y-7 animate-in fade-in duration-500">

      {/* Greeting */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold" style={{ color: CHARCOAL }}>
            {greetWord}{firstName ? `, ${firstName}` : ""} ✨
          </h1>
          <p className="mt-1.5 text-sm" style={{ color: MUTED }}>Here is your students' wellbeing overview.</p>
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
        <SectionBoundary label="Risk Banner">
          <div className="flex items-start gap-3 p-4 rounded-2xl" style={{ background: "#FCE4E4", border: `1.5px solid ${RISK_RED}44` }}>
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
        </SectionBoundary>
      )}

      {/* Stats */}
      <SectionBoundary label="Stats">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Students",    value: students.length, sub: "enrolled",  color: DARK,     icon: "👤" },
            { label: "Sessions Upcoming", value: upcomingCount,   sub: "scheduled", color: "#8A5A10", icon: "📅" },
            { label: "Total Sessions",    value: isLoading ? "…" : totalSessions,  sub: "all time",  color: OLIVE, icon: "📊" },
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
      </SectionBoundary>

      {/* Students grid */}
      <SectionBoundary label="Student Cards">
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

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl p-5 animate-pulse" style={{ background: CARD, border: `1px solid ${BORDER}`, height: 160 }} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {students.map((s) => <StudentCard key={String(s.id)} s={s} />)}
              {students.length === 0 && (
                <div className="col-span-2 text-center py-16 rounded-2xl" style={{ background: CREAM, border: `1.5px dashed ${BORDER}` }}>
                  <TrendingUp className="w-8 h-8 mx-auto mb-3 opacity-30" style={{ color: GOLD }} />
                  <p className="text-sm font-medium" style={{ color: CHARCOAL }}>No students assigned yet</p>
                </div>
              )}
            </div>
          )}
        </div>
      </SectionBoundary>

      {/* Supabase student profiles management */}
      <SectionBoundary label="Profile Manager">
        <div>
          <h2 className="font-serif text-xl font-semibold mb-5" style={{ color: CHARCOAL }}>Registered User Profiles</h2>
          <StudentProfilesManager />
        </div>
      </SectionBoundary>
    </div>
  );
}
