import { useAuth } from "../lib/auth";
import {
  useGetDashboardSummary,
  useListMoods,
  useCreateMood,
  getGetDashboardSummaryQueryKey,
  getListMoodsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Calendar, Clock, Loader2, TrendingUp, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const moodLabels = ["", "Struggling", "Low", "Okay", "Good", "Great"];
const moodColors = [
  "",
  "hsl(0, 65%, 52%)",
  "hsl(20, 70%, 52%)",
  "hsl(38, 65%, 47%)",
  "hsl(99, 45%, 38%)",
  "hsl(99, 57%, 28%)",
];
const moodBg = [
  "",
  "hsl(0, 65%, 96%)",
  "hsl(20, 70%, 95%)",
  "hsl(38, 65%, 94%)",
  "hsl(99, 45%, 93%)",
  "hsl(99, 57%, 91%)",
];

export default function StudentDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary(
    { studentId: user?.id },
    { query: { enabled: !!user?.id } }
  );

  const { data: moods, isLoading: isLoadingMoods } = useListMoods(
    { studentId: user?.id, limit: 5 },
    { query: { enabled: !!user?.id } }
  );

  const createMoodMutation = useCreateMood({
    mutation: {
      onSuccess: () => {
        toast({ title: "Mood logged", description: "Thank you for checking in today." });
        queryClient.invalidateQueries({ queryKey: getListMoodsQueryKey({ studentId: user?.id, limit: 5 }) });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey({ studentId: user?.id }) });
      },
    },
  });

  const handleMoodSubmit = (mood: number) => {
    if (!user?.id) return;
    createMoodMutation.mutate({ data: { studentId: user.id, mood } });
  };

  if (isLoadingSummary || isLoadingMoods) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "hsl(351, 57%, 35%)" }} />
      </div>
    );
  }

  const upcomingSession = summary?.recentSessions?.find((s) => s.status === "scheduled");

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Page header */}
      <div
        className="rounded-2xl p-7"
        style={{
          background: "linear-gradient(135deg, hsl(351, 57%, 30%) 0%, hsl(351, 57%, 40%) 100%)",
          boxShadow: "0 8px 24px rgba(139,38,53,0.25)",
        }}
      >
        <h1 className="text-3xl font-serif font-bold" style={{ color: "hsl(37, 86%, 96%)" }}>
          Welcome back, {user?.name?.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm" style={{ color: "hsl(355, 43%, 81%)" }}>
          Take a deep breath. You're in a safe space.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Sessions", value: summary?.totalSessions ?? 0, icon: Calendar, color: "hsl(351, 57%, 35%)", bg: "hsl(351, 57%, 96%)" },
          { label: "Upcoming", value: summary?.upcomingSessions ?? 0, icon: Clock, color: "hsl(38, 65%, 47%)", bg: "hsl(38, 65%, 95%)" },
          { label: "Completed", value: summary?.completedSessions ?? 0, icon: TrendingUp, color: "hsl(99, 57%, 20%)", bg: "hsl(99, 57%, 94%)" },
          {
            label: "Avg Mood",
            value: summary?.averageMood ? summary.averageMood.toFixed(1) : "—",
            icon: Heart,
            color: "hsl(355, 43%, 50%)",
            bg: "hsl(355, 43%, 95%)",
          },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card
            key={label}
            className="border-none shadow-sm"
            style={{ background: "hsl(38, 100%, 98%)", border: "1px solid hsl(35, 40%, 88%)" }}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "hsl(25, 40%, 50%)" }}>{label}</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: bg }}>
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
              </div>
              <div className="text-3xl font-serif font-bold" style={{ color: "hsl(25, 94%, 12%)" }}>{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Next session + mood tracker row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Next session */}
        <Card className="border-none shadow-md" style={{ background: "hsl(38, 100%, 98%)", border: "1px solid hsl(35, 40%, 88%)" }}>
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-xl" style={{ color: "hsl(25, 94%, 12%)" }}>Your Next Session</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingSession ? (
              <div
                className="rounded-xl p-5"
                style={{
                  background: "linear-gradient(135deg, hsl(351, 57%, 97%) 0%, hsl(355, 43%, 95%) 100%)",
                  border: "1px solid hsl(355, 43%, 88%)",
                }}
              >
                <h3 className="font-semibold text-base mb-3" style={{ color: "hsl(351, 57%, 30%)" }}>
                  {upcomingSession.topic || "Counselling Session"}
                </h3>
                <div className="space-y-1.5 text-sm" style={{ color: "hsl(25, 40%, 42%)" }}>
                  <p className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" style={{ color: "hsl(38, 65%, 47%)" }} />
                    {format(new Date(upcomingSession.scheduledAt), "EEEE, MMMM d, yyyy")}
                  </p>
                  <p className="flex items-center gap-2">
                    <Clock className="w-4 h-4" style={{ color: "hsl(38, 65%, 47%)" }} />
                    {format(new Date(upcomingSession.scheduledAt), "h:mm a")} ({upcomingSession.durationMinutes} min)
                  </p>
                </div>
                <div
                  className="mt-3 pt-3 text-xs font-semibold"
                  style={{ borderTop: "1px solid hsl(355, 43%, 85%)", color: "hsl(351, 57%, 40%)" }}
                >
                  with {upcomingSession.counsellor?.name}
                </div>
              </div>
            ) : (
              <div
                className="rounded-xl p-8 text-center"
                style={{ background: "hsl(37, 60%, 97%)", border: "1.5px dashed hsl(35, 40%, 82%)" }}
              >
                <p className="text-sm" style={{ color: "hsl(25, 40%, 55%)" }}>No upcoming sessions scheduled.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mood tracker */}
        <Card className="border-none shadow-md" style={{ background: "hsl(38, 100%, 98%)", border: "1px solid hsl(35, 40%, 88%)" }}>
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-xl" style={{ color: "hsl(25, 94%, 12%)" }}>How are you feeling today?</CardTitle>
            <CardDescription style={{ color: "hsl(25, 40%, 55%)" }}>Tap your mood to log a check-in</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between gap-2">
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  key={val}
                  onClick={() => handleMoodSubmit(val)}
                  disabled={createMoodMutation.isPending}
                  className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50"
                  style={{
                    background: moodBg[val],
                    border: `1.5px solid ${moodColors[val]}22`,
                  }}
                >
                  <span className="text-xl font-bold font-serif" style={{ color: moodColors[val] }}>{val}</span>
                  <span className="text-[10px] font-medium" style={{ color: moodColors[val] }}>{moodLabels[val]}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent moods */}
      <Card className="border-none shadow-md" style={{ background: "hsl(38, 100%, 98%)", border: "1px solid hsl(35, 40%, 88%)" }}>
        <CardHeader className="pb-3">
          <CardTitle className="font-serif text-xl" style={{ color: "hsl(25, 94%, 12%)" }}>Recent Mood History</CardTitle>
        </CardHeader>
        <CardContent>
          {moods?.length ? (
            <div className="space-y-2">
              {moods.map((mood) => (
                <div
                  key={mood.id}
                  className="flex items-center justify-between px-5 py-3 rounded-xl"
                  style={{ background: moodBg[mood.mood], border: `1px solid ${moodColors[mood.mood]}22` }}
                >
                  <span className="text-sm font-medium" style={{ color: "hsl(25, 40%, 42%)" }}>
                    {format(new Date(mood.createdAt), "MMM d, yyyy")}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm" style={{ color: moodColors[mood.mood] }}>{moodLabels[mood.mood]}</span>
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center font-bold font-serif text-sm"
                      style={{ background: moodColors[mood.mood], color: "white" }}
                    >
                      {mood.mood}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-center py-6" style={{ color: "hsl(25, 40%, 55%)" }}>No mood history yet. Log your first check-in above.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
