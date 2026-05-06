import { useGetStudentsOverview, useGetDashboardSummary } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Calendar, Users, TrendingUp, Heart } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

const moodColors = ["", "hsl(0,65%,52%)", "hsl(20,70%,52%)", "hsl(38,65%,47%)", "hsl(99,45%,38%)", "hsl(99,57%,28%)"];
const moodBg    = ["", "hsl(0,65%,96%)", "hsl(20,70%,95%)", "hsl(38,65%,94%)", "hsl(99,45%,93%)", "hsl(99,57%,91%)"];
const moodLabels = ["", "Struggling", "Low", "Okay", "Good", "Great"];

export default function CounsellorDashboard() {
  const { data: overviews, isLoading } = useGetStudentsOverview();
  const { data: globalSummary } = useGetDashboardSummary({});

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "hsl(351, 57%, 35%)" }} />
      </div>
    );
  }

  const totalStudents = overviews?.length || 0;
  const upcoming = overviews?.filter((o) => o.upcomingSession).length || 0;
  const totalSessions = globalSummary?.totalSessions ?? 0;
  const lowMoodCount = overviews?.filter((o) => (o.latestMood ?? 3) <= 2).length || 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Hero header */}
      <div
        className="rounded-2xl p-7"
        style={{
          background: "linear-gradient(135deg, hsl(351, 57%, 30%) 0%, hsl(351, 57%, 40%) 100%)",
          boxShadow: "0 8px 24px rgba(139,38,53,0.25)",
        }}
      >
        <h1 className="text-3xl font-serif font-bold" style={{ color: "hsl(37, 86%, 96%)" }}>
          Counsellor Overview
        </h1>
        <p className="mt-1 text-sm" style={{ color: "hsl(355, 43%, 81%)" }}>
          A summary of your students and their recent activity.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Students",    value: totalStudents,  icon: Users,      color: "hsl(351,57%,35%)", bg: "hsl(351,57%,95%)" },
          { label: "Sessions Upcoming", value: upcoming,       icon: Calendar,   color: "hsl(38,65%,47%)",  bg: "hsl(38,65%,94%)"  },
          { label: "Total Sessions",    value: totalSessions,  icon: TrendingUp, color: "hsl(99,57%,20%)",  bg: "hsl(99,57%,93%)"  },
          { label: "Needs Support",     value: lowMoodCount,   icon: Heart,      color: "hsl(355,50%,50%)", bg: "hsl(355,43%,94%)" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="border-none shadow-sm" style={{ background: "hsl(38,100%,98%)", border: "1px solid hsl(35,40%,88%)" }}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "hsl(25,40%,50%)" }}>{label}</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: bg }}>
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
              </div>
              <div className="text-3xl font-serif font-bold" style={{ color: "hsl(25,94%,12%)" }}>{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Student grid */}
      <div>
        <h2 className="text-2xl font-serif font-semibold mb-5" style={{ color: "hsl(25, 94%, 12%)" }}>Your Students</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {overviews?.map((overview) => {
            const mood = overview.latestMood ?? null;
            return (
              <Link key={overview.student.id} href={`/sessions?studentId=${overview.student.id}`}>
                <Card
                  className="border-none shadow-sm cursor-pointer group transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
                  style={{ background: "hsl(38,100%,98%)", border: "1px solid hsl(35,40%,88%)" }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Avatar
                        className="h-12 w-12 ring-2"
                        style={{ ringColor: "hsl(351,57%,35%)" }}
                      >
                        <AvatarImage src={overview.student.avatarUrl || undefined} />
                        <AvatarFallback
                          className="font-semibold text-sm"
                          style={{ background: "hsl(351,57%,92%)", color: "hsl(351,57%,35%)" }}
                        >
                          {overview.student.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3
                            className="font-semibold text-base truncate transition-colors group-hover:text-[hsl(351,57%,35%)]"
                            style={{ color: "hsl(25,94%,12%)" }}
                          >
                            {overview.student.name}
                          </h3>
                          {mood !== null && (
                            <div
                              className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                              style={{ background: moodBg[mood], color: moodColors[mood] }}
                            >
                              <Heart className="w-3 h-3" />
                              {moodLabels[mood]}
                            </div>
                          )}
                        </div>

                        <div className="mt-2 space-y-1 text-sm" style={{ color: "hsl(25,40%,50%)" }}>
                          <p>{overview.totalSessions} session{overview.totalSessions !== 1 ? "s" : ""} total</p>
                          {overview.lastSession && (
                            <p>Last session: {format(new Date(overview.lastSession), "MMM d, yyyy")}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {overview.upcomingSession && (
                      <div
                        className="mt-4 pt-4 flex items-center gap-2 text-sm font-medium rounded-lg px-3 py-2"
                        style={{
                          borderTop: "1px solid hsl(35,40%,88%)",
                          background: "hsl(38,65%,95%)",
                          color: "hsl(38,65%,40%)",
                        }}
                      >
                        <Calendar className="w-4 h-4 flex-shrink-0" />
                        <span>Next: {format(new Date(overview.upcomingSession.scheduledAt), "MMM d, h:mm a")}</span>
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
              style={{ background: "hsl(37,60%,97%)", border: "1.5px dashed hsl(35,40%,82%)", color: "hsl(25,40%,55%)" }}
            >
              No students assigned yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
