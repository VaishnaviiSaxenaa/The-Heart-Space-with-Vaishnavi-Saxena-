import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import { fetchAssignments, createAssignment, deleteAssignment, type Assignment } from "../lib/api-client";
import { Loader2, Plus, Trash2, FileText, Target } from "lucide-react";
import { format } from "date-fns";

const CREAM    = "#FAF7F2";
const CHARCOAL = "#3D3530";
const GOLD     = "#E6A756";
const CARD     = "#F3EDE6";
const MUTED    = "#8C7B70";
const BORDER   = "#D8CFC4";
const SIDEBAR  = "#5C3D2E";
const SAGE     = "#A8BFA3";
const OLIVE    = "#6E8B6B";
const ROSE     = "#D4A5A5";

const SUBJECTS = [
  "Calculus", "Linear Algebra", "Real Analysis",
  "Abstract Algebra", "Complex Analysis", "Differential Equations", "Probability & Statistics",
];

const APPROACH_CONFIG = {
  confused: { label: "Confused",  bg: "#FCE4E4", color: "#C0392B" },
  partial:  { label: "Partial",   bg: "#FEF3CD", color: "#8A5A10" },
  clear:    { label: "Clear",     bg: `${SAGE}44`, color: OLIVE    },
  strong:   { label: "Strong",    bg: "#D5EDD4",  color: "#2D5A29" },
} as const;

const SPEED_CONFIG = {
  slow:       { label: "Slow",       color: "#C0392B" },
  moderate:   { label: "Moderate",   color: "#E67E22" },
  fast:       { label: "Fast",       color: OLIVE     },
  exam_ready: { label: "Exam Ready", color: "#27AE60" },
} as const;

function accuracy(a: Assignment) {
  if (!a.questionsAttempted) return null;
  return Math.round((a.questionsCorrect / a.questionsAttempted) * 100);
}

function accuracyColor(pct: number) {
  if (pct >= 80) return "#27AE60";
  if (pct >= 60) return "#E67E22";
  return "#C0392B";
}

export default function Assignments() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    subject: SUBJECTS[0], topic: "",
    date: new Date().toISOString().split("T")[0],
    questionsAttempted: "", questionsCorrect: "",
    approach: "partial" as Assignment["approach"],
    speed: "moderate" as Assignment["speed"],
  });

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["assignments", user?.id],
    queryFn: () => fetchAssignments(user!.id),
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: createAssignment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assignments", user?.id] });
      setShowForm(false);
      setForm((f) => ({ ...f, topic: "", questionsAttempted: "", questionsCorrect: "" }));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAssignment,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assignments", user?.id] }),
  });

  function submit() {
    const qa = parseInt(form.questionsAttempted);
    const qc2 = parseInt(form.questionsCorrect);
    if (!form.topic.trim() || isNaN(qa) || isNaN(qc2)) return;
    createMutation.mutate({
      userId: user!.id,
      subject: form.subject, topic: form.topic, date: form.date,
      questionsAttempted: qa, questionsCorrect: qc2,
      approach: form.approach, speed: form.speed,
    });
  }

  const f = (k: keyof typeof form) => (v: any) => setForm((p) => ({ ...p, [k]: v }));

  /* Stats */
  const avgAccuracy = assignments.length
    ? Math.round(assignments.reduce((s, a) => s + (accuracy(a) ?? 0), 0) / assignments.length)
    : null;
  const strongCount = assignments.filter((a) => a.approach === "strong").length;
  const examReadyCount = assignments.filter((a) => a.speed === "exam_ready").length;

  if (isLoading) return (
    <div className="flex justify-center items-center h-64">
      <Loader2 className="w-7 h-7 animate-spin" style={{ color: GOLD }} />
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-5 h-5" style={{ color: GOLD }} />
            <h1 className="text-3xl font-serif font-bold" style={{ color: CHARCOAL }}>Assignment Tracker</h1>
          </div>
          <p className="text-sm" style={{ color: MUTED }}>Track practice questions and understand your performance patterns</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="self-start flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02]"
          style={{ background: `linear-gradient(135deg, #C8922A 0%, ${GOLD} 100%)`, color: CREAM, boxShadow: "0 4px 14px rgba(230,167,86,.30)" }}>
          <Plus className="w-4 h-4" /> Log Assignment
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Average Accuracy", value: avgAccuracy !== null ? `${avgAccuracy}%` : "–", color: avgAccuracy !== null ? accuracyColor(avgAccuracy) : MUTED },
          { label: "Strong Approach",  value: strongCount,   color: OLIVE  },
          { label: "Exam Ready Speed", value: examReadyCount, color: SIDEBAR },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-2xl p-4 text-center"
            style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="text-2xl font-serif font-bold" style={{ color }}>{value}</div>
            <div className="text-xs mt-1" style={{ color: MUTED }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="rounded-2xl p-6 space-y-5"
          style={{ background: CARD, border: `2px solid ${GOLD}55`, boxShadow: "0 4px 20px rgba(230,167,86,.15)" }}>
          <h3 className="font-semibold text-base" style={{ color: CHARCOAL }}>Log New Assignment</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Subject */}
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: MUTED }}>Subject</label>
              <select value={form.subject} onChange={(e) => f("subject")(e.target.value)}
                className="w-full h-11 px-3 rounded-xl text-sm border-2 outline-none"
                style={{ background: CREAM, borderColor: BORDER, color: CHARCOAL }}>
                {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            {/* Topic */}
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: MUTED }}>Topic</label>
              <input value={form.topic} onChange={(e) => f("topic")(e.target.value)} placeholder="Specific topic…"
                className="w-full h-11 px-3 rounded-xl text-sm border-2 outline-none"
                style={{ background: CREAM, borderColor: BORDER, color: CHARCOAL }} />
            </div>
            {/* Date */}
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: MUTED }}>Date</label>
              <input type="date" value={form.date} onChange={(e) => f("date")(e.target.value)}
                className="w-full h-11 px-3 rounded-xl text-sm border-2 outline-none"
                style={{ background: CREAM, borderColor: BORDER, color: CHARCOAL }} />
            </div>
            {/* Attempted */}
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
          {/* Approach */}
          <div>
            <label className="text-xs font-semibold mb-2 block" style={{ color: MUTED }}>Approach Understanding</label>
            <div className="flex gap-2 flex-wrap">
              {(Object.entries(APPROACH_CONFIG) as [Assignment["approach"], typeof APPROACH_CONFIG[keyof typeof APPROACH_CONFIG]][]).map(([k, v]) => (
                <button key={k} onClick={() => f("approach")(k)}
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
              {(Object.entries(SPEED_CONFIG) as [Assignment["speed"], typeof SPEED_CONFIG[keyof typeof SPEED_CONFIG]][]).map(([k, v]) => (
                <button key={k} onClick={() => f("speed")(k)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border"
                  style={form.speed === k
                    ? { background: v.color, color: "#fff", border: `1px solid ${v.color}` }
                    : { background: "transparent", color: v.color, border: `1px solid ${v.color}55` }}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={submit} disabled={createMutation.isPending}
              className="flex-1 h-11 rounded-xl font-semibold text-sm transition-all hover:scale-[1.01]"
              style={{ background: `linear-gradient(135deg, #C8922A 0%, ${GOLD} 100%)`, color: CREAM }}>
              {createMutation.isPending ? "Saving…" : "Save Assignment"}
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-5 h-11 rounded-xl text-sm" style={{ background: BORDER, color: MUTED }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {assignments.length === 0 ? (
        <div className="text-center py-16 rounded-2xl" style={{ background: CREAM, border: `1.5px dashed ${BORDER}`, color: MUTED }}>
          <Target className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No assignments logged yet. Start tracking your practice!</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: `${SIDEBAR}10` }}>
                  {["Date", "Subject", "Topic", "Accuracy", "Approach", "Speed", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {assignments.map((a, i) => {
                  const acc = accuracy(a);
                  return (
                    <tr key={a.id} style={{ background: i % 2 === 0 ? CREAM : CARD }}>
                      <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>
                        {format(new Date(a.date + "T00:00:00"), "MMM d")}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium" style={{ color: CHARCOAL }}>{a.subject}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: CHARCOAL }}>{a.topic}</td>
                      <td className="px-4 py-3">
                        {acc !== null ? (
                          <span className="font-bold text-sm" style={{ color: accuracyColor(acc) }}>{acc}%</span>
                        ) : "–"}
                        {a.questionsAttempted > 0 && (
                          <span className="text-[10px] ml-1" style={{ color: MUTED }}>({a.questionsCorrect}/{a.questionsAttempted})</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                          style={{ background: APPROACH_CONFIG[a.approach]?.bg, color: APPROACH_CONFIG[a.approach]?.color }}>
                          {APPROACH_CONFIG[a.approach]?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold" style={{ color: SPEED_CONFIG[a.speed]?.color }}>
                          {SPEED_CONFIG[a.speed]?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => deleteMutation.mutate(a.id)}
                          className="p-1 rounded opacity-30 hover:opacity-70 transition-opacity" style={{ color: MUTED }}>
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
