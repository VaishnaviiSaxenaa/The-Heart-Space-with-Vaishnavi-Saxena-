import { useAuth } from "../lib/auth";
import { useGetDashboardSummary, useListMoods, useCreateMood, getGetDashboardSummaryQueryKey, getListMoodsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Calendar, Clock, Smile, Frown, Meh, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

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
        toast({ title: "Mood logged", description: "Thank you for checking in." });
        queryClient.invalidateQueries({ queryKey: getListMoodsQueryKey({ studentId: user?.id, limit: 5 }) });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey({ studentId: user?.id }) });
      }
    }
  });

  const handleMoodSubmit = (mood: number) => {
    if (!user?.id) return;
    createMoodMutation.mutate({ data: { studentId: user.id, mood } });
  };

  const getMoodIcon = (moodValue: number, className?: string) => {
    if (moodValue >= 4) return <Smile className={className} />;
    if (moodValue === 3) return <Meh className={className} />;
    return <Frown className={className} />;
  };

  if (isLoadingSummary || isLoadingMoods) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const upcomingSession = summary?.recentSessions?.find(s => s.status === "scheduled");

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-serif font-semibold text-foreground">Welcome back, {user?.name?.split(' ')[0]}</h1>
        <p className="text-muted-foreground mt-2">Take a deep breath. You're in a safe space.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1 md:col-span-2 bg-card border-none shadow-sm">
          <CardHeader>
            <CardTitle className="font-serif text-xl">Your Next Session</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingSession ? (
              <div className="bg-background rounded-2xl p-6 border border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="font-medium text-lg mb-1">{upcomingSession.topic || "Counselling Session"}</h3>
                  <p className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> {format(new Date(upcomingSession.scheduledAt), "EEEE, MMMM d, yyyy")}
                  </p>
                  <p className="text-muted-foreground flex items-center gap-2 mt-1">
                    <Clock className="w-4 h-4" /> {format(new Date(upcomingSession.scheduledAt), "h:mm a")} ({upcomingSession.durationMinutes} min)
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-primary">with {upcomingSession.counsellor?.name}</p>
                </div>
              </div>
            ) : (
              <div className="bg-background/50 rounded-2xl p-8 border border-dashed border-border text-center">
                <p className="text-muted-foreground mb-4">You have no upcoming sessions scheduled.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-none shadow-sm">
          <CardHeader>
            <CardTitle className="font-serif text-xl">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-background rounded-xl">
              <span className="text-muted-foreground">Total Sessions</span>
              <span className="font-semibold text-xl">{summary?.totalSessions || 0}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-background rounded-xl">
              <span className="text-muted-foreground">Average Mood</span>
              <span className="font-semibold text-xl flex items-center gap-1">
                {summary?.averageMood ? summary.averageMood.toFixed(1) : '-'} 
                {summary?.averageMood && getMoodIcon(summary.averageMood, "w-5 h-5 text-primary")}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card border-none shadow-sm">
          <CardHeader>
            <CardTitle className="font-serif text-xl">How are you feeling today?</CardTitle>
            <CardDescription>Select a number from 1 to 5</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center bg-background p-6 rounded-2xl">
              {[1, 2, 3, 4, 5].map((val) => (
                <Button
                  key={val}
                  variant="outline"
                  className="w-12 h-12 rounded-full flex flex-col items-center justify-center hover:bg-primary/10 hover:text-primary border-border bg-card transition-all"
                  onClick={() => handleMoodSubmit(val)}
                  disabled={createMoodMutation.isPending}
                >
                  {val}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-none shadow-sm">
          <CardHeader>
            <CardTitle className="font-serif text-xl">Recent Moods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {moods?.length ? moods.map((mood) => (
                <div key={mood.id} className="flex justify-between items-center p-3 bg-background rounded-xl">
                  <span className="text-sm text-muted-foreground">{format(new Date(mood.createdAt), "MMM d")}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{mood.mood}/5</span>
                    {getMoodIcon(mood.mood, "w-4 h-4 text-primary")}
                  </div>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground text-center py-4">No recent moods logged.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
