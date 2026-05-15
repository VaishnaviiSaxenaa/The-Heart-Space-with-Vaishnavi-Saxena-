import { useState } from "react";
import { useAuth } from "../lib/auth";
import { ChevronDown, ChevronRight, GraduationCap } from "lucide-react";

const CREAM    = "#FAF7F2";
const CHARCOAL = "#2C1810";
const GOLD     = "#C9A96E";
const DARK     = "#3D2314";
const CARD     = "#FFFFFF";
const MUTED    = "#8C7B70";
const BORDER   = "#E8DDD0";
const SAGE     = "#A8BFA3";
const OLIVE    = "#6E8B6B";

const SUBJECTS = [
  "Calculus",
  "Linear Algebra",
  "Real Analysis",
  "Abstract Algebra",
  "Complex Analysis",
  "Differential Equations",
  "Probability & Statistics",
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

function lsKey(userId: string) { return `hs_syllabus_${userId}`; }

type SyllabusData = Record<string, Record<string, boolean>>;

function loadSyllabus(userId: string): SyllabusData {
  try {
    const raw = localStorage.getItem(lsKey(userId));
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveSyllabus(userId: string, data: SyllabusData) {
  localStorage.setItem(lsKey(userId), JSON.stringify(data));
}

function pct(topics: Record<string, boolean>) {
  const keys = Object.keys(topics);
  if (!keys.length) return 0;
  return Math.round(Object.values(topics).filter(Boolean).length / keys.length * 100);
}

function barColor(p: number) {
  if (p >= 80) return OLIVE;
  if (p >= 50) return GOLD;
  return "#C9A05A";
}

export function loadSyllabusData(userId: string): SyllabusData {
  return loadSyllabus(userId);
}

export default function Syllabus() {
  const { user } = useAuth();
  const userId = String(user?.id ?? "guest");

  const [data, setData] = useState<SyllabusData>(() => loadSyllabus(userId));
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  function persist(next: SyllabusData) {
    setData(next);
    saveSyllabus(userId, next);
  }

  function toggleTopic(subject: string, topic: string) {
    const next: SyllabusData = {
      ...data,
      [subject]: {
        ...(data[subject] ?? {}),
        [topic]: !(data[subject]?.[topic] ?? false),
      },
    };
    persist(next);
  }

  function initSubject(subject: string) {
    const topics: Record<string, boolean> = {};
    (DEFAULT_TOPICS[subject] ?? []).forEach((t) => { topics[t] = false; });
    persist({ ...data, [subject]: { ...(data[subject] ?? {}), ...topics } });
  }

  const allTopicsCount = Object.values(data).reduce((s, t) => s + Object.keys(t).length, 0);
  const allDoneCount   = Object.values(data).reduce((s, t) => s + Object.values(t).filter(Boolean).length, 0);
  const overallPct     = allTopicsCount ? Math.round(allDoneCount / allTopicsCount * 100) : 0;

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
        <div className="rounded-2xl px-6 py-4 text-center min-w-[150px]"
          style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: "0 2px 8px rgba(44,24,16,.07)" }}>
          <div className="text-3xl font-serif font-bold" style={{ color: DARK }}>{overallPct}%</div>
          <div className="text-xs mt-0.5 font-medium" style={{ color: MUTED }}>Overall Complete</div>
          <div className="text-xs mt-0.5" style={{ color: MUTED }}>{allDoneCount}/{allTopicsCount} topics</div>
          {allTopicsCount > 0 && (
            <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: BORDER }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${overallPct}%`, background: barColor(overallPct) }} />
            </div>
          )}
        </div>
      </div>

      {/* Subjects */}
      {SUBJECTS.map((subject) => {
        const subTopics  = data[subject] ?? {};
        const topicKeys  = Object.keys(subTopics);
        const p          = pct(subTopics);
        const isOpen     = expanded[subject] ?? false;
        const doneCount  = Object.values(subTopics).filter(Boolean).length;

        return (
          <div key={subject} className="rounded-2xl overflow-hidden"
            style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: "0 2px 8px rgba(44,24,16,.05)" }}>

            {/* Subject header */}
            <button
              className="w-full flex items-center justify-between px-5 py-4 transition-all hover:opacity-90 text-left"
              onClick={() => setExpanded((e) => ({ ...e, [subject]: !isOpen }))}>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {isOpen
                  ? <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: GOLD }} />
                  : <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: MUTED }} />}
                <span className="font-semibold" style={{ color: CHARCOAL }}>{subject}</span>
                {topicKeys.length > 0 && (
                  <span className="text-xs" style={{ color: MUTED }}>{doneCount}/{topicKeys.length}</span>
                )}
              </div>
              <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                <div className="hidden md:block w-28">
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: BORDER }}>
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${p}%`, background: barColor(p) }} />
                  </div>
                </div>
                <span className="text-sm font-bold" style={{ color: barColor(p) || MUTED }}>
                  {topicKeys.length ? `${p}%` : "—"}
                </span>
              </div>
            </button>

            {/* Topics */}
            {isOpen && (
              <div style={{ background: CREAM, borderTop: `1px solid ${BORDER}` }}>
                {topicKeys.length === 0 ? (
                  <div className="px-5 py-8 text-center">
                    <p className="text-sm mb-4" style={{ color: MUTED }}>No topics loaded yet.</p>
                    <button
                      onClick={() => initSubject(subject)}
                      className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
                      style={{ background: `${GOLD}22`, color: DARK }}>
                      + Load default topics for {subject}
                    </button>
                  </div>
                ) : (
                  <div className="divide-y" style={{ borderColor: `${BORDER}88` }}>
                    {topicKeys.map((topic) => {
                      const done = subTopics[topic];
                      return (
                        <label key={topic}
                          className="flex items-center gap-4 px-5 py-3.5 cursor-pointer hover:bg-white transition-colors group">
                          {/* Custom checkbox */}
                          <div
                            onClick={() => toggleTopic(subject, topic)}
                            className="flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200"
                            style={{
                              borderColor: done ? OLIVE : "#C5B8AC",
                              background: done ? OLIVE : "transparent",
                              boxShadow: done ? `0 0 0 3px ${OLIVE}22` : "none",
                            }}>
                            {done && (
                              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                <path d="M1 4L3.8 7L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                          <span
                            className="flex-1 text-sm font-medium transition-all"
                            style={{
                              color: done ? MUTED : CHARCOAL,
                              textDecoration: done ? "line-through" : "none",
                            }}>
                            {topic}
                          </span>
                          {done && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                              style={{ background: `${OLIVE}22`, color: OLIVE }}>
                              Done ✓
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
