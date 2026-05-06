import { useGetStudentsOverview, useGetDashboardSummary } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Calendar, Users, TrendingUp, Heart } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

/* Brand tokens */
const BROWN   = "hsl(20, 33%, 27%)";
const BROWN_D = "hsl(20, 33%, 20%)";
const GOLD    = "hsl(43, 89%, 38%)";
const DUST    = "hsl(27, 46%, 59%)";
const IVORY   = "hsl(38, 78%, 95%)";
const TEXT    = "hsl(15, 47%, 12%)";
const MUTED   = "hsl(20, 20%, 45%)";
const BORDER  = "hsl(32, 35%, 86%)";

const moodLabel = ["", "Very Low", "Low",  "Okay", "Good", "Great"];
const moodColor = ["", "hsl(25,70%,48%)", "hsl(35,75%,46%)", "hsl(43,89%,38%)", "hsl(99,45%,35%)", "hsl(99,57%,26%)"];
const moodBg    = ["", "hsl(25,70%,94%)", "hsl(35,75%,93%)", "hsl(43,89%,93%)", "hsl(99,45%,92%)", "hsl(99,57%,91%)"];

export default function CounsellorDashboard() {
  const { data: overviews, isLoading } = useGetStudentsOverview();
  const { data: globalSummary } = useGetDashboardSummary({});

  if (isLoading) return (
    <div className="flex justify-center items-center h-64">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
    </div>
  );

  const totalStudents  = overviews?.length ?? 0;
  const upcoming       = overviews?.filter((o) => o.upcomingSession).length ?? 0;
  const totalSessions  = globalSummary?.totalSessions ?? 0;
  const needsSupport   = overviews?.filter((o) => (o.latestMood ?? 3) <= 2).length ?? 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* Hero */}
      <div className="rounded-2xl p-7" style={{
        background: `linear-gradient(135deg, ${BROWN_D} 0%, ${BROWN} 100%)`,
        boxShadow: "0 8px 24px rgba(44,24,16,0.22)",
      }}>
        <h1 className="text-3xl font-serif font-bold" style={{ color: "hsl(37,86%,96%)" }}>Counsellor Overview</h1>
        <p className="mt-1 text-sm" style={{ color: DUST }}>A summary of your students and their recent activity.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Students",    value: totalStudents,  Icon: Users,      ic: BROWN, ibg: "hsl(20,33%,92%)" },
          { label: "Sessions Upcoming", value: upcoming,       Icon: Calendar,   ic: GOLD,  ibg: "hsl(43,89%,92%)" },
          { label: "Total Sessions",    value: totalSessions,  Icon: TrendingUp, ic: "hsl(99,57%,26%)", ibg: "hsl(99,57%,91%)" },
          { label: "Needs Support",     value: needsSupport,   Icon: Heart,      ic: DUST,  ibg: "hsl(27,46%,92%)" },
        ].map(({ label, value, Icon, ic, ibg }) => (
          <Card key={label} className="border-none shadow-sm" style={{ background: IVORY, border: `1px solid ${BORDER}` }}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: MUTED }}>{label}</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: ibg }}>
                  <Icon className="w-4 h-4" style={{ color: ic }} />
                </div>
              </div>
              <div className="text-3xl font-serif font-bold" style={{ color: TEXT }}>{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Students grid */}
      <div>
        <h2 className="text-2xl font-serif font-semibold mb-5" style={{ color: TEXT }}>Your Students</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {overviews?.map((overview) => {
            const mood = overview.latestMood ?? null;
            return (
              <Link key={overview.student.id} href={`/sessions?studentId=${overview.student.id}`}>
                <Card
                  className="border-none shadow-sm cursor-pointer group transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                  style={{ background: IVORY, border: `1px solid ${BORDER}` }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={overview.student.avatarUrl || undefined} />
                        <AvatarFallback
                          className="font-semibold text-sm"
                          style={{ background: "hsl(20,33%,90%)", color: BROWN }}
                        >
                          {overview.student.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3
                            className="font-semibold text-base truncate transition-colors"
                            style={{ color: TEXT }}
                          >
                            {overview.student.name}
                          </h3>
                          {mood !== null && (
                            <div
                              className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                              style={{ background: moodBg[mood], color: moodColor[mood] }}
                            >
                              <Heart className="w-3 h-3" />
                              {moodLabel[mood]}
                            </div>
                          )}
                        </div>
                        <div className="mt-1.5 space-y-0.5 text-sm" style={{ color: MUTED }}>
                          <p>{overview.totalSessions} session{overview.totalSessions !== 1 ? "s" : ""} total</p>
                          {overview.lastSession && (
                            <p>Last: {format(new Date(overview.lastSession), "MMM d, yyyy")}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {overview.upcomingSession && (
                      <div
                        className="mt-4 pt-4 flex items-center gap-2 text-sm font-medium rounded-lg px-3 py-2"
                        style={{ borderTop: `1px solid ${BORDER}`, background: "hsl(43,89%,93%)", color: "hsl(43,89%,30%)" }}
                      >
                        <Calendar className="w-4 h-4 flex-shrink-0" />
                        Next: {format(new Date(overview.upcomingSession.scheduledAt), "MMM d, h:mm a")}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}

          {overviews?.length === 0 && (
            <div
              className="col-span-2 text-center py-16 rounded-2xl"
              style={{ background: "hsl(37,60%,97%)", border: `1.5px dashed ${BORDER}`, color: MUTED }}
            >
              No students assigned yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
