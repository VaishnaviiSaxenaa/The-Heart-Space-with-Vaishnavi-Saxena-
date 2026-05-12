import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import {
  fetchSyllabus, createTopic, updateTopic, deleteTopic, type SyllabusTopic,
} from "../lib/api-client";
import { Loader2, ChevronDown, ChevronRight, Plus, Trash2, GraduationCap } from "lucide-react";

const CREAM    = "#FAF7F2";
const CHARCOAL = "#3D3530";
const GOLD     = "#E6A756";
const CARD     = "#F3EDE6";
const MUTED    = "#8C7B70";
const BORDER   = "#D8CFC4";
const SIDEBAR  = "#5C3D2E";
const SAGE     = "#A8BFA3";
const OLIVE    = "#6E8B6B";

const SUBJECTS = [
  "Calculus", "Linear Algebra", "Real Analysis",
  "Abstract Algebra", "Complex Analysis", "Differential Equations", "Probability & Statistics",
];

const DEFAULT_TOPICS: Record<string, string[]> = {
  "Calculus":                 ["Limits & Continuity", "Differentiation", "Integration", "Sequences & Series", "Multivariable Calculus", "Vector Calculus"],
  "Linear Algebra":           ["Matrices & Determinants", "Vector Spaces", "Linear Transformations", "Eigenvalues & Eigenvectors", "Inner Product Spaces"],
  "Real Analysis":            ["Real Number System", "Sequences", "Series", "Continuity & Differentiation", "Riemann Integration", "Metric Spaces"],
  "Abstract Algebra":         ["Group Theory", "Subgroups & Cosets", "Ring Theory", "Field Theory", "Homomorphisms"],
  "Complex Analysis":         ["Complex Numbers", "Analytic Functions", "Cauchy's Theorem", "Laurent Series", "Residues & Poles"],
  "Differential Equations":   ["First Order ODEs", "Higher Order ODEs", "Systems of ODEs", "Laplace Transforms", "PDEs Basics"],
  "Probability & Statistics": ["Probability Theory", "Random Variables", "Distributions", "Hypothesis Testing", "Regression Analysis"],
};

const STATUS_CONFIG = {
  not_started:         { label: "Not Started",          bg: `${BORDER}88`,    color: MUTED },
  theory_in_progress:  { label: "Theory In Progress",   bg: `${GOLD}22`,      color: "#8A5A10" },
  theory_done:         { label: "Theory Done",           bg: "#EDE4D8",        color: SIDEBAR },
  practicing:          { label: "Practicing",            bg: `${SAGE}44`,      color: OLIVE },
  mastered:            { label: "Mastered ✓",            bg: `${OLIVE}33`,     color: "#2D5A29" },
} as const;

type Status = keyof typeof STATUS_CONFIG;

function pct(topics: SyllabusTopic[]) {
  if (!topics.length) return 0;
  return Math.round(topics.filter((t) => t.status === "mastered").length / topics.length * 100);
}

function progressColor(p: number) {
  if (p >= 80) return OLIVE;
  if (p >= 50) return GOLD;
  return "#C9A05A";
}

export default function Syllabus() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newTopic, setNewTopic] = useState("");

  const { data: topics = [], isLoading } = useQuery({
    queryKey: ["syllabus", user?.id],
    queryFn: () => fetchSyllabus(user!.id),
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: createTopic,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["syllabus", user?.id] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateTopic>[1] }) => updateTopic(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["syllabus", user?.id] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTopic,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["syllabus", user?.id] }),
  });

  async function initDefaultTopics(subject: string) {
    const defs = DEFAULT_TOPICS[subject] ?? [];
    for (const topic of defs) {
      await createMutation.mutateAsync({
        userId: user!.id, subject, topic,
        status: "not_started", confidence: 0,
        dailyRevision: false, weeklyRevision: false,
      });
    }
  }

  function addCustomTopic(subject: string) {
    if (!newTopic.trim()) return;
    createMutation.mutate({
      userId: user!.id, subject, topic: newTopic.trim(),
      status: "not_started", confidence: 0,
      dailyRevision: false, weeklyRevision: false,
    });
    setNewTopic("");
    setAddingTo(null);
  }

  if (isLoading) return (
    <div className="flex justify-center items-center h-64">
      <Loader2 className="w-7 h-7 animate-spin" style={{ color: GOLD }} />
    </div>
  );

  const totalTopics   = topics.length;
  const masteredCount = topics.filter((t) => t.status === "mastered").length;
  const overallPct    = totalTopics ? Math.round(masteredCount / totalTopics * 100) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GraduationCap className="w-5 h-5" style={{ color: GOLD }} />
            <h1 className="text-3xl font-serif font-bold" style={{ color: CHARCOAL }}>Syllabus Tracker</h1>
          </div>
          <p className="text-sm" style={{ color: MUTED }}>Track your exam preparation topic by topic</p>
        </div>
        {/* Overall progress */}
        <div className="rounded-2xl px-6 py-4 text-center min-w-[140px]"
          style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <div className="text-3xl font-serif font-bold" style={{ color: SIDEBAR }}>{overallPct}%</div>
          <div className="text-xs mt-0.5" style={{ color: MUTED }}>Overall Mastered</div>
          <div className="text-xs mt-0.5" style={{ color: MUTED }}>{masteredCount}/{totalTopics} topics</div>
        </div>
      </div>

      {/* Subjects */}
      {SUBJECTS.map((subject) => {
        const subTopics = topics.filter((t) => t.subject === subject);
        const p = pct(subTopics);
        const isOpen = expanded[subject] ?? false;

        return (
          <div key={subject} className="rounded-2xl overflow-hidden"
            style={{ border: `1px solid ${BORDER}`, boxShadow: "0 2px 8px rgba(61,53,48,.05)" }}>
            {/* Subject header */}
            <div
              className="flex items-center justify-between px-5 py-4 cursor-pointer transition-all hover:opacity-90"
              style={{ background: CARD }}
              onClick={() => setExpanded((e) => ({ ...e, [subject]: !isOpen }))}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {isOpen ? <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: GOLD }} />
                        : <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: MUTED }} />}
                <span className="font-semibold" style={{ color: CHARCOAL }}>{subject}</span>
                <span className="text-xs ml-1" style={{ color: MUTED }}>{subTopics.length} topics</span>
              </div>
              <div className="flex items-center gap-3 ml-4">
                <div className="hidden md:block w-28">
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: BORDER }}>
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${p}%`, background: progressColor(p) }} />
                  </div>
                </div>
                <span className="text-sm font-bold flex-shrink-0" style={{ color: progressColor(p) }}>{p}%</span>
              </div>
            </div>

            {/* Topics list */}
            {isOpen && (
              <div style={{ background: CREAM }}>
                {subTopics.length === 0 ? (
                  <div className="px-5 py-6 text-center">
                    <p className="text-sm mb-3" style={{ color: MUTED }}>No topics tracked yet.</p>
                    <button
                      onClick={() => initDefaultTopics(subject)}
                      disabled={createMutation.isPending}
                      className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
                      style={{ background: `${GOLD}22`, color: SIDEBAR }}>
                      + Add default topics for {subject}
                    </button>
                  </div>
                ) : (
                  <div>
                    {/* Table header */}
                    <div className="grid grid-cols-12 px-5 py-2 text-[11px] font-semibold" style={{ color: MUTED, borderBottom: `1px solid ${BORDER}` }}>
                      <div className="col-span-4">Topic</div>
                      <div className="col-span-3">Status</div>
                      <div className="col-span-2">Confidence</div>
                      <div className="col-span-2 text-center">Revision</div>
                      <div className="col-span-1"></div>
                    </div>
                    {subTopics.map((topic) => (
                      <div key={topic.id} className="grid grid-cols-12 items-center px-5 py-3"
                        style={{ borderBottom: `1px solid ${BORDER}55` }}>
                        {/* Topic name */}
                        <div className="col-span-4 text-sm font-medium pr-2" style={{ color: CHARCOAL }}>{topic.topic}</div>

                        {/* Status select */}
                        <div className="col-span-3 pr-2">
                          <select value={topic.status}
                            onChange={(e) => updateMutation.mutate({ id: topic.id, data: { status: e.target.value as Status } })}
                            className="text-[11px] font-semibold px-2 py-1.5 rounded-lg border-0 outline-none w-full"
                            style={{
                              background: STATUS_CONFIG[topic.status as Status]?.bg ?? BORDER,
                              color: STATUS_CONFIG[topic.status as Status]?.color ?? CHARCOAL,
                            }}>
                            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                              <option key={k} value={k}>{v.label}</option>
                            ))}
                          </select>
                        </div>

                        {/* Confidence */}
                        <div className="col-span-2 pr-2">
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <button key={n}
                                onClick={() => updateMutation.mutate({ id: topic.id, data: { confidence: n } })}
                                className="w-5 h-5 rounded text-[10px] font-bold transition-all"
                                style={{
                                  background: (topic.confidence ?? 0) >= n ? GOLD : `${BORDER}55`,
                                  color: (topic.confidence ?? 0) >= n ? CREAM : MUTED,
                                }}>{n}</button>
                            ))}
                          </div>
                        </div>

                        {/* Revision checkboxes */}
                        <div className="col-span-2 flex items-center justify-center gap-3">
                          <label className="flex flex-col items-center gap-0.5 cursor-pointer">
                            <span className="text-[9px]" style={{ color: MUTED }}>Daily</span>
                            <input type="checkbox" checked={topic.dailyRevision}
                              onChange={(e) => updateMutation.mutate({ id: topic.id, data: { dailyRevision: e.target.checked } })}
                              className="w-3.5 h-3.5 accent-amber-600" />
                          </label>
                          <label className="flex flex-col items-center gap-0.5 cursor-pointer">
                            <span className="text-[9px]" style={{ color: MUTED }}>Weekly</span>
                            <input type="checkbox" checked={topic.weeklyRevision}
                              onChange={(e) => updateMutation.mutate({ id: topic.id, data: { weeklyRevision: e.target.checked } })}
                              className="w-3.5 h-3.5 accent-amber-600" />
                          </label>
                        </div>

                        {/* Delete */}
                        <div className="col-span-1 flex justify-end">
                          <button onClick={() => deleteMutation.mutate(topic.id)}
                            className="p-1 rounded opacity-40 hover:opacity-70 transition-opacity" style={{ color: MUTED }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add topic */}
                <div className="px-5 py-3" style={{ borderTop: `1px solid ${BORDER}55` }}>
                  {addingTo === subject ? (
                    <div className="flex gap-2">
                      <input autoFocus type="text" value={newTopic} onChange={(e) => setNewTopic(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") addCustomTopic(subject); if (e.key === "Escape") setAddingTo(null); }}
                        placeholder="Topic name…"
                        className="flex-1 h-9 px-3 rounded-xl text-sm border-2 outline-none"
                        style={{ background: CREAM, borderColor: GOLD, color: CHARCOAL }} />
                      <button onClick={() => addCustomTopic(subject)}
                        className="px-4 h-9 rounded-xl text-sm font-semibold"
                        style={{ background: SIDEBAR, color: CREAM }}>Add</button>
                      <button onClick={() => setAddingTo(null)}
                        className="px-3 h-9 rounded-xl text-sm"
                        style={{ background: BORDER, color: MUTED }}>Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setAddingTo(subject)}
                      className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
                      style={{ color: MUTED }}>
                      <Plus className="w-3.5 h-3.5" /> Add topic
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
