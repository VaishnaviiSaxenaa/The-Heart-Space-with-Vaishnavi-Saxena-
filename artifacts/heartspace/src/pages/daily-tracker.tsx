import { useState } from "react";
import { useAuth } from "../lib/auth";
import { format, subDays } from "date-fns";
import { Moon, Zap, BookOpen, Brain, Save, Heart } from "lucide-react";

const CREAM    = "#FAF7F2";
const CHARCOAL = "#2C1810";
const GOLD     = "#C9A96E";
const DARK     = "#3D2314";
const CARD     = "#FFFFFF";
const MUTED    = "#8C7B70";
const BORDER   = "#E8DDD0";
const SAGE     = "#A8BFA3";
const OLIVE    = "#6E8B6B";

const MOOD_EMOJIS  = ["😞", "😕", "😐", "🙂", "😄"];
const MOOD_LABELS  = ["Struggling", "Low", "Okay", "Good", "Great"];
const EMOTIONAL_OPTS = ["Calm", "Anxious", "Motivated", "Tired", "Overwhelmed", "Focused", "Sad"];
const ACTIVITY_TYPES = ["Running", "Walking", "Gym", "Yoga", "Swimming", "Cycling", "Sports", "Other"];

export interface DailyEntry {
  date: string;
  mood: number | null;
  sleepHours: number | null;
  sleepQuality: number | null;
  physicalActivity: boolean;
  activityType: string;
  studyHours: number | null;
  meTimeMinutes: number | null;
  stressLevel: number | null;
  emotionalState: string;
  note: string;
}

function lsKey(userId: string) { return `hs_daily_${userId}`; }

export function loadDailyAll(userId: string): Record<string, DailyEntry> {
  try { const r = localStorage.getItem(lsKey(userId)); return r ? JSON.parse(r) : {}; }
  catch { return {}; }
}

function saveAll(userId: string, data: Record<string, DailyEntry>) {
  localStorage.setItem(lsKey(userId), JSON.stringify(data));
}

function blank(date: string): DailyEntry {
  return {
    date, mood: null, sleepHours: null, sleepQuality: null,
    physicalActivity: false, activityType: "", studyHours: null,
    meTimeMinutes: null, stressLevel: null, emotionalState: "", note: "",
  };
}

function ScaleCircles({ value, onChange, count = 5, colors }: {
  value: number | null; onChange: (v: number) => void;
  count?: number; colors?: string[];
}) {
  const cs = colors ?? ["#C0392B", "#E67E22", "#F1C40F", SAGE, "#27AE60"];
  return (
    <div className="flex gap-2">
      {Array.from({ length: count }, (_, i) => i + 1).map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)}
          className="w-10 h-10 rounded-full text-sm font-bold transition-all duration-150 hover:scale-110"
          style={{
            background: value === n ? cs[n - 1] : `${cs[n - 1]}22`,
            color: value === n ? "#fff" : cs[n - 1],
            border: `2px solid ${value === n ? cs[n - 1] : "transparent"}`,
            boxShadow: value === n ? `0 0 0 3px ${cs[n - 1]}33` : "none",
          }}>
          {n}
        </button>
      ))}
    </div>
  );
}

export default function DailyTracker() {
  const { user } = useAuth();
  const userId = String(user?.id ?? "guest");
  const today  = new Date().toISOString().split("T")[0];

  const [allEntries, setAllEntries] = useState<Record<string, DailyEntry>>(() => loadDailyAll(userId));
  const [saved, setSaved]  = useState(false);
  const [form,  setForm]   = useState<DailyEntry>(() => loadDailyAll(userId)[today] ?? blank(today));

  const set = <K extends keyof DailyEntry>(k: K) => (v: DailyEntry[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  function handleSave() {
    const next = { ...allEntries, [today]: { ...form, date: today } };
    setAllEntries(next);
    saveAll(userId, next);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const hasEntry = !!allEntries[today];
  const history  = Object.values(allEntries).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-7 animate-in fade-in duration-500 max-w-2xl">
      <div>
        <h1 className="text-3xl font-serif font-bold" style={{ color: CHARCOAL }}>Daily Tracker</h1>
        <p className="mt-1 text-sm" style={{ color: MUTED }}>
          {format(new Date(), "EEEE, MMMM d, yyyy")} · {hasEntry ? "✓ Entry logged today" : "Log how you're doing"}
        </p>
      </div>

      <div className="rounded-2xl p-6 space-y-7"
        style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: "0 4px 24px rgba(44,24,16,.08)" }}>

        {/* Mood */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-4 h-4" style={{ color: GOLD }} />
            <h3 className="font-semibold" style={{ color: CHARCOAL }}>How are you feeling today?</h3>
          </div>
          <div className="flex gap-2">
            {MOOD_EMOJIS.map((emoji, idx) => {
              const val = idx + 1;
              const active = form.mood === val;
              return (
                <button key={val} type="button"
                  onClick={() => set("mood")(active ? null : val)}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-2xl flex-1 transition-all duration-200 hover:scale-105"
                  style={{
                    background: active ? DARK : `${BORDER}55`,
                    border: `2px solid ${active ? DARK : "transparent"}`,
                    boxShadow: active ? "0 4px 14px rgba(61,35,20,.25)" : "none",
                  }}>
                  <span className="text-2xl">{emoji}</span>
                  <span className="text-[10px] font-semibold leading-tight text-center"
                    style={{ color: active ? CREAM : MUTED }}>
                    {MOOD_LABELS[idx]}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <div className="h-px" style={{ background: BORDER }} />

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
                onChange={(e) => set("sleepHours")(e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="e.g. 7.5"
                className="w-full h-11 px-4 rounded-xl text-sm border-2 outline-none"
                style={{ background: CREAM, borderColor: BORDER, color: CHARCOAL }} />
            </div>
            <div>
              <label className="text-xs font-semibold mb-2 block" style={{ color: MUTED }}>Sleep quality (1 = poor, 5 = excellent)</label>
              <ScaleCircles value={form.sleepQuality} onChange={set("sleepQuality")} />
            </div>
          </div>
        </section>

        <div className="h-px" style={{ background: BORDER }} />

        {/* Physical Activity */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4" style={{ color: GOLD }} />
            <h3 className="font-semibold" style={{ color: CHARCOAL }}>Physical Activity</h3>
          </div>
          <div className="flex gap-2 mb-3">
            {["Yes ✓", "Not today"].map((label, i) => {
              const isYes = i === 0;
              const active = isYes ? form.physicalActivity : !form.physicalActivity;
              return (
                <button key={label} type="button"
                  onClick={() => {
                    set("physicalActivity")(isYes);
                    if (!isYes) set("activityType")("");
                  }}
                  className="px-5 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={active
                    ? { background: isYes ? OLIVE : DARK, color: "#fff" }
                    : { background: `${BORDER}88`, color: MUTED }}>
                  {label}
                </button>
              );
            })}
          </div>
          {form.physicalActivity && (
            <div>
              <label className="text-xs font-semibold mb-2 block" style={{ color: MUTED }}>Activity type</label>
              <select value={form.activityType}
                onChange={(e) => set("activityType")(e.target.value)}
                className="w-full h-11 px-3 rounded-xl text-sm border-2 outline-none"
                style={{ background: CREAM, borderColor: BORDER, color: CHARCOAL }}>
                <option value="">Select activity…</option>
                {ACTIVITY_TYPES.map((a) => <option key={a}>{a}</option>)}
              </select>
            </div>
          )}
        </section>

        <div className="h-px" style={{ background: BORDER }} />

        {/* Study + Me Time */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-4 h-4" style={{ color: GOLD }} />
            <h3 className="font-semibold" style={{ color: CHARCOAL }}>Time Allocation</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-semibold mb-2 block" style={{ color: MUTED }}>Study hours</label>
              <input type="number" min={0} max={16} step={0.5}
                value={form.studyHours ?? ""}
                onChange={(e) => set("studyHours")(e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="e.g. 6"
                className="w-full h-11 px-4 rounded-xl text-sm border-2 outline-none"
                style={{ background: CREAM, borderColor: BORDER, color: CHARCOAL }} />
            </div>
            <div>
              <label className="text-xs font-semibold mb-2 block" style={{ color: MUTED }}>Me time (minutes)</label>
              <input type="number" min={0} max={480} step={5}
                value={form.meTimeMinutes ?? ""}
                onChange={(e) => set("meTimeMinutes")(e.target.value ? parseInt(e.target.value) : null)}
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
          <ScaleCircles value={form.stressLevel} onChange={set("stressLevel")}
            colors={["#27AE60", SAGE, "#F1C40F", "#E67E22", "#C0392B"]} />
          <div className="flex justify-between text-[10px] mt-1" style={{ color: MUTED }}>
            <span>Very calm</span><span>Very stressed</span>
          </div>
        </section>

        <div className="h-px" style={{ background: BORDER }} />

        {/* Emotional State */}
        <section>
          <h3 className="font-semibold mb-3" style={{ color: CHARCOAL }}>Emotional State</h3>
          <div className="flex flex-wrap gap-2">
            {EMOTIONAL_OPTS.map((opt) => {
              const active = form.emotionalState === opt;
              return (
                <button key={opt} type="button"
                  onClick={() => set("emotionalState")(active ? "" : opt)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150"
                  style={active
                    ? { background: DARK, color: CREAM }
                    : { background: `${BORDER}88`, color: CHARCOAL }}>
                  {opt}
                </button>
              );
            })}
          </div>
        </section>

        <div className="h-px" style={{ background: BORDER }} />

        {/* Note */}
        <section>
          <label className="text-sm font-semibold mb-2 block" style={{ color: CHARCOAL }}>Daily Note (optional)</label>
          <textarea rows={3} value={form.note}
            onChange={(e) => set("note")(e.target.value)}
            placeholder="How was your day? Any wins or challenges?"
            className="w-full px-4 py-3 rounded-xl text-sm border-2 outline-none resize-none leading-relaxed"
            style={{ background: CREAM, borderColor: BORDER, color: CHARCOAL }} />
        </section>

        <button type="button" onClick={handleSave}
          className="w-full h-12 rounded-xl font-semibold text-sm transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
          style={{
            background: saved ? OLIVE : `linear-gradient(135deg, #A07840 0%, ${GOLD} 100%)`,
            color: "#fff",
            boxShadow: "0 4px 16px rgba(201,169,110,.35)",
          }}>
          <Save className="w-4 h-4" />
          {saved ? "✓ Saved!" : hasEntry ? "Update Today's Entry" : "Save Today's Entry"}
        </button>
      </div>

      {/* History table */}
      {history.length > 0 && (
        <div>
          <h2 className="font-serif text-xl font-semibold mb-4" style={{ color: CHARCOAL }}>
            Recent History
          </h2>
          <div className="rounded-2xl overflow-hidden"
            style={{ border: `1px solid ${BORDER}`, boxShadow: "0 2px 8px rgba(44,24,16,.05)" }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: `${DARK}0C` }}>
                    {["Date", "Mood", "Sleep", "Quality", "Study", "Stress", "Activity", "Feeling"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.slice(0, 10).map((entry, i) => (
                    <tr key={entry.date} style={{ background: i % 2 === 0 ? "#FAFAFA" : CREAM }}>
                      <td className="px-4 py-3 font-medium" style={{ color: CHARCOAL }}>
                        {format(new Date(entry.date + "T00:00:00"), "MMM d")}
                      </td>
                      <td className="px-4 py-3">{entry.mood ? MOOD_EMOJIS[entry.mood - 1] : "–"}</td>
                      <td className="px-4 py-3" style={{ color: CHARCOAL }}>{entry.sleepHours != null ? `${entry.sleepHours}h` : "–"}</td>
                      <td className="px-4 py-3">
                        {entry.sleepQuality ? (
                          <span className="font-semibold"
                            style={{ color: entry.sleepQuality >= 4 ? "#27AE60" : entry.sleepQuality <= 2 ? "#C0392B" : CHARCOAL }}>
                            {entry.sleepQuality}/5
                          </span>
                        ) : "–"}
                      </td>
                      <td className="px-4 py-3" style={{ color: CHARCOAL }}>{entry.studyHours != null ? `${entry.studyHours}h` : "–"}</td>
                      <td className="px-4 py-3">
                        {entry.stressLevel ? (
                          <span className="font-semibold"
                            style={{ color: entry.stressLevel >= 4 ? "#C0392B" : entry.stressLevel <= 2 ? "#27AE60" : "#E67E22" }}>
                            {entry.stressLevel}/5
                          </span>
                        ) : "–"}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: entry.physicalActivity ? "#27AE60" : MUTED }}>
                        {entry.physicalActivity ? `✓ ${entry.activityType || "Active"}` : "–"}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>{entry.emotionalState || "–"}</td>
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
