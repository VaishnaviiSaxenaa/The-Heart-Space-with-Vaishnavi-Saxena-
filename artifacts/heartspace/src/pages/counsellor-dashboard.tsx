import { useGetStudentsOverview, useGetDashboardSummary } from "@workspace/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Calendar, AlertTriangle, Moon, Heart, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

const CREAM    = "#FAF7F2";
const CHARCOAL = "#3D3530";
const GOLD     = "#E6A756";
const CARD     = "#F3EDE6";
const MUTED    = "#8C7B70";
const BORDER   = "#D8CFC4";
const SAGE     = "#A8BFA3";
const OLIVE    = "#6E8B6B";
const SIDEBAR  = "#5C3D2E";
const RISK_RED = "#C0392B";

const MOOD_COLORS = ["", "#C4785A", "#C9A05A", "#B5A060", SAGE, OLIVE];
const MOOD_BG     = ["", "#F4E4DC", "#F5EDD8", "#F0E8CC", "#E8F0E6", "#DFF0DA"];
const MOOD_LABELS = ["", "Struggling", "Low", "Okay", "Good", "Great"];

function MoodBar({ avg }: { avg: number | null | undefined }) {
  if (avg == null) return <span style={{ color: MUTED }}>–</span>;
  const pct = ((avg - 1) / 4) * 100;
  const color = avg >= 4 ? OLIVE : avg >= 3 ? GOLD : RISK_RED;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: BORDER }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-semibold" style={{ color }}>{avg.toFixed(1)}</span>
    </div>
  );
}

export default function CounsellorDashboard() {
  const { data: overviews, isLoading } = useGetStudentsOverview();
  const { data: globalSummary } = useGetDashboardSummary({});

  if (isLoading) return (
    <div className="flex justify-center items-center h-64">
      <Loader2 className="w-7 h-7 animate-spin" style={{ color: GOLD }} />
    </div>
  );

  const totalStudents  = overviews?.length ?? 0;
  const upcoming       = overviews?.filter((o) => o.upcomingSession).length ?? 0;
  const totalSessions  = globalSummary?.totalSessions ?? 0;
  const riskCount      = overviews?.filter((o) => (o as any).riskFlag).length ?? 0;

  const hour = new Date().getHours();
  const greetWord = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-7 animate-in fade-in duration-500">

      {/* Greeting */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold" style={{ color: CHARCOAL }}>
            {greetWord} ✨
          </h1>
          <p className="mt-1.5 text-sm" style={{ color: MUTED }}>
            Here is an overview of your students and their wellbeing.
          </p>
        </div>
        <Link href="/sessions">
          <button className="self-start flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02]"
            style={{ background: `linear-gradient(135deg, #C8922A 0%, ${GOLD} 100%)`, color: CREAM, boxShadow: "0 4px 14px rgba(230,167,86,.35)" }}>
            <Calendar className="w-4 h-4" /> View Sessions
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
              {riskCount} student{riskCount > 1 ? "s" : ""} flagged for attention
            </p>
            <p className="text-xs mt-0.5" style={{ color: "#8B2020" }}>
              Mood score ≤ 2 logged for 3+ consecutive days. Click the student card to review.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Students",    value: totalStudents, sub: "enrolled",  color: SIDEBAR, icon: "👤" },
          { label: "Sessions Upcoming", value: upcoming,      sub: "scheduled", color: GOLD,    icon: "📅" },
          { label: "Total Sessions",    value: totalSessions, sub: "all time",  color: OLIVE,   icon: "📊" },
          { label: "Needs Attention",   value: riskCount,     sub: "risk flag", color: riskCount ? RISK_RED : MUTED, icon: "⚠️" },
        ].map(({ label, value, sub, color, icon }) => (
          <div key={label} className="rounded-2xl p-5"
            style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: "0 2px 8px rgba(61,53,48,.06)" }}>
            <div className="text-2xl mb-1">{icon}</div>
            <div className="text-3xl font-serif font-bold mb-1" style={{ color }}>{value}</div>
            <div className="text-xs font-semibold" style={{ color: CHARCOAL }}>{label}</div>
            <div className="text-xs" style={{ color: MUTED }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Students grid */}
      <div>
        <h2 className="font-serif text-xl font-semibold mb-5" style={{ color: CHARCOAL }}>Your Students</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {overviews?.map((overview) => {
            const mood    = overview.latestMood ?? null;
            const moodAvg = (overview as any).moodAvg as number | null;
            const sleepAvg = (overview as any).sleepAvg as number | null;
            const riskFlag = (overview as any).riskFlag as boolean;
            const space    = (overview.student as any).space as string | null;

            return (
              <Link key={overview.student.id} href={`/student/${overview.student.id}`}>
                <div
                  className="rounded-2xl p-6 cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 group"
                  style={{
                    background: CARD,
                    border: riskFlag ? `1.5px solid ${RISK_RED}66` : `1px solid ${BORDER}`,
                    boxShadow: riskFlag ? "0 2px 12px rgba(192,57,43,.12)" : "0 2px 8px rgba(61,53,48,.06)",
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <Avatar className="h-12 w-12 flex-shrink-0">
                        <AvatarImage src={overview.student.avatarUrl || undefined} />
                        <AvatarFallback className="font-semibold text-sm"
                          style={{ background: `${SIDEBAR}15`, color: SIDEBAR }}>
                          {overview.student.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {riskFlag && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                          style={{ background: RISK_RED }}>
                          <span className="text-white text-[8px] font-bold">!</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-base group-hover:underline" style={{ color: CHARCOAL }}>
                            {overview.student.name}
                          </h3>
                          {space && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{ background: space === "prep" ? `${GOLD}22` : `${SAGE}33`, color: space === "prep" ? SIDEBAR : OLIVE }}>
                              {space === "prep" ? "Prep" : "Self"}
                            </span>
                          )}
                          {riskFlag && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{ background: "#FCE4E4", color: RISK_RED }}>⚠ Alert</span>
                          )}
                        </div>
                        {mood !== null && (
                          <span className="flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full"
                            style={{ background: MOOD_BG[mood], color: MOOD_COLORS[mood] }}>
                            {MOOD_LABELS[mood]}
                          </span>
                        )}
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[10px] font-semibold mb-1" style={{ color: MUTED }}>7-day mood avg</p>
                          <MoodBar avg={moodAvg} />
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold mb-1" style={{ color: MUTED }}>Sleep avg</p>
                          <p className="text-xs font-semibold" style={{ color: sleepAvg != null ? (sleepAvg >= 7 ? OLIVE : sleepAvg >= 6 ? GOLD : RISK_RED) : MUTED }}>
                            {sleepAvg != null ? `${sleepAvg.toFixed(1)}h / night` : "Not logged"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 text-xs" style={{ color: MUTED }}>
                        <span>{overview.totalSessions} session{overview.totalSessions !== 1 ? "s" : ""}</span>
                        {overview.lastSession && (
                          <span className="ml-2">· Last: {format(new Date(overview.lastSession), "MMM d")}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {overview.upcomingSession && (
                    <div className="mt-4 pt-4 flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-xl"
                      style={{ borderTop: `1px solid ${BORDER}`, background: `${GOLD}14`, color: `#8A5A10` }}>
                      <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                      Next: {format(new Date(overview.upcomingSession.scheduledAt), "MMM d, h:mm a")}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}

          {overviews?.length === 0 && (
            <div className="col-span-2 text-center py-16 rounded-2xl"
              style={{ background: CREAM, border: `1.5px dashed ${BORDER}`, color: MUTED }}>
              No students assigned yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
