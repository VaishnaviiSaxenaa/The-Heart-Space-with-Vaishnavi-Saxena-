import { useState } from "react";
import { useAuth } from "../lib/auth";
import {
  useListSessions, useListUsers, useCreateSession, useUpdateSession,
  getListSessionsQueryKey, UpdateSessionBodyStatus,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { Loader2, Plus, Calendar, Clock, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";

const createSessionSchema = z.object({
  studentId: z.string().min(1, "Student is required"),
  scheduledAtDate: z.string().min(1, "Date is required"),
  scheduledAtTime: z.string().min(1, "Time is required"),
  durationMinutes: z.string().min(1, "Duration is required"),
  topic: z.string().optional(),
});

type CreateSessionValues = z.infer<typeof createSessionSchema>;

const statusConfig = {
  scheduled:  { label: "Scheduled",  bg: "hsl(38,65%,93%)",  text: "hsl(38,65%,38%)",  border: "hsl(38,65%,80%)"  },
  completed:  { label: "Completed",  bg: "hsl(99,57%,92%)",  text: "hsl(99,57%,22%)",  border: "hsl(99,57%,75%)"  },
  cancelled:  { label: "Cancelled",  bg: "hsl(0,65%,95%)",   text: "hsl(0,65%,42%)",   border: "hsl(0,65%,80%)"   },
};

export default function Sessions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: sessions, isLoading } = useListSessions(
    user?.role === "student" ? { studentId: user.id } : undefined,
    { query: { enabled: !!user?.id } }
  );

  const { data: students } = useListUsers(
    { role: "student" },
    { query: { enabled: user?.role === "counsellor" } }
  );

  const createMutation = useCreateSession({
    mutation: {
      onSuccess: () => {
        toast({ title: "Session scheduled successfully" });
        setIsCreateOpen(false);
        queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
      },
      onError: () => toast({ title: "Failed to schedule session", variant: "destructive" }),
    },
  });

  const updateMutation = useUpdateSession({
    mutation: {
      onSuccess: () => {
        toast({ title: "Session updated" });
        queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
      },
    },
  });

  const form = useForm<CreateSessionValues>({
    resolver: zodResolver(createSessionSchema),
    defaultValues: { studentId: "", scheduledAtDate: "", scheduledAtTime: "", durationMinutes: "60", topic: "" },
  });

  const onSubmitCreate = (values: CreateSessionValues) => {
    if (!user) return;
    createMutation.mutate({
      data: {
        studentId: parseInt(values.studentId),
        counsellorId: user.id,
        scheduledAt: new Date(`${values.scheduledAtDate}T${values.scheduledAtTime}`).toISOString(),
        durationMinutes: parseInt(values.durationMinutes),
        topic: values.topic,
      },
    });
  };

  const handleStatus = (id: number, status: UpdateSessionBodyStatus) => {
    updateMutation.mutate({ id, data: { status } });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "hsl(351,57%,35%)" }} />
      </div>
    );
  }

  const upcoming = sessions?.filter((s) => s.status === "scheduled") ?? [];
  const past = sessions?.filter((s) => s.status !== "scheduled") ?? [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex justify-between items-start gap-4">
        <div
          className="flex-1 rounded-2xl p-7"
          style={{
            background: "linear-gradient(135deg, hsl(351,57%,30%) 0%, hsl(351,57%,40%) 100%)",
            boxShadow: "0 8px 24px rgba(139,38,53,0.25)",
          }}
        >
          <h1 className="text-3xl font-serif font-bold" style={{ color: "hsl(37,86%,96%)" }}>Sessions</h1>
          <p className="mt-1 text-sm" style={{ color: "hsl(355,43%,81%)" }}>Your counselling schedule and history.</p>
        </div>

        {user?.role === "counsellor" && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button
                className="h-auto py-3 px-5 rounded-xl font-semibold flex items-center gap-2 shadow-md"
                style={{ background: "linear-gradient(135deg,hsl(38,65%,42%),hsl(38,65%,54%))", color: "hsl(37,86%,97%)", border: "none" }}
              >
                <Plus className="w-4 h-4" />
                Schedule
              </Button>
            </DialogTrigger>
            <DialogContent
              className="sm:max-w-md rounded-2xl"
              style={{ background: "hsl(38,100%,98%)", border: "1px solid hsl(35,40%,88%)" }}
            >
              <DialogHeader>
                <DialogTitle className="font-serif text-xl" style={{ color: "hsl(25,94%,12%)" }}>Schedule New Session</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitCreate)} className="space-y-4 mt-2">
                  <FormField control={form.control} name="studentId" render={({ field }) => (
                    <FormItem>
                      <FormLabel style={{ color: "hsl(25,60%,22%)" }}>Student</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger style={{ background: "hsl(37,86%,98%)", borderColor: "hsl(35,40%,86%)" }}>
                            <SelectValue placeholder="Select a student" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {students?.map((s) => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="scheduledAtDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel style={{ color: "hsl(25,60%,22%)" }}>Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} style={{ background: "hsl(37,86%,98%)", borderColor: "hsl(35,40%,86%)" }} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="scheduledAtTime" render={({ field }) => (
                      <FormItem>
                        <FormLabel style={{ color: "hsl(25,60%,22%)" }}>Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} style={{ background: "hsl(37,86%,98%)", borderColor: "hsl(35,40%,86%)" }} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="durationMinutes" render={({ field }) => (
                    <FormItem>
                      <FormLabel style={{ color: "hsl(25,60%,22%)" }}>Duration (minutes)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} style={{ background: "hsl(37,86%,98%)", borderColor: "hsl(35,40%,86%)" }} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="topic" render={({ field }) => (
                    <FormItem>
                      <FormLabel style={{ color: "hsl(25,60%,22%)" }}>Topic (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Initial Consultation" {...field} style={{ background: "hsl(37,86%,98%)", borderColor: "hsl(35,40%,86%)" }} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <DialogFooter className="pt-2">
                    <Button
                      type="submit"
                      disabled={createMutation.isPending}
                      className="w-full h-11 rounded-xl font-semibold"
                      style={{ background: "linear-gradient(135deg,hsl(38,65%,42%),hsl(38,65%,54%))", color: "hsl(37,86%,97%)", border: "none" }}
                    >
                      {createMutation.isPending ? "Scheduling…" : "Schedule Session"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <section>
          <h2 className="text-lg font-serif font-semibold mb-4" style={{ color: "hsl(25,94%,12%)" }}>Upcoming Sessions</h2>
          <div className="space-y-3">
            {upcoming.map((session) => <SessionCard key={session.id} session={session} user={user} onStatus={handleStatus} isPending={updateMutation.isPending} />)}
          </div>
        </section>
      )}

      {/* Past */}
      {past.length > 0 && (
        <section>
          <h2 className="text-lg font-serif font-semibold mb-4" style={{ color: "hsl(25,94%,12%)" }}>Past Sessions</h2>
          <div className="space-y-3">
            {past.map((session) => <SessionCard key={session.id} session={session} user={user} onStatus={handleStatus} isPending={updateMutation.isPending} />)}
          </div>
        </section>
      )}

      {sessions?.length === 0 && (
        <div
          className="text-center py-20 rounded-2xl"
          style={{ background: "hsl(37,60%,97%)", border: "1.5px dashed hsl(35,40%,82%)", color: "hsl(25,40%,55%)" }}
        >
          No sessions found.
        </div>
      )}
    </div>
  );
}

function SessionCard({ session, user, onStatus, isPending }: {
  session: any; user: any;
  onStatus: (id: number, s: UpdateSessionBodyStatus) => void;
  isPending: boolean;
}) {
  const cfg = statusConfig[session.status as keyof typeof statusConfig] ?? statusConfig.scheduled;

  return (
    <Card
      className="border-none shadow-sm overflow-hidden"
      style={{ background: "hsl(38,100%,98%)", border: "1px solid hsl(35,40%,88%)" }}
    >
      <div className="flex flex-col md:flex-row">
        {/* Date panel */}
        <div
          className="p-5 md:w-48 flex flex-col items-center justify-center text-center shrink-0"
          style={{
            background: session.status === "scheduled"
              ? "linear-gradient(135deg,hsl(351,57%,30%),hsl(351,57%,40%))"
              : "hsl(35,30%,93%)",
            borderRight: "1px solid hsl(35,40%,88%)",
          }}
        >
          <div
            className="text-xs font-semibold uppercase tracking-widest mb-0.5"
            style={{ color: session.status === "scheduled" ? "hsl(355,43%,80%)" : "hsl(25,40%,55%)" }}
          >
            {format(new Date(session.scheduledAt), "EEEE")}
          </div>
          <div
            className="text-3xl font-serif font-bold"
            style={{ color: session.status === "scheduled" ? "hsl(38,65%,72%)" : "hsl(25,50%,35%)" }}
          >
            {format(new Date(session.scheduledAt), "d")}
          </div>
          <div
            className="text-sm font-medium"
            style={{ color: session.status === "scheduled" ? "hsl(37,86%,90%)" : "hsl(25,40%,55%)" }}
          >
            {format(new Date(session.scheduledAt), "MMM yyyy")}
          </div>
          <div
            className="flex items-center gap-1 text-xs mt-2"
            style={{ color: session.status === "scheduled" ? "hsl(355,43%,75%)" : "hsl(25,40%,60%)" }}
          >
            <Clock className="w-3 h-3" />
            {format(new Date(session.scheduledAt), "h:mm a")}
          </div>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="font-serif text-lg font-semibold" style={{ color: "hsl(25,94%,12%)" }}>
                {session.topic || "Counselling Session"}
              </h3>
              <span
                className="flex-shrink-0 text-xs font-semibold px-3 py-1 rounded-full"
                style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}
              >
                {cfg.label}
              </span>
            </div>

            <p className="text-sm" style={{ color: "hsl(25,40%,50%)" }}>
              {user?.role === "counsellor"
                ? <>Student: <span style={{ color: "hsl(25,94%,12%)", fontWeight: 600 }}>{session.student?.name}</span></>
                : <>Counsellor: <span style={{ color: "hsl(25,94%,12%)", fontWeight: 600 }}>{session.counsellor?.name}</span></>}
            </p>

            <p className="text-xs mt-1" style={{ color: "hsl(25,40%,60%)" }}>
              {session.durationMinutes} minutes
            </p>

            {session.notes && (
              <div
                className="mt-3 p-3 rounded-lg text-sm italic"
                style={{ background: "hsl(355,43%,96%)", color: "hsl(351,40%,40%)", borderLeft: "3px solid hsl(355,43%,78%)" }}
              >
                {session.notes}
              </div>
            )}
          </div>

          {user?.role === "counsellor" && session.status === "scheduled" && (
            <div className="flex gap-2 mt-4 pt-4" style={{ borderTop: "1px solid hsl(35,40%,88%)" }}>
              <Button
                size="sm"
                onClick={() => onStatus(session.id, "completed")}
                disabled={isPending}
                className="rounded-lg font-medium text-xs flex items-center gap-1.5"
                style={{ background: "hsl(99,57%,92%)", color: "hsl(99,57%,22%)", border: "1px solid hsl(99,57%,78%)" }}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Mark Completed
              </Button>
              <Button
                size="sm"
                onClick={() => onStatus(session.id, "cancelled")}
                disabled={isPending}
                className="rounded-lg font-medium text-xs flex items-center gap-1.5"
                style={{ background: "hsl(0,65%,95%)", color: "hsl(0,65%,42%)", border: "1px solid hsl(0,65%,82%)" }}
              >
                <XCircle className="w-3.5 h-3.5" />
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
