import { useGetStudentsOverview } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Calendar } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

export default function CounsellorDashboard() {
  const { data: overviews, isLoading } = useGetStudentsOverview();

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const activeStudents = overviews?.length || 0;
  const sessionsThisWeek = overviews?.filter(o => o.upcomingSession).length || 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-serif font-semibold text-foreground">Counsellor Overview</h1>
        <p className="text-muted-foreground mt-2">Here is a summary of your students and their recent activity.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-serif">{activeStudents}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sessions This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-serif">{sessionsThisWeek}</div>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-2xl font-serif font-semibold mt-8 mb-4">Your Students</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {overviews?.map((overview) => (
          <Link key={overview.student.id} href={`/sessions?studentId=${overview.student.id}`}>
            <Card className="bg-card border-border hover:shadow-md transition-all cursor-pointer group">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12 border border-primary/20">
                    <AvatarImage src={overview.student.avatarUrl || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {overview.student.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-medium text-lg group-hover:text-primary transition-colors">{overview.student.name}</h3>
                    <div className="text-sm text-muted-foreground mt-1 space-y-1">
                      <p>Total Sessions: {overview.totalSessions}</p>
                      {overview.lastSession && <p>Last: {format(new Date(overview.lastSession), "MMM d, yyyy")}</p>}
                      {overview.latestMood !== null && overview.latestMood !== undefined && (
                        <p>Latest Mood: <span className="font-medium text-foreground">{overview.latestMood}/5</span></p>
                      )}
                    </div>
                  </div>
                </div>
                {overview.upcomingSession && (
                  <div className="mt-4 pt-4 border-t border-border flex items-center gap-2 text-sm text-primary">
                    <Calendar className="w-4 h-4" />
                    <span>Next: {format(new Date(overview.upcomingSession.scheduledAt), "MMM d, h:mm a")}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
        {overviews?.length === 0 && (
          <div className="col-span-2 text-center py-12 text-muted-foreground bg-card rounded-2xl border border-dashed">
            No students found.
          </div>
        )}
      </div>
    </div>
  );
}
