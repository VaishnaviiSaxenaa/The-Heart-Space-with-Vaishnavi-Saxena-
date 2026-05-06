import { useAuth } from "../lib/auth";
import {
  useGetDashboardSummary, useListMoods, useCreateMood,
  getGetDashboardSummaryQueryKey, getListMoodsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format } from "date-fns";
import { Calendar, Clock, Loader2, TrendingUp, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

/* Brand tokens */
const BROWN   = "hsl(20, 33%, 27%)";
const BROWN_D = "hsl(20, 33%, 20%)";
const GOLD    = "hsl(43, 89%, 38%)";
const DUST    = "hsl(27, 46%, 59%)";
const IVORY   = "hsl(38, 78%, 95%)";
const TEXT    = "hsl(15, 47%, 12%)";
const MUTED   = "hsl(20, 20%, 45%)";
const BORDER  = "hsl(32, 35%, 86%)";

/* Mood scale — warm ambers → greens, no reds */
const moodLabel = ["", "Very Low", "Low", "Okay", "Good", "Great"];
const moodColor = ["", "hsl(25,70%,48%)", "hsl(35,75%,46%)", "hsl(43,89%,38%)", "hsl(99,45%,35%)", "hsl(99,57%,26%)"];
const moodBg    = ["", "hsl(25,70%,94%)", "hsl(35,75%,93%)", "hsl(43,89%,93%)", "hsl(99,45%,92%)", "hsl(99,57%,91%)"];

export default function StudentDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: summary, isLoading: loadS } = useGetDashboardSummary(
    { studentId: user?.id }, { query: { enabled: !!user?.id } }
  );
  const { data: moods, isLoading: loadM } = useListMoods(
    { studentId: user?.id, limit: 5 }, { query: { enabled: !!user?.id } }
  );
  const moodMutation = useCreateMood({
    mutation: {
      onSuccess: () => {
        toast({ title: "Mood logged", description: "Thank you for checking in today." });
        qc.invalidateQueries({ queryKey: getListMoodsQueryKey({ studentId: user?.id, limit: 5 }) });
        qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey({ studentId: user?.id }) });
      },
    },
  });

  if (loadS || loadM) return (
    <div className="flex justify-center items-center h-64">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
    </div>
  );

  const upcoming = summary?.recentSessions?.find((s) => s.status === "scheduled");

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* Hero banner */}
      <div className="rounded-2xl p-7" style={{
        background: `linear-gradient(135deg, ${BROWN_D} 0%, ${BROWN} 100%)`,
        boxShadow: "0 8px 24px rgba(44,24,16,0.22)",
      }}>
        <h1 className="text-3xl font-serif font-bold" style={{ color: "hsl(37,86%,96%)" }}>
          Welcome back, {user?.name?.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm" style={{ color: DUST }}>Take a deep breath. You're in a safe space.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Sessions",  value: summary?.totalSessions ?? 0,  Icon: Calendar,   ic: BROWN, ibg: "hsl(20,33%,92%)" },
          { label: "Upcoming",        value: summary?.upcomingSessions ?? 0, Icon: Clock,     ic: GOLD,  ibg: "hsl(43,89%,92%)" },
          { label: "Completed",       value: summary?.completedSessions ?? 0, Icon: TrendingUp, ic: "hsl(99,57%,26%)", ibg: "hsl(99,57%,91%)" },
          { label: "Avg Mood",        value: summary?.averageMood ? summary.averageMood.toFixed(1) : "—", Icon: Heart, ic: DUST, ibg: "hsl(27,46%,92%)" },
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

      {/* Next session + mood tracker */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Next session */}
        <Card className="border-none shadow-sm" style={{ background: IVORY, border: `1px solid ${BORDER}` }}>
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-xl" style={{ color: TEXT }}>Your Next Session</CardTitle>
          </CardHeader>
          <CardContent>
            {upcoming ? (
              <div className="rounded-xl p-5" style={{
                background: `linear-gradient(135deg, hsl(37,60%,97%) 0%, hsl(27,46%,95%) 100%)`,
                border: `1px solid hsl(27,46%,85%)`,
              }}>
                <h3 className="font-semibold text-base mb-3" style={{ color: BROWN }}>
                  {upcoming.topic || "Counselling Session"}
                </h3>
                <div className="space-y-1.5 text-sm" style={{ color: MUTED }}>
                  <p className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" style={{ color: GOLD }} />
                    {format(new Date(upcoming.scheduledAt), "EEEE, MMMM d, yyyy")}
                  </p>
                  <p className="flex items-center gap-2">
                    <Clock className="w-4 h-4" style={{ color: GOLD }} />
                    {format(new Date(upcoming.scheduledAt), "h:mm a")} ({upcoming.durationMinutes} min)
                  </p>
                </div>
                <div className="mt-3 pt-3 text-xs font-semibold" style={{ borderTop: `1px solid hsl(27,46%,82%)`, color: BROWN }}>
                  with {upcoming.counsellor?.name}
                </div>
              </div>
            ) : (
              <div className="rounded-xl p-8 text-center" style={{
                background: "hsl(37,60%,97%)", border: `1.5px dashed ${BORDER}`,
              }}>
                <p className="text-sm" style={{ color: MUTED }}>No upcoming sessions scheduled.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mood tracker */}
        <Card className="border-none shadow-sm" style={{ background: IVORY, border: `1px solid ${BORDER}` }}>
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-xl" style={{ color: TEXT }}>How are you feeling today?</CardTitle>
            <CardDescription style={{ color: MUTED }}>Tap your mood to log a check-in</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between gap-2">
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  key={val}
                  onClick={() => user?.id && moodMutation.mutate({ data: { studentId: user.id, mood: val } })}
                  disabled={moodMutation.isPending}
                  className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50"
                  style={{ background: moodBg[val], border: `1.5px solid ${moodColor[val]}33` }}
                >
                  <span className="text-xl font-bold font-serif" style={{ color: moodColor[val] }}>{val}</span>
                  <span className="text-[10px] font-medium leading-tight text-center" style={{ color: moodColor[val] }}>{moodLabel[val]}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mood history */}
      <Card className="border-none shadow-sm" style={{ background: IVORY, border: `1px solid ${BORDER}` }}>
        <CardHeader className="pb-3">
          <CardTitle className="font-serif text-xl" style={{ color: TEXT }}>Recent Mood History</CardTitle>
        </CardHeader>
        <CardContent>
          {moods?.length ? (
            <div className="space-y-2">
              {moods.map((m) => (
                <div key={m.id} className="flex items-center justify-between px-5 py-3 rounded-xl"
                  style={{ background: moodBg[m.mood], border: `1px solid ${moodColor[m.mood]}22` }}>
                  <span className="text-sm font-medium" style={{ color: MUTED }}>
                    {format(new Date(m.createdAt), "MMM d, yyyy")}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm" style={{ color: moodColor[m.mood] }}>{moodLabel[m.mood]}</span>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold font-serif text-sm"
                      style={{ background: moodColor[m.mood], color: "white" }}>
                      {m.mood}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-center py-6" style={{ color: MUTED }}>
              No mood history yet. Log your first check-in above.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
