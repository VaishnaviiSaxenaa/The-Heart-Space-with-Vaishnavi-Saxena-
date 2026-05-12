import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import { upsertDailyEntry, fetchDailyTracker, fetchTodayEntry, type DailyEntry } from "../lib/api-client";
import { Loader2, Moon, Zap, BookOpen, Coffee, Brain, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";

const CREAM    = "#FAF7F2";
const CHARCOAL = "#3D3530";
const GOLD     = "#E6A756";
const CARD     = "#F3EDE6";
const MUTED    = "#8C7B70";
const BORDER   = "#D8CFC4";
const SIDEBAR  = "#5C3D2E";
const SAGE     = "#A8BFA3";
const ROSE     = "#D4A5A5";

const EMOTIONAL_OPTIONS = [
  "Calm", "Hopeful", "Motivated", "Content", "Tired",
  "Anxious", "Overwhelmed", "Sad", "Irritable", "Focused",
];

function ScaleButtons({ value, onChange, count = 5, colors }: {
  value: number | null; onChange: (v: number) => void; count?: number;
  colors?: string[];
}) {
  const defaultColors = ["#C0392B", "#E67E22", "#F1C40F", SAGE, "#27AE60"];
  const cs = colors ?? defaultColors;
  return (
    <div className="flex gap-2">
      {Array.from({ length: count }, (_, i) => i + 1).map((n) => (
        <button key={n} onClick={() => onChange(n)}
          className="w-10 h-10 rounded-xl text-sm font-bold transition-all duration-150 hover:scale-105"
          style={{
            background: value === n ? cs[n - 1] : `${cs[n - 1]}22`,
            color: value === n ? "#fff" : cs[n - 1],
            border: value === n ? `2px solid ${cs[n - 1]}` : `2px solid transparent`,
          }}>{n}</button>
      ))}
    </div>
  );
}

export default function DailyTracker() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: todayEntry, isLoading } = useQuery({
    queryKey: ["daily-tracker-today", user?.id],
    queryFn: () => fetchTodayEntry(user!.id),
    enabled: !!user,
  });

  const { data: history } = useQuery({
    queryKey: ["daily-tracker-history", user?.id],
    queryFn: () => fetchDailyTracker(user!.id, 14),
    enabled: !!user,
  });

  const [form, setForm] = useState({
    sleepHours: null as number | null,
    sleepQuality: null as number | null,
    physicalActivity: false,
    studyHours: null as number | null,
    meTimeMinutes: null as number | null,
    stressLevel: null as number | null,
    emotionalState: "",
    note: "",
  });

  useEffect(() => {
    if (todayEntry) {
      setForm({
        sleepHours: todayEntry.sleepHours ?? null,
        sleepQuality: todayEntry.sleepQuality ?? null,
        physicalActivity: todayEntry.physicalActivity ?? false,
        studyHours: todayEntry.studyHours ?? null,
        meTimeMinutes: todayEntry.meTimeMinutes ?? null,
        stressLevel: todayEntry.stressLevel ?? null,
        emotionalState: todayEntry.emotionalState ?? "",
        note: todayEntry.note ?? "",
      });
    }
  }, [todayEntry]);

  const saveMutation = useMutation({
    mutationFn: () => upsertDailyEntry({ userId: user!.id, date: today, ...form }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["daily-tracker-today", user?.id] });
      qc.invalidateQueries({ queryKey: ["daily-tracker-history", user?.id] });
    },
  });

  const f = (k: keyof typeof form) => (v: any) => setForm((p) => ({ ...p, [k]: v }));

  if (isLoading) return (
    <div className="flex justify-center items-center h-64">
      <Loader2 className="w-7 h-7 animate-spin" style={{ color: GOLD }} />
    </div>
  );

  const isSaved = saveMutation.isSuccess;

  return (
    <div className="space-y-7 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-serif font-bold" style={{ color: CHARCOAL }}>Daily Tracker</h1>
        <p className="mt-1 text-sm" style={{ color: MUTED }}>
          {format(new Date(), "EEEE, MMMM d, yyyy")} · {todayEntry ? "Today's entry logged ✓" : "Log how you're doing today"}
        </p>
      </div>

      {/* Form Card */}
      <div className="rounded-2xl p-6 space-y-7"
        style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: "0 2px 12px rgba(61,53,48,.07)" }}>

        {/* Sleep */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Moon className="w-4 h-4" style={{ color: GOLD }} />
            <h3 className="font-semibold" style={{ color: CHARCOAL }}>Sleep</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-semibold mb-2 block" style={{ color: MUTED }}>Hours of sleep</label>
              <input type="number" min={0} max={12} step={0.5}
                value={form.sleepHours ?? ""}
                onChange={(e) => f("sleepHours")(e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="e.g. 7.5"
                className="w-full h-11 px-4 rounded-xl text-sm border-2 outline-none transition-all"
                style={{ background: CREAM, borderColor: BORDER, color: CHARCOAL }} />
            </div>
            <div>
              <label className="text-xs font-semibold mb-2 block" style={{ color: MUTED }}>Sleep quality</label>
              <ScaleButtons value={form.sleepQuality} onChange={f("sleepQuality")} />
              <div className="flex justify-between text-[10px] mt-1 px-1" style={{ color: MUTED }}>
                <span>Poor</span><span>Excellent</span>
              </div>
            </div>
          </div>
        </section>

        <div className="h-px" style={{ background: BORDER }} />

        {/* Physical Activity */}
        <section>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" style={{ color: GOLD }} />
              <h3 className="font-semibold" style={{ color: CHARCOAL }}>Physical Activity</h3>
            </div>
            <button
              onClick={() => f("physicalActivity")(!form.physicalActivity)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all"
              style={form.physicalActivity
                ? { background: SAGE, color: "#2D5A29" }
                : { background: `${BORDER}55`, color: MUTED }}
            >
              {form.physicalActivity ? <><CheckCircle2 className="w-4 h-4" /> Done today!</> : "Not yet"}
            </button>
          </div>
        </section>

        <div className="h-px" style={{ background: BORDER }} />

        {/* Study + Me Time */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-4 h-4" style={{ color: GOLD }} />
            <h3 className="font-semibold" style={{ color: CHARCOAL }}>Time</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-semibold mb-2 block" style={{ color: MUTED }}>Study hours</label>
              <input type="number" min={0} max={16} step={0.5}
                value={form.studyHours ?? ""}
                onChange={(e) => f("studyHours")(e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="e.g. 6"
                className="w-full h-11 px-4 rounded-xl text-sm border-2 outline-none"
                style={{ background: CREAM, borderColor: BORDER, color: CHARCOAL }} />
            </div>
            <div>
              <label className="text-xs font-semibold mb-2 block" style={{ color: MUTED }}>Me time (minutes)</label>
              <input type="number" min={0} max={480} step={5}
                value={form.meTimeMinutes ?? ""}
                onChange={(e) => f("meTimeMinutes")(e.target.value ? parseInt(e.target.value) : null)}
                placeholder="e.g. 30"
                className="w-full h-11 px-4 rounded-xl text-sm border-2 outline-none"
                style={{ background: CREAM, borderColor: BORDER, color: CHARCOAL }} />
            </div>
          </div>
        </section>

        <div className="h-px" style={{ background: BORDER }} />

        {/* Stress */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-4 h-4" style={{ color: GOLD }} />
            <h3 className="font-semibold" style={{ color: CHARCOAL }}>Stress Level</h3>
          </div>
          <ScaleButtons value={form.stressLevel} onChange={f("stressLevel")}
            colors={["#27AE60", SAGE, "#F1C40F", "#E67E22", "#C0392B"]} />
          <div className="flex justify-between text-[10px] mt-1 px-1" style={{ color: MUTED }}>
            <span>Very calm</span><span>Very stressed</span>
          </div>
        </section>

        <div className="h-px" style={{ background: BORDER }} />

        {/* Emotional State */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Coffee className="w-4 h-4" style={{ color: GOLD }} />
            <h3 className="font-semibold" style={{ color: CHARCOAL }}>Emotional State</h3>
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {EMOTIONAL_OPTIONS.map((opt) => (
              <button key={opt} onClick={() => f("emotionalState")(form.emotionalState === opt ? "" : opt)}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                style={form.emotionalState === opt
                  ? { background: SIDEBAR, color: CREAM }
                  : { background: `${BORDER}88`, color: CHARCOAL }}>
                {opt}
              </button>
            ))}
          </div>
          <input type="text" value={form.emotionalState}
            onChange={(e) => f("emotionalState")(e.target.value)}
            placeholder="Or type your own…"
            className="w-full h-10 px-4 rounded-xl text-sm border-2 outline-none"
            style={{ background: CREAM, borderColor: BORDER, color: CHARCOAL }} />
        </section>

        <div className="h-px" style={{ background: BORDER }} />

        {/* Note */}
        <section>
          <label className="text-sm font-semibold mb-2 block" style={{ color: CHARCOAL }}>Daily Note (optional)</label>
          <textarea rows={3} value={form.note} onChange={(e) => f("note")(e.target.value)}
            placeholder="How was your day? Any wins or challenges?"
            className="w-full px-4 py-3 rounded-xl text-sm border-2 outline-none resize-none leading-relaxed"
            style={{ background: CREAM, borderColor: BORDER, color: CHARCOAL }} />
        </section>

        {/* Save */}
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="w-full h-12 rounded-xl font-semibold text-sm transition-all hover:scale-[1.01] active:scale-[0.99]"
          style={{
            background: isSaved ? SAGE : `linear-gradient(135deg, #C8922A 0%, ${GOLD} 100%)`,
            color: isSaved ? "#2D5A29" : CREAM,
            boxShadow: "0 4px 14px rgba(230,167,86,.30)",
          }}
        >
          {saveMutation.isPending ? "Saving…" : isSaved ? "✓ Entry Saved!" : todayEntry ? "Update Today's Entry" : "Save Today's Entry"}
        </button>
      </div>

      {/* History */}
      {history && history.length > 0 && (
        <div>
          <h2 className="font-serif text-xl font-semibold mb-4" style={{ color: CHARCOAL }}>Recent History</h2>
          <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: `${SIDEBAR}10` }}>
                    {["Date", "Sleep", "Quality", "Study hrs", "Stress", "Activity", "Feeling"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.slice(0, 10).map((entry, i) => (
                    <tr key={entry.id} style={{ background: i % 2 === 0 ? CREAM : CARD }}>
                      <td className="px-4 py-3 font-medium" style={{ color: CHARCOAL }}>
                        {format(new Date(entry.date + "T00:00:00"), "MMM d")}
                      </td>
                      <td className="px-4 py-3" style={{ color: CHARCOAL }}>{entry.sleepHours ?? "–"}{entry.sleepHours ? "h" : ""}</td>
                      <td className="px-4 py-3">
                        {entry.sleepQuality ? (
                          <span className="font-semibold" style={{ color: entry.sleepQuality >= 4 ? "#27AE60" : entry.sleepQuality <= 2 ? "#C0392B" : CHARCOAL }}>
                            {entry.sleepQuality}/5
                          </span>
                        ) : "–"}
                      </td>
                      <td className="px-4 py-3" style={{ color: CHARCOAL }}>{entry.studyHours ?? "–"}{entry.studyHours ? "h" : ""}</td>
                      <td className="px-4 py-3">
                        {entry.stressLevel ? (
                          <span className="font-semibold" style={{ color: entry.stressLevel >= 4 ? "#C0392B" : entry.stressLevel <= 2 ? "#27AE60" : "#E67E22" }}>
                            {entry.stressLevel}/5
                          </span>
                        ) : "–"}
                      </td>
                      <td className="px-4 py-3">
                        {entry.physicalActivity ? <span style={{ color: "#27AE60" }}>✓</span> : <span style={{ color: MUTED }}>–</span>}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>{entry.emotionalState ?? "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
