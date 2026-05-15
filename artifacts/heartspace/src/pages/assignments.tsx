import { useState } from "react";
import { useAuth } from "../lib/auth";
import { Plus, Trash2, FileText, Target, X } from "lucide-react";
import { format } from "date-fns";

const CREAM    = "#FAF7F2";
const CHARCOAL = "#2C1810";
const GOLD     = "#C9A96E";
const DARK     = "#3D2314";
const CARD     = "#FFFFFF";
const MUTED    = "#8C7B70";
const BORDER   = "#E8DDD0";
const SAGE     = "#A8BFA3";
const OLIVE    = "#6E8B6B";
const ROSE     = "#D4A5A5";

const SUBJECTS = [
  "Calculus", "Linear Algebra", "Real Analysis",
  "Abstract Algebra", "Complex Analysis", "Differential Equations", "Probability & Statistics",
];

const APPROACH = {
  confused: { label: "Confused", bg: "#FCE4E4", color: "#C0392B" },
  partial:  { label: "Partial",  bg: "#FEF3CD", color: "#8A5A10" },
  clear:    { label: "Clear",    bg: `${SAGE}44`, color: OLIVE   },
  strong:   { label: "Strong",   bg: "#D5EDD4",  color: "#2D5A29" },
} as const;

const SPEED = {
  slow:       { label: "Slow",       color: "#C0392B" },
  moderate:   { label: "Moderate",   color: "#E67E22" },
  fast:       { label: "Fast",       color: OLIVE     },
  exam_ready: { label: "Exam Ready", color: "#27AE60" },
} as const;

type Approach = keyof typeof APPROACH;
type Speed    = keyof typeof SPEED;

export interface Assignment {
  id: string;
  date: string;
  subject: string;
  topic: string;
  questionsAttempted: number;
  questionsCorrect: number;
  approach: Approach;
  speed: Speed;
  notes: string;
}

function lsKey(userId: string) { return `hs_assignments_${userId}`; }

export function loadAssignments(userId: string): Assignment[] {
  try { const r = localStorage.getItem(lsKey(userId)); return r ? JSON.parse(r) : []; }
  catch { return []; }
}

function saveAssignments(userId: string, list: Assignment[]) {
  localStorage.setItem(lsKey(userId), JSON.stringify(list));
}

function calcAccuracy(a: Assignment) {
  if (!a.questionsAttempted) return null;
  return Math.round((a.questionsCorrect / a.questionsAttempted) * 100);
}

function accColor(pct: number) {
  if (pct >= 80) return "#27AE60";
  if (pct >= 60) return "#E67E22";
  return "#C0392B";
}

const blankForm = {
  subject: SUBJECTS[0],
  topic: "",
  date: new Date().toISOString().split("T")[0],
  questionsAttempted: "",
  questionsCorrect: "",
  approach: "partial" as Approach,
  speed: "moderate" as Speed,
  notes: "",
};

export default function Assignments() {
  const { user } = useAuth();
  const userId = String(user?.id ?? "guest");

  const [list, setList]       = useState<Assignment[]>(() => loadAssignments(userId));
  const [showForm, setShow]   = useState(false);
  const [form, setForm]       = useState(blankForm);
  const [error, setError]     = useState("");

  function persist(next: Assignment[]) { setList(next); saveAssignments(userId, next); }

  const f = <K extends keyof typeof form>(k: K) => (v: typeof form[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  function submit() {
    const qa  = parseInt(String(form.questionsAttempted));
    const qc  = parseInt(String(form.questionsCorrect));
    if (!form.topic.trim()) { setError("Please enter a topic."); return; }
    if (isNaN(qa) || qa < 0) { setError("Enter valid questions attempted."); return; }
    if (isNaN(qc) || qc < 0 || qc > qa) { setError("Correct answers can't exceed attempted."); return; }
    setError("");
    const entry: Assignment = {
      id: `${Date.now()}`,
      date: form.date,
      subject: form.subject,
      topic: form.topic.trim(),
      questionsAttempted: qa,
      questionsCorrect: qc,
      approach: form.approach,
      speed: form.speed,
      notes: form.notes.trim(),
    };
    persist([entry, ...list]);
    setForm(blankForm);
    setShow(false);
  }

  function remove(id: string) { persist(list.filter((a) => a.id !== id)); }

  const avgAccuracy  = list.length
    ? Math.round(list.reduce((s, a) => s + (calcAccuracy(a) ?? 0), 0) / list.length)
    : null;
  const strongCount  = list.filter((a) => a.approach === "strong").length;
  const examReadyCount = list.filter((a) => a.speed === "exam_ready").length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-5 h-5" style={{ color: GOLD }} />
            <h1 className="text-3xl font-serif font-bold" style={{ color: CHARCOAL }}>Assignment Tracker</h1>
          </div>
          <p className="text-sm" style={{ color: MUTED }}>Track practice questions and monitor your performance patterns</p>
        </div>
        <button
          onClick={() => { setShow(true); setError(""); }}
          className="self-start flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02]"
          style={{ background: `linear-gradient(135deg, #A07840 0%, ${GOLD} 100%)`, color: "#fff", boxShadow: "0 4px 14px rgba(201,169,110,.30)" }}>
          <Plus className="w-4 h-4" /> Log Assignment
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Average Accuracy", value: avgAccuracy !== null ? `${avgAccuracy}%` : "–", color: avgAccuracy !== null ? accColor(avgAccuracy) : MUTED },
          { label: "Strong Approach",  value: strongCount,   color: OLIVE  },
          { label: "Exam Ready Speed", value: examReadyCount, color: DARK  },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-2xl p-4 text-center"
            style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: "0 2px 8px rgba(44,24,16,.06)" }}>
            <div className="text-2xl font-serif font-bold" style={{ color }}>{value}</div>
            <div className="text-xs mt-1 font-medium" style={{ color: MUTED }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="rounded-2xl p-6 space-y-5"
          style={{ background: CARD, border: `2px solid ${GOLD}66`, boxShadow: "0 4px 24px rgba(201,169,110,.18)" }}>
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-semibold" style={{ color: CHARCOAL }}>Log New Assignment</h3>
            <button onClick={() => setShow(false)} style={{ color: MUTED }}><X className="w-5 h-5" /></button>
          </div>

          {error && (
            <div className="px-4 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: "#FCE4E4", color: "#C0392B" }}>{error}</div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: MUTED }}>Subject</label>
              <select value={form.subject} onChange={(e) => f("subject")(e.target.value)}
                className="w-full h-11 px-3 rounded-xl text-sm border-2 outline-none"
                style={{ background: CREAM, borderColor: BORDER, color: CHARCOAL }}>
                {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: MUTED }}>Topic</label>
              <input value={form.topic} onChange={(e) => f("topic")(e.target.value)}
                placeholder="Specific topic covered…"
                className="w-full h-11 px-3 rounded-xl text-sm border-2 outline-none"
                style={{ background: CREAM, borderColor: BORDER, color: CHARCOAL }} />
            </div>
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: MUTED }}>Date</label>
              <input type="date" value={form.date} onChange={(e) => f("date")(e.target.value)}
                className="w-full h-11 px-3 rounded-xl text-sm border-2 outline-none"
                style={{ background: CREAM, borderColor: BORDER, color: CHARCOAL }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: MUTED }}>Attempted</label>
                <input type="number" min={0} value={form.questionsAttempted}
                  onChange={(e) => f("questionsAttempted")(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl text-sm border-2 outline-none"
                  style={{ background: CREAM, borderColor: BORDER, color: CHARCOAL }} />
              </div>
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: MUTED }}>Correct</label>
                <input type="number" min={0} value={form.questionsCorrect}
                  onChange={(e) => f("questionsCorrect")(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl text-sm border-2 outline-none"
                  style={{ background: CREAM, borderColor: BORDER, color: CHARCOAL }} />
              </div>
            </div>
          </div>

          {/* Auto accuracy preview */}
          {form.questionsAttempted && form.questionsCorrect && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl"
              style={{ background: `${GOLD}18` }}>
              <span className="text-sm" style={{ color: MUTED }}>Accuracy:</span>
              <span className="text-lg font-bold font-serif"
                style={{ color: accColor(Math.round((parseInt(String(form.questionsCorrect)) / parseInt(String(form.questionsAttempted))) * 100)) }}>
                {Math.round((parseInt(String(form.questionsCorrect)) / parseInt(String(form.questionsAttempted))) * 100)}%
              </span>
            </div>
          )}

          {/* Approach */}
          <div>
            <label className="text-xs font-semibold mb-2 block" style={{ color: MUTED }}>Approach Understanding</label>
            <div className="flex gap-2 flex-wrap">
              {(Object.entries(APPROACH) as [Approach, typeof APPROACH[Approach]][]).map(([k, v]) => (
                <button key={k} type="button" onClick={() => f("approach")(k)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                  style={form.approach === k ? { background: v.color, color: "#fff" } : { background: v.bg, color: v.color }}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Speed */}
          <div>
            <label className="text-xs font-semibold mb-2 block" style={{ color: MUTED }}>Speed</label>
            <div className="flex gap-2 flex-wrap">
              {(Object.entries(SPEED) as [Speed, typeof SPEED[Speed]][]).map(([k, v]) => (
                <button key={k} type="button" onClick={() => f("speed")(k)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border"
                  style={form.speed === k
                    ? { background: v.color, color: "#fff", border: `1px solid ${v.color}` }
                    : { background: "transparent", color: v.color, border: `1px solid ${v.color}55` }}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: MUTED }}>Notes (optional)</label>
            <textarea rows={2} value={form.notes} onChange={(e) => f("notes")(e.target.value)}
              placeholder="What did you learn? Any patterns noticed?"
              className="w-full px-3 py-2.5 rounded-xl text-sm border-2 outline-none resize-none"
              style={{ background: CREAM, borderColor: BORDER, color: CHARCOAL }} />
          </div>

          <div className="flex gap-3">
            <button onClick={submit}
              className="flex-1 h-11 rounded-xl font-semibold text-sm transition-all hover:scale-[1.01]"
              style={{ background: `linear-gradient(135deg, #A07840 0%, ${GOLD} 100%)`, color: "#fff" }}>
              Save Assignment
            </button>
            <button onClick={() => setShow(false)}
              className="px-5 h-11 rounded-xl text-sm font-medium"
              style={{ background: BORDER, color: MUTED }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {list.length === 0 ? (
        <div className="text-center py-16 rounded-2xl"
          style={{ background: CREAM, border: `1.5px dashed ${BORDER}` }}>
          <Target className="w-8 h-8 mx-auto mb-3 opacity-30" style={{ color: GOLD }} />
          <p className="text-sm font-medium" style={{ color: CHARCOAL }}>No assignments logged yet</p>
          <p className="text-xs mt-1" style={{ color: MUTED }}>Start tracking your practice to see patterns emerge</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden"
          style={{ border: `1px solid ${BORDER}`, boxShadow: "0 2px 8px rgba(44,24,16,.06)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: `${DARK}0C` }}>
                  {["Date", "Subject", "Topic", "Accuracy", "Approach", "Speed", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map((a, i) => {
                  const acc = calcAccuracy(a);
                  return (
                    <tr key={a.id} style={{ background: i % 2 === 0 ? "#FAFAFA" : CREAM }}>
                      <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>
                        {format(new Date(a.date + "T00:00:00"), "MMM d")}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium" style={{ color: CHARCOAL }}>{a.subject}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: CHARCOAL }}>{a.topic}</td>
                      <td className="px-4 py-3">
                        {acc !== null ? (
                          <span className="font-bold" style={{ color: accColor(acc) }}>{acc}%</span>
                        ) : "–"}
                        <span className="text-[10px] ml-1" style={{ color: MUTED }}>
                          ({a.questionsCorrect}/{a.questionsAttempted})
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                          style={{ background: APPROACH[a.approach]?.bg, color: APPROACH[a.approach]?.color }}>
                          {APPROACH[a.approach]?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold" style={{ color: SPEED[a.speed]?.color }}>
                          {SPEED[a.speed]?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => remove(a.id)}
                          className="p-1 rounded opacity-30 hover:opacity-70 transition-opacity"
                          style={{ color: "#C0392B" }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
