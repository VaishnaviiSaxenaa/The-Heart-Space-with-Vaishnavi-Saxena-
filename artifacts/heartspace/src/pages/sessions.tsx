import { useState } from "react";
import { useAuth } from "../lib/auth";
import {
  useListSessions, useListUsers, useCreateSession, useUpdateSession,
  getListSessionsQueryKey, UpdateSessionBodyStatus,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

/* Brand tokens */
const BROWN   = "hsl(20, 33%, 27%)";
const BROWN_D = "hsl(20, 33%, 20%)";
const GOLD    = "hsl(43, 89%, 38%)";
const DUST    = "hsl(27, 46%, 59%)";
const IVORY   = "hsl(38, 78%, 95%)";
const TEXT    = "hsl(15, 47%, 12%)";
const MUTED   = "hsl(20, 20%, 45%)";
const BORDER  = "hsl(32, 35%, 86%)";
const CREAM   = "hsl(37, 86%, 96%)";

const STATUS = {
  scheduled: { label: "Scheduled", bg: "hsl(43,89%,91%)", text: "hsl(43,89%,30%)", border: "hsl(43,89%,78%)" },
  completed:  { label: "Completed", bg: "hsl(99,57%,91%)", text: "hsl(99,57%,22%)", border: "hsl(99,57%,72%)" },
  cancelled:  { label: "Cancelled", bg: "hsl(25,40%,93%)", text: "hsl(25,40%,38%)", border: "hsl(25,40%,78%)" },
};

const schema = z.object({
  studentId: z.string().min(1, "Student is required"),
  scheduledAtDate: z.string().min(1, "Date is required"),
  scheduledAtTime: z.string().min(1, "Time is required"),
  durationMinutes: z.string().min(1, "Duration is required"),
  topic: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function Sessions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: sessions, isLoading } = useListSessions(
    user?.role === "student" ? { studentId: user.id } : undefined,
    { query: { enabled: !!user?.id } }
  );
  const { data: students } = useListUsers(
    { role: "student" }, { query: { enabled: user?.role === "counsellor" } }
  );

  const createMutation = useCreateSession({
    mutation: {
      onSuccess: () => { toast({ title: "Session scheduled" }); setOpen(false); qc.invalidateQueries({ queryKey: getListSessionsQueryKey() }); },
      onError: () => toast({ title: "Failed to schedule session", variant: "destructive" }),
    },
  });
  const updateMutation = useUpdateSession({
    mutation: { onSuccess: () => { toast({ title: "Session updated" }); qc.invalidateQueries({ queryKey: getListSessionsQueryKey() }); } },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { studentId: "", scheduledAtDate: "", scheduledAtTime: "", durationMinutes: "60", topic: "" },
  });

  const onSubmit = (v: FormValues) => {
    if (!user) return;
    createMutation.mutate({
      data: {
        studentId: parseInt(v.studentId),
        counsellorId: user.id,
        scheduledAt: new Date(`${v.scheduledAtDate}T${v.scheduledAtTime}`).toISOString(),
        durationMinutes: parseInt(v.durationMinutes),
        topic: v.topic,
      },
    });
  };

  if (isLoading) return (
    <div className="flex justify-center items-center h-64">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
    </div>
  );

  const upcoming = sessions?.filter((s) => s.status === "scheduled") ?? [];
  const past      = sessions?.filter((s) => s.status !== "scheduled") ?? [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex items-start gap-4">
        <div
          className="flex-1 rounded-2xl p-7"
          style={{ background: `linear-gradient(135deg, ${BROWN_D} 0%, ${BROWN} 100%)`, boxShadow: "0 8px 24px rgba(44,24,16,0.22)" }}
        >
          <h1 className="text-3xl font-serif font-bold" style={{ color: "hsl(37,86%,96%)" }}>Sessions</h1>
          <p className="mt-1 text-sm" style={{ color: DUST }}>Your counselling schedule and history.</p>
        </div>

        {user?.role === "counsellor" && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                className="h-auto py-3 px-5 rounded-xl font-semibold flex items-center gap-2 shadow-md flex-shrink-0 mt-1"
                style={{ background: `linear-gradient(135deg, hsl(43,89%,32%) 0%, hsl(43,85%,44%) 100%)`, color: "hsl(37,86%,97%)", border: "none" }}
              >
                <Plus className="w-4 h-4" />Schedule
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-2xl" style={{ background: IVORY, border: `1px solid ${BORDER}` }}>
              <DialogHeader>
                <DialogTitle className="font-serif text-xl" style={{ color: TEXT }}>Schedule New Session</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
                  <FormField control={form.control} name="studentId" render={({ field }) => (
                    <FormItem>
                      <FormLabel style={{ color: BROWN }}>Student</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger style={{ background: CREAM, borderColor: BORDER }}>
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
                    {(["scheduledAtDate", "scheduledAtTime"] as const).map((name) => (
                      <FormField key={name} control={form.control} name={name} render={({ field }) => (
                        <FormItem>
                          <FormLabel style={{ color: BROWN }}>{name === "scheduledAtDate" ? "Date" : "Time"}</FormLabel>
                          <FormControl>
                            <Input type={name === "scheduledAtDate" ? "date" : "time"} {...field}
                              style={{ background: CREAM, borderColor: BORDER }} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    ))}
                  </div>
                  <FormField control={form.control} name="durationMinutes" render={({ field }) => (
                    <FormItem>
                      <FormLabel style={{ color: BROWN }}>Duration (minutes)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} style={{ background: CREAM, borderColor: BORDER }} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="topic" render={({ field }) => (
                    <FormItem>
                      <FormLabel style={{ color: BROWN }}>Topic (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Initial Consultation" {...field} style={{ background: CREAM, borderColor: BORDER }} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <DialogFooter className="pt-2">
                    <Button type="submit" disabled={createMutation.isPending} className="w-full h-11 rounded-xl font-semibold"
                      style={{ background: `linear-gradient(135deg, hsl(43,89%,32%) 0%, hsl(43,85%,44%) 100%)`, color: "hsl(37,86%,97%)", border: "none" }}>
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
          <h2 className="text-lg font-serif font-semibold mb-4" style={{ color: TEXT }}>Upcoming Sessions</h2>
          <div className="space-y-3">
            {upcoming.map((s) => (
              <SessionCard key={s.id} session={s} user={user}
                onStatus={(id, st) => updateMutation.mutate({ id, data: { status: st } })}
                isPending={updateMutation.isPending} />
            ))}
          </div>
        </section>
      )}

      {/* Past */}
      {past.length > 0 && (
        <section>
          <h2 className="text-lg font-serif font-semibold mb-4" style={{ color: TEXT }}>Past Sessions</h2>
          <div className="space-y-3">
            {past.map((s) => (
              <SessionCard key={s.id} session={s} user={user}
                onStatus={(id, st) => updateMutation.mutate({ id, data: { status: st } })}
                isPending={updateMutation.isPending} />
            ))}
          </div>
        </section>
      )}

      {sessions?.length === 0 && (
        <div className="text-center py-20 rounded-2xl"
          style={{ background: "hsl(37,60%,97%)", border: `1.5px dashed ${BORDER}`, color: MUTED }}>
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
  const cfg = STATUS[session.status as keyof typeof STATUS] ?? STATUS.scheduled;
  const isUpcoming = session.status === "scheduled";

  const BROWN   = "hsl(20, 33%, 27%)";
  const BROWN_D = "hsl(20, 33%, 20%)";
  const GOLD    = "hsl(43, 89%, 38%)";
  const IVORY   = "hsl(38, 78%, 95%)";
  const TEXT    = "hsl(15, 47%, 12%)";
  const MUTED   = "hsl(20, 20%, 45%)";
  const BORDER  = "hsl(32, 35%, 86%)";

  return (
    <Card className="border-none shadow-sm overflow-hidden" style={{ background: IVORY, border: `1px solid ${BORDER}` }}>
      <div className="flex flex-col md:flex-row">
        {/* Date panel */}
        <div
          className="p-5 md:w-44 flex flex-col items-center justify-center text-center shrink-0"
          style={{
            background: isUpcoming
              ? `linear-gradient(135deg, ${BROWN_D} 0%, ${BROWN} 100%)`
              : "hsl(35,25%,92%)",
            borderRight: `1px solid ${BORDER}`,
          }}
        >
          <div className="text-xs font-semibold uppercase tracking-widest mb-0.5"
            style={{ color: isUpcoming ? "rgba(253,246,236,0.65)" : MUTED }}>
            {format(new Date(session.scheduledAt), "EEEE")}
          </div>
          <div className="text-3xl font-serif font-bold"
            style={{ color: isUpcoming ? "hsl(43,80%,70%)" : "hsl(20,33%,40%)" }}>
            {format(new Date(session.scheduledAt), "d")}
          </div>
          <div className="text-sm font-medium"
            style={{ color: isUpcoming ? "rgba(253,246,236,0.85)" : MUTED }}>
            {format(new Date(session.scheduledAt), "MMM yyyy")}
          </div>
          <div className="flex items-center gap-1 text-xs mt-2"
            style={{ color: isUpcoming ? "rgba(253,246,236,0.55)" : MUTED }}>
            <Clock className="w-3 h-3" />
            {format(new Date(session.scheduledAt), "h:mm a")}
          </div>
        </div>

        {/* Body */}
        <div className="p-5 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="font-serif text-lg font-semibold" style={{ color: TEXT }}>
                {session.topic || "Counselling Session"}
              </h3>
              <span className="flex-shrink-0 text-xs font-semibold px-3 py-1 rounded-full"
                style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}>
                {cfg.label}
              </span>
            </div>
            <p className="text-sm" style={{ color: MUTED }}>
              {user?.role === "counsellor"
                ? <>Student: <span style={{ color: TEXT, fontWeight: 600 }}>{session.student?.name}</span></>
                : <>Counsellor: <span style={{ color: TEXT, fontWeight: 600 }}>{session.counsellor?.name}</span></>}
            </p>
            <p className="text-xs mt-1" style={{ color: MUTED }}>{session.durationMinutes} minutes</p>
            {session.notes && (
              <div className="mt-3 p-3 rounded-lg text-sm italic"
                style={{ background: "hsl(27,46%,94%)", color: "hsl(27,40%,38%)", borderLeft: "3px solid hsl(27,46%,72%)" }}>
                {session.notes}
              </div>
            )}
          </div>

          {user?.role === "counsellor" && session.status === "scheduled" && (
            <div className="flex gap-2 mt-4 pt-4" style={{ borderTop: `1px solid ${BORDER}` }}>
              <Button size="sm" onClick={() => onStatus(session.id, "completed")} disabled={isPending}
                className="rounded-lg font-medium text-xs flex items-center gap-1.5"
                style={{ background: "hsl(99,57%,91%)", color: "hsl(99,57%,22%)", border: "1px solid hsl(99,57%,75%)" }}>
                <CheckCircle className="w-3.5 h-3.5" />Mark Completed
              </Button>
              <Button size="sm" onClick={() => onStatus(session.id, "cancelled")} disabled={isPending}
                className="rounded-lg font-medium text-xs flex items-center gap-1.5"
                style={{ background: "hsl(25,40%,93%)", color: "hsl(25,40%,36%)", border: "1px solid hsl(25,40%,76%)" }}>
                <XCircle className="w-3.5 h-3.5" />Cancel
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
