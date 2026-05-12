import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import {
  fetchStudentDetail, fetchAiSummary, fetchNotes, createNote, deleteNote,
  type SessionNote, type StudentDetail,
} from "../lib/api-client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Loader2, ArrowLeft, AlertTriangle, Sparkles, MessageSquare,
  Clipboard, GraduationCap, FileText, ChevronDown, ChevronRight,
} from "lucide-react";
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
const RISK_RED = "#C0392B";

const MOOD_EMOJIS = ["", "😟", "😕", "😐", "🙂", "😊"];

const STATUS_COLORS: Record<string, string> = {
  not_started:        MUTED,
  theory_in_progress: "#8A5A10",
  theory_done:        SIDEBAR,
  practicing:         OLIVE,
  mastered:           "#2D5A29",
};

function MoodDots({ moods }: { moods: { mood: number; createdAt: string }[] }) {
  const last14 = moods.slice(0, 14).reverse();
  const colors = ["", "#C0392B", "#E67E22", "#F1C40F", SAGE, OLIVE];
  return (
    <div className="flex gap-1.5 flex-wrap">
      {last14.map((m, i) => (
        <div key={i} title={`${format(new Date(m.createdAt), "MMM d")}: ${m.mood}/5`}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs"
          style={{ background: `${colors[m.mood]}33`, color: colors[m.mood], fontWeight: 700 }}>
          {m.mood}
        </div>
      ))}
      {last14.length === 0 && <span className="text-sm" style={{ color: MUTED }}>No mood data yet</span>}
    </div>
  );
}

export default function StudentDetail() {
  const params = useParams<{ id: string }>();
  const studentId = parseInt(params.id);
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<"overview" | "notes" | "progress">("overview");
  const [noteType, setNoteType] = useState<"session_note" | "intervention">("session_note");
  const [noteContent, setNoteContent] = useState("");
  const [aiSummary, setAiSummary] = useState<{ summary: string; aiGenerated: boolean } | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [syllabusExpanded, setSyllabusExpanded] = useState<Record<string, boolean>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["student-detail", studentId],
    queryFn: () => fetchStudentDetail(studentId),
    enabled: !isNaN(studentId),
  });

  const { data: notes = [], refetch: refetchNotes } = useQuery({
    queryKey: ["notes", studentId],
    queryFn: () => fetchNotes({ studentId }),
    enabled: !isNaN(studentId),
  });

  const createNoteMutation = useMutation({
    mutationFn: createNote,
    onSuccess: () => { refetchNotes(); setNoteContent(""); },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: deleteNote,
    onSuccess: () => refetchNotes(),
  });

  async function handleAiSummary() {
    setLoadingAI(true);
    try {
      const result = await fetchAiSummary(studentId);
      setAiSummary(result);
    } finally {
      setLoadingAI(false);
    }
  }

  function submitNote() {
    if (!noteContent.trim() || !user) return;
    createNoteMutation.mutate({
      counsellorId: user.id, studentId, type: noteType,
      content: noteContent.trim(),
      visibleToStudent: noteType === "intervention",
      sessionId: undefined as any,
    });
  }

  if (isLoading) return (
    <div className="flex justify-center items-center h-64">
      <Loader2 className="w-7 h-7 animate-spin" style={{ color: GOLD }} />
    </div>
  );
  if (!data) return (
    <div className="text-center py-16" style={{ color: MUTED }}>Student not found.</div>
  );

  const { student, moods, dailyTracker, sessions, syllabusTopics, assignments, riskFlag } = data;
  const space = student.space;

  const avgMood   = moods.length ? (moods.reduce((s, m) => s + m.mood, 0) / moods.length).toFixed(1) : null;
  const avgSleep  = dailyTracker.filter((d) => d.sleepHours != null).length
    ? (dailyTracker.filter((d) => d.sleepHours).reduce((s, d) => s + (d.sleepHours ?? 0), 0) /
       dailyTracker.filter((d) => d.sleepHours).length).toFixed(1)
    : null;
  const avgStress = dailyTracker.filter((d) => d.stressLevel != null).length
    ? (dailyTracker.filter((d) => d.stressLevel).reduce((s, d) => s + (d.stressLevel ?? 0), 0) /
       dailyTracker.filter((d) => d.stressLevel).length).toFixed(1)
    : null;

  /* Syllabus grouped by subject */
  const subjectGroups = syllabusTopics.reduce<Record<string, typeof syllabusTopics>>((acc, t) => {
    (acc[t.subject] ||= []).push(t);
    return acc;
  }, {});

  const tabs = [
    { id: "overview", label: "Overview", icon: TrendingUpIcon },
    { id: "notes",    label: "Notes",    icon: MessageSquare  },
    ...(space === "prep" ? [{ id: "progress", label: "Progress", icon: GraduationCap }] : []),
  ] as const;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Back */}
      <button onClick={() => setLocation("/counsellor")}
        className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70" style={{ color: MUTED }}>
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      {/* Student header */}
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <Avatar className="h-16 w-16 flex-shrink-0">
          <AvatarFallback className="text-xl font-bold" style={{ background: `${SIDEBAR}20`, color: SIDEBAR }}>
            {student.name.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-serif font-bold" style={{ color: CHARCOAL }}>{student.name}</h1>
            {space && (
              <span className="text-xs font-bold px-3 py-1 rounded-full"
                style={{ background: space === "prep" ? `${GOLD}22` : `${SAGE}33`, color: space === "prep" ? SIDEBAR : OLIVE }}>
                {space === "prep" ? "📚 Prep Space" : "🌿 Self Space"}
              </span>
            )}
            {riskFlag && (
              <span className="flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full"
                style={{ background: "#FCE4E4", color: RISK_RED }}>
                <AlertTriangle className="w-3 h-3" /> Risk Flagged
              </span>
            )}
          </div>
          <p className="text-sm mt-1" style={{ color: MUTED }}>{student.email}</p>
        </div>
      </div>

      {/* Risk banner */}
      {riskFlag && (
        <div className="flex items-start gap-3 p-4 rounded-2xl"
          style={{ background: "#FCE4E4", border: `1.5px solid ${RISK_RED}55` }}>
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: RISK_RED }} />
          <div>
            <p className="font-semibold text-sm" style={{ color: RISK_RED }}>⚠ Risk Flag Active</p>
            <p className="text-xs mt-0.5" style={{ color: "#8B2020" }}>
              This student has logged mood ≤ 2 for 3 or more consecutive days. Consider reaching out or scheduling a check-in.
            </p>
          </div>
        </div>
      )}

      {/* AI Summary */}
      <div className="rounded-2xl p-5" style={{ background: `${SIDEBAR}0D`, border: `1px solid ${BORDER}` }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" style={{ color: GOLD }} />
            <h3 className="font-semibold text-sm" style={{ color: CHARCOAL }}>Pre-Session AI Summary</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{ background: `${GOLD}22`, color: SIDEBAR }}>Last 14 days</span>
          </div>
          <button onClick={handleAiSummary} disabled={loadingAI}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-[1.02]"
            style={{ background: `linear-gradient(135deg, #C8922A 0%, ${GOLD} 100%)`, color: CREAM }}>
            {loadingAI ? <><Loader2 className="w-3 h-3 animate-spin" /> Generating…</> : "Generate Summary"}
          </button>
        </div>
        {aiSummary ? (
          <div>
            <pre className="whitespace-pre-wrap text-xs leading-relaxed font-sans" style={{ color: CHARCOAL }}>
              {aiSummary.summary}
            </pre>
            <p className="text-[10px] mt-2" style={{ color: MUTED }}>
              {aiSummary.aiGenerated ? "✨ Generated by AI" : "📊 Generated from logged data"}
            </p>
          </div>
        ) : (
          <p className="text-sm" style={{ color: MUTED }}>Click "Generate Summary" to get an overview of the last 14 days.</p>
        )}
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Avg Mood",    value: avgMood   ? `${avgMood}/5`   : "–", color: avgMood && parseFloat(avgMood) >= 3.5 ? OLIVE : avgMood && parseFloat(avgMood) < 2.5 ? RISK_RED : GOLD },
          { label: "Avg Sleep",   value: avgSleep  ? `${avgSleep}h`   : "–", color: avgSleep && parseFloat(avgSleep) >= 7 ? OLIVE : GOLD },
          { label: "Avg Stress",  value: avgStress ? `${avgStress}/5` : "–", color: avgStress && parseFloat(avgStress) >= 4 ? RISK_RED : OLIVE },
          { label: "Sessions",    value: sessions.length,                     color: SIDEBAR },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-2xl p-4 text-center"
            style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="text-2xl font-serif font-bold" style={{ color }}>{value}</div>
            <div className="text-xs mt-0.5" style={{ color: MUTED }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: `rgba(61,53,48,.07)` }}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id as any)}
            className="flex items-center gap-2 flex-1 justify-center py-2.5 rounded-lg text-sm font-semibold transition-all"
            style={activeTab === id
              ? { background: SIDEBAR, color: CREAM, boxShadow: "0 2px 8px rgba(92,61,46,.25)" }
              : { color: MUTED }}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ─────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Mood history */}
          <div className="rounded-2xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <h3 className="font-semibold mb-4" style={{ color: CHARCOAL }}>Mood History (recent)</h3>
            <MoodDots moods={moods} />
          </div>

          {/* Daily tracker */}
          <div className="rounded-2xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <h3 className="font-semibold mb-4" style={{ color: CHARCOAL }}>Daily Tracker (last 14 days)</h3>
            {dailyTracker.length === 0 ? (
              <p className="text-sm" style={{ color: MUTED }}>No daily tracker entries found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                      {["Date", "Sleep", "Quality", "Study", "Stress", "Activity", "Feeling"].map((h) => (
                        <th key={h} className="text-left py-2 px-3 font-semibold" style={{ color: MUTED }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dailyTracker.map((d, i) => (
                      <tr key={d.id} style={{ background: i % 2 === 0 ? "transparent" : `${BORDER}33` }}>
                        <td className="py-2 px-3 font-medium" style={{ color: CHARCOAL }}>{d.date}</td>
                        <td className="py-2 px-3" style={{ color: CHARCOAL }}>{d.sleepHours != null ? `${d.sleepHours}h` : "–"}</td>
                        <td className="py-2 px-3" style={{ color: d.sleepQuality != null ? (d.sleepQuality >= 4 ? OLIVE : d.sleepQuality <= 2 ? RISK_RED : CHARCOAL) : MUTED }}>
                          {d.sleepQuality != null ? `${d.sleepQuality}/5` : "–"}
                        </td>
                        <td className="py-2 px-3" style={{ color: CHARCOAL }}>{d.studyHours != null ? `${d.studyHours}h` : "–"}</td>
                        <td className="py-2 px-3" style={{ color: d.stressLevel != null ? (d.stressLevel >= 4 ? RISK_RED : d.stressLevel <= 2 ? OLIVE : GOLD) : MUTED }}>
                          {d.stressLevel != null ? `${d.stressLevel}/5` : "–"}
                        </td>
                        <td className="py-2 px-3">{d.physicalActivity ? <span style={{ color: OLIVE }}>✓</span> : <span style={{ color: MUTED }}>–</span>}</td>
                        <td className="py-2 px-3" style={{ color: MUTED }}>{d.emotionalState ?? "–"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Sessions */}
          <div className="rounded-2xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <h3 className="font-semibold mb-4" style={{ color: CHARCOAL }}>Sessions</h3>
            {sessions.length === 0 ? (
              <p className="text-sm" style={{ color: MUTED }}>No sessions yet.</p>
            ) : (
              <div className="space-y-2">
                {sessions.slice(0, 8).map((s) => (
                  <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                    style={{ background: CREAM, border: `1px solid ${BORDER}55` }}>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full`}
                      style={{
                        background: s.status === "completed" ? `${OLIVE}22` : s.status === "cancelled" ? `${ROSE}44` : `${GOLD}22`,
                        color: s.status === "completed" ? OLIVE : s.status === "cancelled" ? "#8B2020" : "#8A5A10",
                      }}>{s.status}</span>
                    <span className="text-sm" style={{ color: CHARCOAL }}>{format(new Date(s.scheduledAt), "MMM d, yyyy")}</span>
                    {s.topic && <span className="text-xs" style={{ color: MUTED }}>{s.topic}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── NOTES TAB ────────────────────────────────── */}
      {activeTab === "notes" && (
        <div className="space-y-5">
          {/* Add note form */}
          <div className="rounded-2xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <h3 className="font-semibold mb-4" style={{ color: CHARCOAL }}>Add Note</h3>
            <div className="flex gap-2 mb-4">
              {([
                { id: "session_note",  label: "Session Note",      sub: "Private to you"         },
                { id: "intervention",  label: "Intervention Note",  sub: "Visible to student"     },
              ] as const).map(({ id, label, sub }) => (
                <button key={id} onClick={() => setNoteType(id)}
                  className="flex-1 py-3 px-4 rounded-xl text-left transition-all"
                  style={noteType === id
                    ? { background: SIDEBAR, color: CREAM }
                    : { background: CREAM, border: `1.5px solid ${BORDER}`, color: CHARCOAL }}>
                  <div className="text-xs font-bold">{label}</div>
                  <div className="text-[10px] mt-0.5 opacity-70">{sub}</div>
                </button>
              ))}
            </div>
            <textarea rows={4} value={noteContent} onChange={(e) => setNoteContent(e.target.value)}
              placeholder={noteType === "session_note"
                ? "Session notes, observations, clinical thoughts…"
                : "Guidance, encouragement, or resources for the student…"}
              className="w-full px-4 py-3 rounded-xl text-sm border-2 outline-none resize-none leading-relaxed mb-3"
              style={{ background: CREAM, borderColor: BORDER, color: CHARCOAL }} />
            <button onClick={submitNote} disabled={createNoteMutation.isPending || !noteContent.trim()}
              className="w-full h-11 rounded-xl font-semibold text-sm transition-all"
              style={{ background: `linear-gradient(135deg, #C8922A 0%, ${GOLD} 100%)`, color: CREAM,
                opacity: noteContent.trim() ? 1 : 0.5 }}>
              {createNoteMutation.isPending ? "Saving…" : "Save Note"}
            </button>
          </div>

          {/* Notes list */}
          {[
            { type: "session_note" as const,  label: "Session Notes (Private)",           color: SIDEBAR },
            { type: "intervention" as const,  label: "Intervention Notes (Student sees)", color: OLIVE   },
          ].map(({ type, label, color }) => {
            const filtered = notes.filter((n) => n.type === type);
            return (
              <div key={type}>
                <h4 className="font-semibold text-sm mb-3" style={{ color }}>{label}</h4>
                {filtered.length === 0 ? (
                  <p className="text-sm" style={{ color: MUTED }}>No {type === "session_note" ? "session" : "intervention"} notes yet.</p>
                ) : (
                  <div className="space-y-2">
                    {filtered.map((note) => (
                      <div key={note.id} className="rounded-2xl p-4 group"
                        style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm leading-relaxed flex-1" style={{ color: CHARCOAL }}>{note.content}</p>
                          <button onClick={() => deleteNoteMutation.mutate(note.id)}
                            className="opacity-0 group-hover:opacity-40 hover:!opacity-70 transition-opacity p-1 flex-shrink-0"
                            style={{ color: MUTED }}>✕</button>
                        </div>
                        <p className="text-[10px] mt-2" style={{ color: MUTED }}>
                          {format(new Date(note.createdAt), "MMM d, yyyy · h:mm a")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── PROGRESS TAB (Prep only) ──────────────────── */}
      {activeTab === "progress" && space === "prep" && (
        <div className="space-y-5">
          {/* Syllabus */}
          <div>
            <h3 className="font-semibold mb-3" style={{ color: CHARCOAL }}>Syllabus Progress</h3>
            {Object.entries(subjectGroups).length === 0 ? (
              <p className="text-sm" style={{ color: MUTED }}>No syllabus topics tracked yet.</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(subjectGroups).map(([subject, topics]) => {
                  const mastered = topics.filter((t) => t.status === "mastered").length;
                  const pct = Math.round(mastered / topics.length * 100);
                  const isOpen = syllabusExpanded[subject];
                  return (
                    <div key={subject} className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
                      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                        style={{ background: CARD }}
                        onClick={() => setSyllabusExpanded((e) => ({ ...e, [subject]: !isOpen }))}>
                        {isOpen ? <ChevronDown className="w-4 h-4" style={{ color: GOLD }} />
                                : <ChevronRight className="w-4 h-4" style={{ color: MUTED }} />}
                        <span className="font-medium text-sm flex-1" style={{ color: CHARCOAL }}>{subject}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: BORDER }}>
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 70 ? OLIVE : GOLD }} />
                          </div>
                          <span className="text-xs font-bold" style={{ color: pct >= 70 ? OLIVE : GOLD }}>{pct}%</span>
                        </div>
                      </div>
                      {isOpen && (
                        <div className="px-4 pb-3" style={{ background: CREAM }}>
                          {topics.map((t) => (
                            <div key={t.id} className="flex items-center justify-between py-1.5"
                              style={{ borderBottom: `1px solid ${BORDER}44` }}>
                              <span className="text-xs" style={{ color: CHARCOAL }}>{t.topic}</span>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                style={{ color: STATUS_COLORS[t.status] ?? MUTED }}>
                                {t.status.replace(/_/g, " ")}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Assignments */}
          <div>
            <h3 className="font-semibold mb-3" style={{ color: CHARCOAL }}>Recent Assignments</h3>
            {assignments.length === 0 ? (
              <p className="text-sm" style={{ color: MUTED }}>No assignments logged yet.</p>
            ) : (
              <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: `${SIDEBAR}10` }}>
                      {["Date", "Subject", "Topic", "Accuracy", "Approach", "Speed"].map((h) => (
                        <th key={h} className="text-left px-3 py-2.5 font-semibold" style={{ color: MUTED }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((a, i) => {
                      const acc = a.questionsAttempted ? Math.round((a.questionsCorrect / a.questionsAttempted) * 100) : null;
                      return (
                        <tr key={a.id} style={{ background: i % 2 === 0 ? CREAM : CARD }}>
                          <td className="px-3 py-2.5" style={{ color: MUTED }}>{a.date}</td>
                          <td className="px-3 py-2.5 font-medium" style={{ color: CHARCOAL }}>{a.subject}</td>
                          <td className="px-3 py-2.5" style={{ color: CHARCOAL }}>{a.topic}</td>
                          <td className="px-3 py-2.5 font-bold" style={{ color: acc != null ? (acc >= 80 ? "#27AE60" : acc >= 60 ? "#E67E22" : RISK_RED) : MUTED }}>
                            {acc != null ? `${acc}%` : "–"}
                          </td>
                          <td className="px-3 py-2.5 capitalize" style={{ color: CHARCOAL }}>{a.approach.replace(/_/g, " ")}</td>
                          <td className="px-3 py-2.5 capitalize" style={{ color: CHARCOAL }}>{a.speed.replace(/_/g, " ")}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TrendingUpIcon(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}
