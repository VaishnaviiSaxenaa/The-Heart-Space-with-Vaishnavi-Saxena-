import { useState } from "react";
import { useAuth } from "../lib/auth";
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Save,
  Edit3,
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  Map,
} from "lucide-react";
import { format, addWeeks, differenceInWeeks, parseISO } from "date-fns";

/* ─── Brand tokens ─────────────────────── */
const CREAM = "#FAF7F2";
const CHARCOAL = "#2C1810";
const GOLD = "#C9A96E";
const DARK = "#3D2314";
const CARD = "#FFFFFF";
const MUTED = "#8C7B70";
const BORDER = "#E8DDD0";
const OLIVE = "#6E8B6B";
const ROSE = "#D4A5A5";

/* ─── Types ────────────────────────────── */
type RoadmapType =
  | "bsc_1st"
  | "bsc_2nd"
  | "bsc_3rd"
  | "dropper"
  | "msc_1st"
  | "msc_2nd"
  | "working_professional";

type PhaseStatus = "not_started" | "in_progress" | "done";

interface UnavailablePeriod {
  id: string;
  label: string;
  startDate: string;
  weeks: number;
}

interface RoadmapPhase {
  id: string;
  title: string;
  description: string;
  durationWeeks: number;
  status: PhaseStatus;
  topics: string[];
  marks?: string;
}

interface Roadmap {
  type: RoadmapType;
  examType: string;
  totalMonths: number;
  startDate: string;
  phases: RoadmapPhase[];
  unavailablePeriods: UnavailablePeriod[];
  createdAt: string;
  lastUpdated: string;
}

/* ─── Roadmap type config ──────────────── */
const ROADMAP_TYPES: Record<
  RoadmapType,
  { label: string; emoji: string; defaultMonths: number; description: string }
> = {
  bsc_1st: {
    label: "BSc 1st Year",
    emoji: "🌱",
    defaultMonths: 36,
    description: "3-year preparation plan",
  },
  bsc_2nd: {
    label: "BSc 2nd Year",
    emoji: "📚",
    defaultMonths: 24,
    description: "2-year preparation plan",
  },
  bsc_3rd: {
    label: "BSc 3rd Year",
    emoji: "🎯",
    defaultMonths: 8,
    description: "6–8 month intensive plan",
  },
  dropper: {
    label: "Dropper",
    emoji: "💪",
    defaultMonths: 12,
    description: "12-month focused plan",
  },
  msc_1st: {
    label: "MSc 1st Year",
    emoji: "🔬",
    defaultMonths: 18,
    description: "18-month preparation plan",
  },
  msc_2nd: {
    label: "MSc 2nd Year",
    emoji: "🏆",
    defaultMonths: 6,
    description: "6-month final push",
  },
  working_professional: {
    label: "Working Professional",
    emoji: "💼",
    defaultMonths: 15,
    description: "12–18 month flexible plan",
  },
};

/* ─── JAM Phases ───────────────────────── */
const JAM_PHASES: Omit<RoadmapPhase, "durationWeeks" | "status">[] = [
  {
    id: "jam_p1",
    title: "Phase 1 — Foundation",
    description:
      "Build a strong foundation in the two highest-weightage topics. Complete time, practice, and revision required before moving ahead.",
    marks: "28–31 marks (Linear Algebra 14–16 + Real Analysis 14–15)",
    topics: [
      "Linear Algebra — System of Linear Equations, Vector Spaces, Linear Transformations, Eigenvalues & Eigenvectors, Matrices",
      "Real Analysis — Set Theory, Real Numbers, Sequences, Series, Limits & Continuity, Differentiability, Riemann Integration, Functions of Several Variables",
    ],
  },
  {
    id: "jam_p2",
    title: "Phase 2 — Calculus & Algebra",
    description:
      "Differential Calculus (Functions of One Variable) and Group Theory. Both require deep practice and revision.",
    marks: "24–26 marks (DC 14–15 + Group Theory 10–11)",
    topics: [
      "Differential Calculus — Limits, Continuity, Differentiability, MVT, Taylor's Theorem, Maxima-Minima, Curve Sketching",
      "Group Theory — Basics (Subgroups, Cyclic Groups, Cosets, Lagrange), Intermediate (Normal Subgroups, Quotient Groups, Isomorphism Theorems, Permutation Groups)",
    ],
  },
  {
    id: "jam_p3",
    title: "Phase 3 — ODEs, MVC & Integration",
    description:
      "ODE, Multivariable Calculus (Functions of Two Variables), and Integral Calculus. Final phase before revision and mock tests.",
    marks: "~30 marks (ODE 10–11 + MVC 10 + Integration 10 + Miscellaneous 5)",
    topics: [
      "ODE — First Order (Separable, Exact, Bernoulli, Clairaut), Higher Order (Constant Coefficients, Variation of Parameters, Cauchy-Euler)",
      "Multivariable Calculus — Limits in ℝⁿ, Partial Derivatives, Chain Rule, MVT, Taylor's Theorem, Lagrange Multipliers",
      "Integration — Double Integrals (Cartesian & Polar), Triple Integrals (Spherical & Cylindrical), Surface Area, Solids of Revolution",
      "Miscellaneous — remaining topics from syllabus",
    ],
  },
  {
    id: "jam_p4",
    title: "Phase 4 — Revision & Mock Tests",
    description:
      "Full syllabus revision, topic-wise mock tests, error analysis, and exam strategy.",
    marks: "All topics",
    topics: [
      "Complete Phase 1 revision — LA + RA",
      "Complete Phase 2 revision — DC + Group Theory",
      "Complete Phase 3 revision — ODE + MVC + Integration",
      "Full-length mock tests — time management, accuracy",
      "Weak area identification and focused practice",
      "Formula sheets, quick notes, exam-day strategy",
    ],
  },
];

/* ─── NET Phases ───────────────────────── */
const NET_PHASES: Omit<RoadmapPhase, "durationWeeks" | "status">[] = [
  {
    id: "net_p1",
    title: "Phase 1 — Analysis & Algebra",
    description:
      "Real Analysis and Linear Algebra form the core of Phase 1. Complete mastery required before advancing.",
    topics: [
      "Real Analysis — Set Theory, Real Numbers, Topology of ℝ, Sequences, Series, Continuity, Differentiability, Riemann Integration, Functions of Several Variables, Sequences of Functions, Lebesgue Measure, Metric Spaces",
      "Linear Algebra — System of Linear Equations, Vector Spaces, Linear Transformations, Eigenvalues & Eigenvectors, Matrices, Inner Product Spaces, Jordan Canonical Form, Dual Spaces",
    ],
  },
  {
    id: "net_p2",
    title: "Phase 2 — Complex Analysis & Modern Algebra",
    description:
      "Complex Analysis and Modern Algebra (Abstract Algebra). Both are high-weightage and require deep conceptual clarity.",
    topics: [
      "Complex Analysis — Complex Numbers, Analytic Functions, Cauchy-Riemann Equations, Complex Integration, Cauchy's Theorem, Power Series, Laurent Series, Singularities, Residue Theorem, Möbius Transformations, Maximum Modulus, Conformal Mappings",
      "Modern Algebra — Group Theory (Basics, Intermediate, Advanced, Sylow), Ring Theory (Basics, Advanced), Field Theory, Galois Theory (Statement)",
      "Topology — Topological Spaces, Continuity, Separation Axioms, Compactness, Connectedness, Quotient Topology",
      "Functional Analysis — Normed Spaces, Hilbert Spaces, Bounded Operators, Hahn-Banach, Open Mapping, Uniform Boundedness",
    ],
  },
  {
    id: "net_p3",
    title: "Phase 3 — Optional & Applied Topics",
    description:
      "Students must complete ODE, PDE, and any two from: Integral Calculus (IA), Calculus of Variations (COV), Numerical Analysis.",
    topics: [
      "ODE — First Order, Higher Order, System of ODEs, Power Series Solutions, Frobenius Method, Sturm-Liouville",
      "PDE — First Order PDEs, Classification, Wave Equation, Heat Equation, Laplace Equation, Fourier Methods",
      "Integral Calculus (IA) — Double & Triple Integrals, Surface Area, Solids of Revolution",
      "Calculus of Variations (COV) — Euler-Lagrange Equation, Brachistochrone, Geodesics, Isoperimetric Problems",
      "Numerical Analysis — Root Finding, Interpolation, Numerical Integration, Numerical Linear Algebra, Numerical ODEs",
      "Linear Programming — Simplex Method, Duality, Transportation & Assignment",
      "Statistics & Probability — Distributions, Estimation, Hypothesis Testing",
    ],
  },
  {
    id: "net_p4",
    title: "Phase 4 — Revision & Mock Tests",
    description:
      "Complete revision of all phases, full-length mock tests, weak area targeting, and exam strategy.",
    topics: [
      "Phase 1 full revision — Real Analysis + Linear Algebra",
      "Phase 2 full revision — Complex Analysis + Modern Algebra + Topology + Functional Analysis",
      "Phase 3 full revision — ODE + PDE + chosen optional topics",
      "Full-length mock tests with time management",
      "Weak area identification and focused revision",
      "Formula sheets, theorem lists, exam-day strategy",
    ],
  },
];

/* ─── Generate phases with duration ───── */
function generatePhases(examType: string, totalMonths: number): RoadmapPhase[] {
  const totalWeeks = totalMonths * 4;
  const template = examType === "JAM" ? JAM_PHASES : NET_PHASES;
  const weights =
    examType === "JAM"
      ? [0.3, 0.28, 0.27, 0.15] /* Phase 4 = revision */
      : [0.28, 0.3, 0.27, 0.15];

  return template.map((p, i) => ({
    ...p,
    durationWeeks: Math.max(1, Math.round(totalWeeks * weights[i])),
    status: "not_started" as PhaseStatus,
  }));
}

/* ─── AI Calculation Engine ────────────── */
interface AICalc {
  effectiveWeeks: number;
  unavailableWeeks: number;
  estimatedEndDate: string;
  weeklyTargetPercent: number;
  completedPercent: number;
  status: "on_track" | "ahead" | "behind" | "critical";
  statusMessage: string;
  recommendation: string;
  adjustedPhases: RoadmapPhase[];
}

function runAIEngine(roadmap: Roadmap): AICalc {
  const totalWeeks = roadmap.totalMonths * 4;
  const unavailableWeeks = roadmap.unavailablePeriods.reduce(
    (s, p) => s + p.weeks,
    0,
  );
  const effectiveWeeks = totalWeeks + unavailableWeeks;

  const startDate = parseISO(roadmap.startDate);
  const estimatedEnd = addWeeks(startDate, effectiveWeeks);
  const now = new Date();
  const weeksElapsed = Math.max(0, differenceInWeeks(now, startDate));
  const weeksLeft = Math.max(0, effectiveWeeks - weeksElapsed);

  const donePhasesWeeks = roadmap.phases
    .filter((p) => p.status === "done")
    .reduce((s, p) => s + p.durationWeeks, 0);

  const completedPercent =
    totalWeeks > 0
      ? Math.min(100, Math.round((donePhasesWeeks / totalWeeks) * 100))
      : 0;

  const expectedPercent =
    effectiveWeeks > 0
      ? Math.min(100, Math.round((weeksElapsed / effectiveWeeks) * 100))
      : 0;

  const diff = completedPercent - expectedPercent;

  let status: AICalc["status"], statusMessage: string, recommendation: string;

  if (weeksElapsed === 0) {
    status = "on_track";
    statusMessage = "Roadmap created — ready to begin! 🌱";
    recommendation = "Start Phase 1 and aim for consistent daily progress.";
  } else if (diff >= 10) {
    status = "ahead";
    statusMessage = `Excellent! You're ahead of schedule. 🎉`;
    recommendation = "Use extra time for deeper practice and mock tests.";
  } else if (diff >= -5) {
    status = "on_track";
    statusMessage = "You're right on track! Keep going. 💪";
    recommendation = "Maintain your current pace. Don't skip sessions.";
  } else if (diff >= -15) {
    status = "behind";
    statusMessage = `Slightly behind schedule. Don't worry — adjustable.`;
    recommendation = `Add ${Math.ceil(Math.abs(diff) / 10)} extra study sessions per week to catch up.`;
  } else {
    status = "critical";
    statusMessage = "Significantly behind. Immediate plan adjustment needed.";
    recommendation =
      "Focus intensely on high-weightage topics. Consider reducing scope of lower-priority sections.";
  }

  /* Redistribute unavailable weeks across remaining phases */
  const remaining = roadmap.phases.filter((p) => p.status !== "done");
  const remainingTotal = remaining.reduce((s, p) => s + p.durationWeeks, 0);

  const adjustedPhases = roadmap.phases.map((p) => {
    if (p.status === "done") return p;
    const prop = remainingTotal > 0 ? p.durationWeeks / remainingTotal : 0;
    const extra = Math.round(unavailableWeeks * prop);
    return { ...p, durationWeeks: p.durationWeeks + extra };
  });

  const weeklyTargetPercent =
    weeksLeft > 0 ? Math.ceil((100 - completedPercent) / weeksLeft) : 0;

  return {
    effectiveWeeks,
    unavailableWeeks,
    estimatedEndDate: format(estimatedEnd, "MMMM d, yyyy"),
    weeklyTargetPercent,
    completedPercent,
    status,
    statusMessage,
    recommendation,
    adjustedPhases,
  };
}

/* ─── localStorage ─────────────────────── */
function lsKey(userId: string) {
  return `hs_roadmap_${userId}`;
}
function loadRoadmap(userId: string): Roadmap | null {
  try {
    const r = localStorage.getItem(lsKey(userId));
    return r ? JSON.parse(r) : null;
  } catch {
    return null;
  }
}
function saveRoadmap(userId: string, rm: Roadmap) {
  localStorage.setItem(lsKey(userId), JSON.stringify(rm));
}

/* ─── Status config ────────────────────── */
const STATUS_CFG = {
  on_track: {
    label: "On Track",
    color: OLIVE,
    bg: `${OLIVE}22`,
    icon: CheckCircle2,
  },
  ahead: { label: "Ahead", color: "#2D7A2D", bg: "#DFF0DA", icon: TrendingUp },
  behind: {
    label: "Behind",
    color: "#B8860B",
    bg: "#FFF8DC",
    icon: TrendingDown,
  },
  critical: {
    label: "Critical",
    color: "#C0392B",
    bg: "#FDE8E8",
    icon: AlertCircle,
  },
};

const PHASE_STATUS = {
  not_started: { label: "—", color: MUTED },
  in_progress: { label: "▶", color: GOLD },
  done: { label: "✓", color: OLIVE },
};

/* ─── Roadmap Selector ─────────────────── */
function RoadmapSelector({
  examType,
  onSelect,
}: {
  examType: string;
  onSelect: (type: RoadmapType, months: number) => void;
}) {
  const [selected, setSelected] = useState<RoadmapType | null>(null);
  const [months, setMonths] = useState(12);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1
          className="text-3xl font-serif font-bold"
          style={{ color: CHARCOAL }}
        >
          My Roadmap
        </h1>
        <p className="mt-1 text-sm" style={{ color: MUTED }}>
          Set up your {examType === "JAM" ? "IIT JAM" : "CSIR NET / GATE"}{" "}
          preparation roadmap.
        </p>
      </div>

      <div
        className="rounded-2xl p-6"
        style={{ background: CARD, border: `1px solid ${BORDER}` }}
      >
        <h2
          className="font-serif text-lg font-semibold mb-1"
          style={{ color: CHARCOAL }}
        >
          What is your current academic stage?
        </h2>
        <p className="text-xs mb-5" style={{ color: MUTED }}>
          This sets your default preparation timeline. You can edit it anytime.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          {(
            Object.entries(ROADMAP_TYPES) as [
              RoadmapType,
              (typeof ROADMAP_TYPES)[RoadmapType],
            ][]
          ).map(([key, cfg]) => {
            const isSelected = selected === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setSelected(key);
                  setMonths(cfg.defaultMonths);
                }}
                className="flex items-start gap-3 p-4 rounded-xl text-left transition-all duration-150 hover:scale-[1.01]"
                style={{
                  background: isSelected ? `${GOLD}15` : CREAM,
                  border: `2px solid ${isSelected ? GOLD : BORDER}`,
                  boxShadow: isSelected ? `0 4px 16px ${GOLD}30` : "none",
                }}
              >
                <span className="text-2xl flex-shrink-0">{cfg.emoji}</span>
                <div>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: isSelected ? DARK : CHARCOAL }}
                  >
                    {cfg.label}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: MUTED }}>
                    {cfg.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {selected && (
          <div
            className="space-y-4 pt-4"
            style={{ borderTop: `1px solid ${BORDER}` }}
          >
            <div>
              <label
                className="text-sm font-semibold block mb-2"
                style={{ color: CHARCOAL }}
              >
                Total preparation time:{" "}
                <span style={{ color: GOLD }}>{months} months</span>
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={1}
                  max={36}
                  value={months}
                  onChange={(e) => setMonths(parseInt(e.target.value))}
                  className="flex-1 accent-amber-600"
                />
                <div
                  className="px-4 py-2 rounded-xl flex items-center gap-1 min-w-[80px] justify-center"
                  style={{
                    background: `${GOLD}22`,
                    border: `1px solid ${GOLD}44`,
                  }}
                >
                  <span
                    className="text-lg font-bold font-serif"
                    style={{ color: DARK }}
                  >
                    {months}
                  </span>
                  <span className="text-xs" style={{ color: MUTED }}>
                    mo
                  </span>
                </div>
              </div>
              <p className="text-xs mt-1" style={{ color: MUTED }}>
                Recommended for {ROADMAP_TYPES[selected].label}:{" "}
                {ROADMAP_TYPES[selected].defaultMonths} months
              </p>
            </div>

            <div
              className="rounded-xl p-4 space-y-2"
              style={{ background: `${GOLD}08`, border: `1px solid ${GOLD}33` }}
            >
              <p className="text-xs font-semibold" style={{ color: DARK }}>
                Your roadmap will have {examType === "JAM" ? "4" : "4"} phases:
              </p>
              {(examType === "JAM" ? JAM_PHASES : NET_PHASES).map((p, i) => (
                <div key={p.id} className="flex items-start gap-2">
                  <span
                    className="text-xs font-bold w-4 flex-shrink-0"
                    style={{ color: GOLD }}
                  >
                    {i + 1}
                  </span>
                  <div>
                    <span
                      className="text-xs font-semibold"
                      style={{ color: CHARCOAL }}
                    >
                      {p.title}
                    </span>
                    {p.marks && (
                      <span
                        className="text-[10px] ml-2"
                        style={{ color: MUTED }}
                      >
                        · {p.marks}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => onSelect(selected, months)}
              className="w-full h-12 rounded-xl font-semibold text-sm transition-all hover:scale-[1.01]"
              style={{
                background: `linear-gradient(135deg, #A07840 0%, ${GOLD} 100%)`,
                color: "#fff",
                boxShadow: "0 4px 16px rgba(201,169,110,.35)",
              }}
            >
              Create My Roadmap →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Roadmap View ─────────────────────── */
function RoadmapView({
  roadmap,
  userId,
  onReset,
}: {
  roadmap: Roadmap;
  userId: string;
  onReset: () => void;
}) {
  const [rm, setRm] = useState(roadmap);
  const [editMonths, setEditMonths] = useState(false);
  const [newMonths, setNewMonths] = useState(rm.totalMonths);
  const [showUnavail, setShowUnavail] = useState(false);
  const [unavailForm, setUnavailForm] = useState({
    label: "",
    startDate: "",
    weeks: 1,
  });
  const [expandPhase, setExpandPhase] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);

  const calc = runAIEngine(rm);
  const statusCfg = STATUS_CFG[calc.status];
  const StatusIcon = statusCfg.icon;

  function persist(next: Roadmap) {
    const updated = { ...next, lastUpdated: new Date().toISOString() };
    setRm(updated);
    saveRoadmap(userId, updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function applyNewMonths() {
    const newPhases = generatePhases(rm.examType, newMonths);
    const merged = newPhases.map((p, i) => ({
      ...p,
      status: rm.phases[i]?.status ?? "not_started",
    }));
    persist({ ...rm, totalMonths: newMonths, phases: merged });
    setEditMonths(false);
  }

  function addUnavailPeriod() {
    if (!unavailForm.label || !unavailForm.startDate) return;
    const period: UnavailablePeriod = {
      id: `${Date.now()}`,
      label: unavailForm.label,
      startDate: unavailForm.startDate,
      weeks: unavailForm.weeks,
    };
    persist({ ...rm, unavailablePeriods: [...rm.unavailablePeriods, period] });
    setUnavailForm({ label: "", startDate: "", weeks: 1 });
    setShowUnavail(false);
  }

  function removeUnavailPeriod(id: string) {
    persist({
      ...rm,
      unavailablePeriods: rm.unavailablePeriods.filter((p) => p.id !== id),
    });
  }

  function updatePhaseStatus(phaseId: string, status: PhaseStatus) {
    persist({
      ...rm,
      phases: rm.phases.map((p) => (p.id === phaseId ? { ...p, status } : p)),
    });
  }

  const examLabel = rm.examType === "JAM" ? "IIT JAM" : "CSIR NET / GATE";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1
            className="text-3xl font-serif font-bold"
            style={{ color: CHARCOAL }}
          >
            My Roadmap
          </h1>
          <p className="mt-1 text-sm" style={{ color: MUTED }}>
            {ROADMAP_TYPES[rm.type].emoji} {ROADMAP_TYPES[rm.type].label} ·{" "}
            {examLabel} · {rm.totalMonths} months
          </p>
        </div>
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
          style={{ background: BORDER, color: MUTED }}
        >
          <RotateCcw className="w-3 h-3" /> Change type
        </button>
      </div>

      {/* AI Status Card */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: statusCfg.bg,
          border: `1.5px solid ${statusCfg.color}44`,
        }}
      >
        <div className="flex items-start gap-3 mb-4">
          <StatusIcon
            className="w-5 h-5 flex-shrink-0 mt-0.5"
            style={{ color: statusCfg.color }}
          />
          <div className="flex-1">
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full inline-block mb-1"
              style={{
                background: `${statusCfg.color}22`,
                color: statusCfg.color,
              }}
            >
              {statusCfg.label}
            </span>
            <p className="text-sm font-semibold" style={{ color: CHARCOAL }}>
              {calc.statusMessage}
            </p>
            <p className="text-xs mt-1" style={{ color: MUTED }}>
              {calc.recommendation}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: "Completed",
              value: `${calc.completedPercent}%`,
              color: OLIVE,
            },
            { label: "Est. Finish", value: calc.estimatedEndDate, color: DARK },
            {
              label: "Weekly Target",
              value: `${calc.weeklyTargetPercent}% / wk`,
              color: GOLD,
            },
            {
              label: "Paused",
              value: `${calc.unavailableWeeks} wk(s)`,
              color: MUTED,
            },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="rounded-xl p-3 text-center"
              style={{ background: "rgba(255,255,255,0.7)" }}
            >
              <div className="text-sm font-bold font-serif" style={{ color }}>
                {value}
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: MUTED }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <div
            className="flex justify-between text-xs mb-1"
            style={{ color: MUTED }}
          >
            <span>Overall Progress</span>
            <span>{calc.completedPercent}%</span>
          </div>
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ background: BORDER }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${calc.completedPercent}%`,
                background:
                  calc.status === "critical"
                    ? "#C0392B"
                    : calc.status === "behind"
                      ? "#B8860B"
                      : calc.status === "ahead"
                        ? "#2D7A2D"
                        : OLIVE,
              }}
            />
          </div>
        </div>
      </div>

      {/* Timeline editor */}
      <div
        className="rounded-2xl p-5"
        style={{ background: CARD, border: `1px solid ${BORDER}` }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" style={{ color: GOLD }} />
            <h3 className="font-semibold text-sm" style={{ color: CHARCOAL }}>
              Timeline
            </h3>
          </div>
          {!editMonths && (
            <button
              onClick={() => {
                setNewMonths(rm.totalMonths);
                setEditMonths(true);
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold"
              style={{ background: `${GOLD}22`, color: DARK }}
            >
              <Edit3 className="w-3 h-3" /> Edit
            </button>
          )}
        </div>

        {editMonths ? (
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={1}
                max={36}
                value={newMonths}
                onChange={(e) => setNewMonths(parseInt(e.target.value))}
                className="flex-1 accent-amber-600"
              />
              <div
                className="px-4 py-2 rounded-xl flex items-center gap-1"
                style={{
                  background: `${GOLD}22`,
                  border: `1px solid ${GOLD}44`,
                }}
              >
                <span
                  className="text-lg font-bold font-serif"
                  style={{ color: DARK }}
                >
                  {newMonths}
                </span>
                <span className="text-xs" style={{ color: MUTED }}>
                  months
                </span>
              </div>
            </div>
            {newMonths !== rm.totalMonths && (
              <div
                className="px-3 py-2 rounded-lg text-xs"
                style={{ background: `${GOLD}12`, color: DARK }}
              >
                ✨ AI will recalculate all phase durations for {newMonths}{" "}
                months
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={applyNewMonths}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold"
                style={{
                  background: `linear-gradient(135deg, #A07840 0%, ${GOLD} 100%)`,
                  color: "#fff",
                }}
              >
                <Save className="w-3 h-3" /> Apply & Recalculate
              </button>
              <button
                onClick={() => setEditMonths(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold"
                style={{ background: BORDER, color: MUTED }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div
            className="flex flex-wrap items-center gap-4 text-sm"
            style={{ color: CHARCOAL }}
          >
            <span>
              Started:{" "}
              <strong>{format(parseISO(rm.startDate), "MMM d, yyyy")}</strong>
            </span>
            <span style={{ color: BORDER }}>·</span>
            <span>
              Duration: <strong>{rm.totalMonths} months</strong>
            </span>
            <span style={{ color: BORDER }}>·</span>
            <span>
              Est. End: <strong>{calc.estimatedEndDate}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Unavailable periods */}
      <div
        className="rounded-2xl p-5"
        style={{ background: CARD, border: `1px solid ${BORDER}` }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" style={{ color: ROSE }} />
            <h3 className="font-semibold text-sm" style={{ color: CHARCOAL }}>
              Unavailable Periods
            </h3>
          </div>
          {!showUnavail && (
            <button
              onClick={() => setShowUnavail(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold"
              style={{ background: `${ROSE}33`, color: "#8B3A3A" }}
            >
              <Plus className="w-3 h-3" /> Add
            </button>
          )}
        </div>

        <p className="text-xs mb-3" style={{ color: MUTED }}>
          Log periods when you can't study. AI extends your end date and adjusts
          phase targets automatically.
        </p>

        {showUnavail && (
          <div
            className="rounded-xl p-4 mb-3 space-y-3"
            style={{ background: CREAM, border: `1px solid ${BORDER}` }}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label
                  className="text-xs font-semibold mb-1 block"
                  style={{ color: MUTED }}
                >
                  Reason
                </label>
                <input
                  value={unavailForm.label}
                  onChange={(e) =>
                    setUnavailForm((p) => ({ ...p, label: e.target.value }))
                  }
                  placeholder="e.g. Family event, college exams…"
                  className="w-full h-9 px-3 rounded-lg text-xs border-2 outline-none"
                  style={{
                    background: CARD,
                    borderColor: BORDER,
                    color: CHARCOAL,
                  }}
                />
              </div>
              <div>
                <label
                  className="text-xs font-semibold mb-1 block"
                  style={{ color: MUTED }}
                >
                  Start date
                </label>
                <input
                  type="date"
                  value={unavailForm.startDate}
                  onChange={(e) =>
                    setUnavailForm((p) => ({ ...p, startDate: e.target.value }))
                  }
                  className="w-full h-9 px-3 rounded-lg text-xs border-2 outline-none"
                  style={{
                    background: CARD,
                    borderColor: BORDER,
                    color: CHARCOAL,
                  }}
                />
              </div>
              <div>
                <label
                  className="text-xs font-semibold mb-1 block"
                  style={{ color: MUTED }}
                >
                  Duration (weeks)
                </label>
                <input
                  type="number"
                  min={1}
                  max={52}
                  value={unavailForm.weeks}
                  onChange={(e) =>
                    setUnavailForm((p) => ({
                      ...p,
                      weeks: parseInt(e.target.value) || 1,
                    }))
                  }
                  className="w-full h-9 px-3 rounded-lg text-xs border-2 outline-none"
                  style={{
                    background: CARD,
                    borderColor: BORDER,
                    color: CHARCOAL,
                  }}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={addUnavailPeriod}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold"
                style={{
                  background: `linear-gradient(135deg, #A07840 0%, ${GOLD} 100%)`,
                  color: "#fff",
                }}
              >
                <Save className="w-3 h-3" /> Add & Recalculate
              </button>
              <button
                onClick={() => setShowUnavail(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold"
                style={{ background: BORDER, color: MUTED }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {rm.unavailablePeriods.length === 0 && !showUnavail && (
          <p className="text-xs" style={{ color: MUTED }}>
            No unavailable periods logged.
          </p>
        )}
        <div className="space-y-2">
          {rm.unavailablePeriods.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl"
              style={{ background: `${ROSE}15`, border: `1px solid ${ROSE}44` }}
            >
              <div>
                <span
                  className="text-sm font-medium"
                  style={{ color: CHARCOAL }}
                >
                  {p.label}
                </span>
                <span className="text-xs ml-2" style={{ color: MUTED }}>
                  {p.startDate ? format(parseISO(p.startDate), "MMM d") : ""} ·{" "}
                  {p.weeks} week(s)
                </span>
              </div>
              <button
                onClick={() => removeUnavailPeriod(p.id)}
                className="p-1 rounded-lg"
                style={{ color: "#C0392B" }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Phases */}
      <div>
        <h2
          className="font-serif text-lg font-semibold mb-3"
          style={{ color: CHARCOAL }}
        >
          Preparation Phases
        </h2>
        <p className="text-xs mb-4" style={{ color: MUTED }}>
          Phase durations adjust automatically when you edit your timeline or
          add unavailable periods.
        </p>

        <div className="space-y-3">
          {calc.adjustedPhases.map((phase, idx) => {
            const isOpen = expandPhase[phase.id] ?? false;
            const weekStart = calc.adjustedPhases
              .slice(0, idx)
              .reduce((s, p) => s + p.durationWeeks, 0);
            const phaseStart = addWeeks(parseISO(rm.startDate), weekStart);
            const phaseEnd = addWeeks(phaseStart, phase.durationWeeks);

            return (
              <div
                key={phase.id}
                className="rounded-2xl overflow-hidden"
                style={{ background: CARD, border: `1px solid ${BORDER}` }}
              >
                <div className="flex items-center gap-3 px-5 py-4">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                    style={{
                      background:
                        phase.status === "done" ? `${OLIVE}22` : `${GOLD}22`,
                      color: phase.status === "done" ? OLIVE : DARK,
                    }}
                  >
                    {idx + 1}
                  </div>

                  <button
                    onClick={() =>
                      setExpandPhase((p) => ({
                        ...p,
                        [phase.id]: !p[phase.id],
                      }))
                    }
                    className="flex-1 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="text-sm font-semibold"
                        style={{ color: CHARCOAL }}
                      >
                        {phase.title}
                      </span>
                      {isOpen ? (
                        <ChevronDown
                          className="w-3.5 h-3.5"
                          style={{ color: MUTED }}
                        />
                      ) : (
                        <ChevronRight
                          className="w-3.5 h-3.5"
                          style={{ color: MUTED }}
                        />
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      <span className="text-xs" style={{ color: MUTED }}>
                        {phase.durationWeeks} weeks ·{" "}
                        {format(phaseStart, "MMM d")} →{" "}
                        {format(phaseEnd, "MMM d")}
                      </span>
                      {(phase as any).marks && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full"
                          style={{ background: `${GOLD}15`, color: DARK }}
                        >
                          {(phase as any).marks}
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Status selector */}
                  <div className="flex gap-1 flex-shrink-0">
                    {(
                      ["not_started", "in_progress", "done"] as PhaseStatus[]
                    ).map((s) => {
                      const cfg = PHASE_STATUS[s];
                      const active = phase.status === s;
                      return (
                        <button
                          key={s}
                          onClick={() => updatePhaseStatus(phase.id, s)}
                          className="w-8 h-8 rounded-lg text-xs font-bold transition-all"
                          style={
                            active
                              ? {
                                  background:
                                    cfg.color === MUTED ? DARK : cfg.color,
                                  color: "#fff",
                                }
                              : { background: `${BORDER}88`, color: MUTED }
                          }
                        >
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {isOpen && (
                  <div
                    className="px-5 pb-4"
                    style={{ borderTop: `1px solid ${BORDER}` }}
                  >
                    <p
                      className="text-xs mt-3 mb-3 leading-relaxed"
                      style={{ color: MUTED }}
                    >
                      {phase.description}
                    </p>
                    <div className="space-y-2">
                      {phase.topics.map((t, ti) => (
                        <div
                          key={ti}
                          className="flex items-start gap-2 px-3 py-2 rounded-xl"
                          style={{
                            background: CREAM,
                            border: `1px solid ${BORDER}`,
                          }}
                        >
                          <div
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5"
                            style={{ background: GOLD }}
                          />
                          <span
                            className="text-xs leading-relaxed"
                            style={{ color: CHARCOAL }}
                          >
                            {t}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {saved && (
        <div
          className="fixed bottom-6 right-6 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg z-50"
          style={{ background: OLIVE, color: "#fff" }}
        >
          ✓ Roadmap saved & recalculated
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ───────────────────── */
export default function Roadmap() {
  const { user } = useAuth();
  const userId = String(user?.id ?? "guest");
  const examType = ((user as any)?.exam_type as string | null) ?? "JAM";
  const space = (user as any)?.space as string | null;

  const [roadmap, setRoadmap] = useState<Roadmap | null>(() =>
    loadRoadmap(userId),
  );

  function handleSelect(type: RoadmapType, months: number) {
    const phases = generatePhases(examType ?? "JAM", months);
    const rm: Roadmap = {
      type,
      examType: examType ?? "JAM",
      totalMonths: months,
      startDate: new Date().toISOString().split("T")[0],
      phases,
      unavailablePeriods: [],
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };
    setRoadmap(rm);
    saveRoadmap(userId, rm);
  }

  function handleReset() {
    if (!confirm("Reset your roadmap? Your progress will be lost.")) return;
    localStorage.removeItem(lsKey(userId));
    setRoadmap(null);
  }

  if (space === "heartspace") {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <h1
          className="text-3xl font-serif font-bold"
          style={{ color: CHARCOAL }}
        >
          Roadmap
        </h1>
        <div
          className="text-center py-20 rounded-2xl"
          style={{ background: CREAM, border: `1.5px dashed ${BORDER}` }}
        >
          <Map
            className="w-10 h-10 mx-auto mb-3 opacity-30"
            style={{ color: GOLD }}
          />
          <p className="text-sm font-medium" style={{ color: CHARCOAL }}>
            Roadmap not available for HeartSpace
          </p>
          <p className="text-xs mt-1" style={{ color: MUTED }}>
            This feature is for academic preparation students.
          </p>
        </div>
      </div>
    );
  }

  if (!roadmap)
    return (
      <RoadmapSelector examType={examType ?? "JAM"} onSelect={handleSelect} />
    );
  return (
    <RoadmapView roadmap={roadmap} userId={userId} onReset={handleReset} />
  );
}
