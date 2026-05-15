import { useState } from "react";
import { useAuth } from "../lib/auth";
import {
  useListSessions, useListUsers, useCreateSession, useUpdateSession,
  getListSessionsQueryKey, UpdateSessionBodyStatus,
} from "../lib/api-client-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { Loader2, Plus, Clock, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";

const CREAM    = "#FAF7F2";
const CHARCOAL = "#3D3530";
const GOLD     = "#E6A756";
const CARD     = "#F3EDE6";
const MUTED    = "#8C7B70";
const BORDER   = "#D8CFC4";
const SAGE     = "#A8BFA3";
const OLIVE    = "#6E8B6B";
const SIDEBAR  = "#5C3D2E";

const STATUS_CFG = {
  scheduled: { label: "Scheduled", bg: `${GOLD}22`,  text: "#8A5A10",  border: `${GOLD}55` },
  completed:  { label: "Completed", bg: "#DFF0DA",    text: "#2A5020",  border: `${OLIVE}55` },
  cancelled:  { label: "Cancelled", bg: "#EDE4D8",    text: "#7A5A40",  border: "#C8B8A8" },
};

const schema = z.object({
  studentId: z.string().min(1, "Student is required"),
  scheduledAtDate: z.string().min(1, "Date is required"),
  scheduledAtTime: z.string().min(1, "Time is required"),
  durationMinutes: z.string().min(1, "Duration is required"),
  topic: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

function SCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl overflow-hidden ${className}`}
      style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: "0 2px 8px rgba(61,53,48,.06)" }}>
      {children}
    </div>
  );
}

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
      onSuccess: () => { toast({ title: "Session scheduled ✓" }); setOpen(false); qc.invalidateQueries({ queryKey: getListSessionsQueryKey() }); },
      onError: () => toast({ title: "Failed to schedule", variant: "destructive" }),
    },
  });
  const updateMutation = useUpdateSession({
    mutation: { onSuccess: () => { toast({ title: "Updated" }); qc.invalidateQueries({ queryKey: getListSessionsQueryKey() }); } },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { studentId: "", scheduledAtDate: "", scheduledAtTime: "", durationMinutes: "60", topic: "" },
  });

  const onSubmit = (v: FormValues) => {
    if (!user) return;
    createMutation.mutate({
      data: {
        studentId: parseInt(v.studentId), counsellorId: user.id,
        scheduledAt: new Date(`${v.scheduledAtDate}T${v.scheduledAtTime}`).toISOString(),
        durationMinutes: parseInt(v.durationMinutes), topic: v.topic,
      },
    });
  };

  if (isLoading) return (
    <div className="flex justify-center items-center h-64">
      <Loader2 className="w-7 h-7 animate-spin" style={{ color: GOLD }} />
    </div>
  );

  const upcoming = sessions?.filter((s) => s.status === "scheduled") ?? [];
  const past     = sessions?.filter((s) => s.status !== "scheduled") ?? [];

  return (
    <div className="space-y-7 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex items-start gap-4 justify-between flex-wrap">
        <div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold" style={{ color: CHARCOAL }}>Sessions</h1>
          <p className="mt-1.5 text-sm" style={{ color: MUTED }}>Your counselling schedule and history.</p>
        </div>

        {user?.role === "counsellor" && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02] shadow-md"
                style={{ background: `linear-gradient(135deg, #C8922A 0%, ${GOLD} 100%)`, color: CREAM }}>
                <Plus className="w-4 h-4" />Schedule
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-2xl" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <DialogHeader>
                <DialogTitle className="font-serif text-xl" style={{ color: CHARCOAL }}>Schedule New Session</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
                  <FormField control={form.control} name="studentId" render={({ field }) => (
                    <FormItem>
                      <FormLabel style={{ color: SIDEBAR }}>Student</FormLabel>
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
                  <div className="grid grid-cols-2 gap-3">
                    {(["scheduledAtDate", "scheduledAtTime"] as const).map((name) => (
                      <FormField key={name} control={form.control} name={name} render={({ field }) => (
                        <FormItem>
                          <FormLabel style={{ color: SIDEBAR }}>{name === "scheduledAtDate" ? "Date" : "Time"}</FormLabel>
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
                      <FormLabel style={{ color: SIDEBAR }}>Duration (minutes)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} style={{ background: CREAM, borderColor: BORDER }} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="topic" render={({ field }) => (
                    <FormItem>
                      <FormLabel style={{ color: SIDEBAR }}>Topic (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Initial Consultation" {...field} style={{ background: CREAM, borderColor: BORDER }} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <DialogFooter className="pt-2">
                    <button type="submit" disabled={createMutation.isPending}
                      className="w-full h-11 rounded-xl font-semibold text-sm disabled:opacity-50"
                      style={{ background: `linear-gradient(135deg, #C8922A 0%, ${GOLD} 100%)`, color: CREAM }}>
                      {createMutation.isPending ? "Scheduling…" : "Schedule Session"}
                    </button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Sessions list */}
      {upcoming.length > 0 && (
        <section>
          <h2 className="font-serif text-lg font-semibold mb-4" style={{ color: CHARCOAL }}>Upcoming</h2>
          <div className="space-y-3">
            {upcoming.map((s) => <SessionCard key={s.id} session={s} user={user}
              onStatus={(id, st) => updateMutation.mutate({ id, data: { status: st } })}
              isPending={updateMutation.isPending} />)}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="font-serif text-lg font-semibold mb-4" style={{ color: CHARCOAL }}>Past</h2>
          <div className="space-y-3">
            {past.map((s) => <SessionCard key={s.id} session={s} user={user}
              onStatus={(id, st) => updateMutation.mutate({ id, data: { status: st } })}
              isPending={updateMutation.isPending} />)}
          </div>
        </section>
      )}

      {sessions?.length === 0 && (
        <div className="text-center py-20 rounded-2xl"
          style={{ background: CREAM, border: `1.5px dashed ${BORDER}`, color: MUTED }}>
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
  const cfg = STATUS_CFG[session.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.scheduled;
  const isUpcoming = session.status === "scheduled";

  return (
    <div className="rounded-2xl overflow-hidden flex flex-col md:flex-row"
      style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: "0 2px 8px rgba(61,53,48,.06)" }}>
      {/* Date panel */}
      <div
        className="p-5 md:w-40 flex flex-col items-center justify-center text-center flex-shrink-0"
        style={{
          background: isUpcoming ? `linear-gradient(160deg, ${SIDEBAR} 0%, #3A2518 100%)` : "#EDE4D8",
          borderRight: `1px solid ${BORDER}`,
        }}
      >
        <div className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: isUpcoming ? "rgba(250,247,242,.55)" : MUTED }}>
          {format(new Date(session.scheduledAt), "EEEE")}
        </div>
        <div className="text-4xl font-serif font-bold my-0.5"
          style={{ color: isUpcoming ? GOLD : "#8C7B70" }}>
          {format(new Date(session.scheduledAt), "d")}
        </div>
        <div className="text-xs" style={{ color: isUpcoming ? "rgba(250,247,242,.7)" : MUTED }}>
          {format(new Date(session.scheduledAt), "MMM yyyy")}
        </div>
        <div className="flex items-center gap-1 text-[11px] mt-1.5"
          style={{ color: isUpcoming ? "rgba(250,247,242,.45)" : MUTED }}>
          <Clock className="w-3 h-3" />{format(new Date(session.scheduledAt), "h:mm a")}
        </div>
      </div>

      {/* Body */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="font-serif text-lg font-semibold" style={{ color: CHARCOAL }}>
              {session.topic || "Counselling Session"}
            </h3>
            <span className="flex-shrink-0 text-xs font-semibold px-3 py-1 rounded-full"
              style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}>
              {cfg.label}
            </span>
          </div>
          <p className="text-sm" style={{ color: MUTED }}>
            {user?.role === "counsellor"
              ? <>Student: <span style={{ color: CHARCOAL, fontWeight: 600 }}>{session.student?.name}</span></>
              : <>Counsellor: <span style={{ color: CHARCOAL, fontWeight: 600 }}>{session.counsellor?.name}</span></>}
            <span className="mx-2">·</span>
            <span>{session.durationMinutes} min</span>
          </p>
          {session.notes && (
            <div className="mt-3 p-3 rounded-xl text-sm italic"
              style={{ background: `${GOLD}12`, color: "#7A5520", borderLeft: `3px solid ${GOLD}66` }}>
              {session.notes}
            </div>
          )}
        </div>

        {user?.role === "counsellor" && session.status === "scheduled" && (
          <div className="flex gap-2 mt-4 pt-4" style={{ borderTop: `1px solid ${BORDER}` }}>
            <button onClick={() => onStatus(session.id, "completed")} disabled={isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold disabled:opacity-50 transition-all hover:scale-[1.02]"
              style={{ background: "#DFF0DA", color: "#2A5020", border: `1px solid ${OLIVE}55` }}>
              <CheckCircle className="w-3.5 h-3.5" />Mark Completed
            </button>
            <button onClick={() => onStatus(session.id, "cancelled")} disabled={isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold disabled:opacity-50 transition-all hover:scale-[1.02]"
              style={{ background: "#EDE4D8", color: "#7A5A40", border: `1px solid #C8B8A8` }}>
              <XCircle className="w-3.5 h-3.5" />Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
