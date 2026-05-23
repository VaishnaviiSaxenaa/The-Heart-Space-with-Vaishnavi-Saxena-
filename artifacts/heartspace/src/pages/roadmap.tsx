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
  Brain,
  BookOpen,
  Zap,
} from "lucide-react";
import {
  format,
  addWeeks,
  differenceInWeeks,
  parseISO,
  addDays,
} from "date-fns";

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
const SAGE = "#A8BFA3";

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
type WeekType = "study" | "assignment" | "revision" | "buffer";

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

interface ScheduleWeek {
  weekNumber: number;
  subject: string;
  focus: string;
  type: WeekType;
  hoursRequired: number;
  hoursAvailable: number;
  startDate: string;
}

interface SmartSchedule {
  hoursPerDay: number;
  daysPerWeek: number;
  targetMonths: number;
  revisionPercent: number;
  totalHoursAvailable: number;
  totalHoursRequired: number;
  totalWeeksRequired: number;
  isAchievable: boolean;
  minimumMonthsNeeded: number;
  weeks: ScheduleWeek[];
  generatedAt: string;
}

interface Roadmap {
  type: RoadmapType;
  examType: string;
  totalMonths: number;
  startDate: string;
  phases: RoadmapPhase[];
  unavailablePeriods: UnavailablePeriod[];
  smartSchedule?: SmartSchedule;
  createdAt: string;
  lastUpdated: string;
}

/* ─── Subject time data (weeks) ─────────── */
const JAM_SUBJECTS = [
  { id: "la", name: "Linear Algebra", studyWeeks: 4, assignmentWeeks: 0.5 },
  { id: "ra", name: "Real Analysis", studyWeeks: 4, assignmentWeeks: 0.5 },
  {
    id: "dc",
    name: "Functions of One Variable",
    studyWeeks: 4,
    assignmentWeeks: 0.5,
  },
  { id: "gt", name: "Group Theory", studyWeeks: 4, assignmentWeeks: 0.5 },
  { id: "ode", name: "ODE", studyWeeks: 3, assignmentWeeks: 0.5 },
  {
    id: "mvc",
    name: "Functions of Two Variables",
    studyWeeks: 2,
    assignmentWeeks: 0.5,
  },
  {
    id: "mi",
    name: "Multiple Integration",
    studyWeeks: 2,
    assignmentWeeks: 0.5,
  },
];

const NET_SUBJECTS = [
  { id: "ra", name: "Real Analysis", studyWeeks: 4, assignmentWeeks: 0.5 },
  { id: "la", name: "Linear Algebra", studyWeeks: 4, assignmentWeeks: 0.5 },
  { id: "ca", name: "Complex Analysis", studyWeeks: 3, assignmentWeeks: 0.5 },
  {
    id: "ma",
    name: "Modern Algebra (Group + Ring + Field)",
    studyWeeks: 5,
    assignmentWeeks: 1,
  },
  { id: "top", name: "Topology", studyWeeks: 3, assignmentWeeks: 0.5 },
  {
    id: "fa",
    name: "Functional Analysis",
    studyWeeks: 2,
    assignmentWeeks: 0.5,
  },
  { id: "ode", name: "ODE", studyWeeks: 3, assignmentWeeks: 0.5 },
  { id: "pde", name: "PDE", studyWeeks: 2, assignmentWeeks: 0.5 },
  {
    id: "na",
    name: "Numerical Analysis",
    studyWeeks: 1,
    assignmentWeeks: 0.25,
  },
  {
    id: "ie",
    name: "Integral Equations",
    studyWeeks: 1,
    assignmentWeeks: 0.25,
  },
  {
    id: "cov",
    name: "Calculus of Variations",
    studyWeeks: 1,
    assignmentWeeks: 0.25,
  },
];

/* ─── Week breakdown per subject ────────── */
const JAM_WEEK_BREAKDOWN: Record<string, string[]> = {
  la: [
    "System of Linear Equations, Vector Spaces basics",
    "Linear Transformations, Kernel & Image",
    "Eigenvalues, Eigenvectors, Cayley-Hamilton",
    "Matrices, Diagonalisation + Assignment",
  ],
  ra: [
    "Set Theory, Real Numbers, Sequences",
    "Series, Limits & Continuity",
    "Differentiability, MVT, Taylor's Theorem",
    "Riemann Integration, Functions of Several Variables + Assignment",
  ],
  dc: [
    "Limits, Continuity, Uniform Continuity",
    "Differentiability, Chain Rule, MVT",
    "Taylor's Theorem, Maxima-Minima, Curve Sketching",
    "Power Series, Sequences & Series + Assignment",
  ],
  gt: [
    "Groups basics, Subgroups, Cyclic groups, Lagrange",
    "Normal Subgroups, Quotient Groups, Homomorphisms",
    "Isomorphism Theorems, Permutation Groups, Cayley",
    "Consolidation + Assignment",
  ],
  ode: [
    "First Order ODEs — Separable, Exact, Bernoulli",
    "Higher Order ODEs — Undetermined Coefficients, Variation of Parameters",
    "Cauchy-Euler + Assignment",
  ],
  mvc: [
    "Limits in ℝⁿ, Partial Derivatives, Directional Derivatives",
    "Chain Rule, MVT, Taylor, Lagrange Multipliers + Assignment",
  ],
  mi: [
    "Double Integrals (Cartesian & Polar), Change of Order",
    "Triple Integrals (Spherical & Cylindrical), Surface Area, Solids + Assignment",
  ],
};

const NET_WEEK_BREAKDOWN: Record<string, string[]> = {
  ra: [
    "Set Theory, Real Numbers, Sequences",
    "Series, Limits & Continuity",
    "Differentiability, Riemann Integration",
    "Functions of Several Variables + Assignment",
  ],
  la: [
    "Vector Spaces, Linear Transformations",
    "Eigenvalues, Inner Product Spaces, Jordan CF",
    "Dual Spaces, Diagonalisation + Assignment",
  ],
  ca: [
    "Complex Numbers, Analytic Functions, C-R Equations",
    "Complex Integration, Cauchy's Theorem, Residues",
    "Laurent Series, Singularities, Möbius + Assignment",
  ],
  ma: [
    "Group Theory basics + Intermediate",
    "Sylow Theorems, Group Actions",
    "Ring Theory (Basics + PID, UFD)",
    "Field Theory, Galois Theory",
    "Consolidation + Assignment",
  ],
  top: [
    "Topological Spaces, Continuity, Separation Axioms",
    "Compactness, Connectedness",
    "Quotient Topology + Assignment",
  ],
  fa: [
    "Normed Spaces, Banach Spaces, Hilbert Spaces",
    "Bounded Operators, Hahn-Banach, Open Mapping + Assignment",
  ],
  ode: [
    "First Order ODEs",
    "Higher Order ODEs, Cauchy-Euler",
    "Power Series, Frobenius + Assignment",
  ],
  pde: [
    "First Order PDEs, Classification",
    "Wave, Heat, Laplace Equations + Fourier + Assignment",
  ],
  na: [
    "Root Finding, Interpolation, Numerical Integration, Numerical ODEs + Assignment",
  ],
  ie: ["Integral Equations — Fredholm & Volterra + Assignment"],
  cov: ["Euler-Lagrange, Brachistochrone, Geodesics + Assignment"],
};

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

/* ─── JAM + NET phase templates ─────────── */
const JAM_PHASES: Omit<RoadmapPhase, "durationWeeks" | "status">[] = [
  {
    id: "jam_p1",
    title: "Phase 1 — Foundation",
    description:
      "Linear Algebra and Real Analysis. Complete study, assignment, and revision before moving ahead.",
    marks: "28–31 marks",
    topics: [
      "Linear Algebra — System of Linear Equations, Vector Spaces, Linear Transformations, Eigenvalues & Eigenvectors, Matrices",
      "Real Analysis — Set Theory, Real Numbers, Sequences, Series, Limits & Continuity, Differentiability, Riemann Integration, Functions of Several Variables",
    ],
  },
  {
    id: "jam_p2",
    title: "Phase 2 — Calculus & Algebra",
    description:
      "Differential Calculus and Group Theory with full practice and revision.",
    marks: "24–26 marks",
    topics: [
      "Differential Calculus — Limits, Continuity, Differentiability, MVT, Taylor, Maxima-Minima",
      "Group Theory — Basics, Normal Subgroups, Quotient Groups, Isomorphism Theorems, Permutation Groups",
    ],
  },
  {
    id: "jam_p3",
    title: "Phase 3 — ODEs, MVC & Integration",
    description: "ODE, Multivariable Calculus, and Multiple Integration.",
    marks: "~30 marks",
    topics: [
      "ODE — First Order, Higher Order, Cauchy-Euler",
      "Functions of Two Variables — Partial Derivatives, Chain Rule, Lagrange Multipliers",
      "Multiple Integration — Double & Triple Integrals, Surface Area, Solids of Revolution",
    ],
  },
  {
    id: "jam_p4",
    title: "Phase 4 — Full Revision & Mock Tests",
    description:
      "Complete syllabus revision, mock tests, weak area targeting, and exam strategy.",
    marks: "All topics",
    topics: [
      "Phase 1 full revision — LA + RA",
      "Phase 2 full revision — DC + GT",
      "Phase 3 full revision — ODE + MVC + MI",
      "Full-length mock tests",
      "Error analysis, weak area practice",
      "Formula sheets + exam strategy",
    ],
  },
];

const NET_PHASES: Omit<RoadmapPhase, "durationWeeks" | "status">[] = [
  {
    id: "net_p1",
    title: "Phase 1 — Analysis & Algebra",
    description: "Real Analysis and Linear Algebra — core of Phase 1.",
    topics: [
      "Real Analysis — complete",
      "Linear Algebra — complete including Inner Product Spaces, Jordan CF, Dual Spaces",
    ],
  },
  {
    id: "net_p2",
    title: "Phase 2 — Complex Analysis & Modern Algebra",
    description:
      "Complex Analysis, Modern Algebra, Topology, Functional Analysis.",
    topics: [
      "Complex Analysis — Analytic Functions, Cauchy, Residues, Möbius, Conformal Mappings",
      "Modern Algebra — Group Theory (Sylow), Ring Theory, Field Theory",
      "Topology — Topological Spaces, Separation Axioms, Compactness, Connectedness",
      "Functional Analysis — Banach, Hilbert, Bounded Operators, Hahn-Banach",
    ],
  },
  {
    id: "net_p3",
    title: "Phase 3 — Applied Topics",
    description:
      "ODE, PDE, and optional topics (student must do ODE + PDE + any 2 others).",
    topics: [
      "ODE — First Order, Higher Order, Power Series",
      "PDE — First Order, Wave, Heat, Laplace, Fourier",
      "Numerical Analysis",
      "Integral Equations",
      "Calculus of Variations",
    ],
  },
  {
    id: "net_p4",
    title: "Phase 4 — Full Revision & Mock Tests",
    description: "Complete revision, full-length mocks, exam strategy.",
    topics: [
      "Phase 1 revision",
      "Phase 2 revision",
      "Phase 3 revision",
      "Full-length mock tests",
      "Weak area targeting",
      "Formula sheets",
    ],
  },
];

function generatePhases(examType: string, totalMonths: number): RoadmapPhase[] {
  const totalWeeks = totalMonths * 4;
  const template = examType === "JAM" ? JAM_PHASES : NET_PHASES;
  const weights = [0.3, 0.28, 0.27, 0.15];
  return template.map((p, i) => ({
    ...p,
    durationWeeks: Math.max(1, Math.round(totalWeeks * weights[i])),
    status: "not_started" as PhaseStatus,
  }));
}

/* ─── Smart Schedule Engine ─────────────── */
function generateSmartSchedule(
  examType: string,
  hoursPerDay: number,
  daysPerWeek: number,
  targetMonths: number,
  revisionPercent: number,
  startDate: string,
): SmartSchedule {
  const subjects = examType === "JAM" ? JAM_SUBJECTS : NET_SUBJECTS;
  const weekBreakdown =
    examType === "JAM" ? JAM_WEEK_BREAKDOWN : NET_WEEK_BREAKDOWN;
  const hoursPerWeek = hoursPerDay * daysPerWeek;
  const targetWeeks = targetMonths * 4;
  const totalHoursAvailable = targetWeeks * hoursPerWeek;

  /* Calculate total weeks needed */
  let studyWeeksTotal = 0;
  let assignmentWeeksTotal = 0;
  let revisionWeeksTotal = 0;

  subjects.forEach((s) => {
    studyWeeksTotal += s.studyWeeks;
    assignmentWeeksTotal += s.assignmentWeeks;
    revisionWeeksTotal += s.studyWeeks * (revisionPercent / 100);
  });

  /* Add buffer week per phase */
  const bufferWeeks = examType === "JAM" ? 2 : 3;

  const totalWeeksRequired = Math.ceil(
    studyWeeksTotal + assignmentWeeksTotal + revisionWeeksTotal + bufferWeeks,
  );

  const totalHoursRequired = totalWeeksRequired * hoursPerWeek;
  const isAchievable = targetWeeks >= totalWeeksRequired;
  const minimumMonthsNeeded = Math.ceil(totalWeeksRequired / 4);

  /* Generate week-by-week schedule */
  const weeks: ScheduleWeek[] = [];
  let weekNumber = 1;
  const start = parseISO(startDate);

  subjects.forEach((subject) => {
    const breakdown = weekBreakdown[subject.id] ?? [];
    const studyWeekCount = subject.studyWeeks;
    const revWeekCount = Math.ceil(
      subject.studyWeeks * (revisionPercent / 100),
    );

    /* Study weeks */
    for (let w = 0; w < studyWeekCount; w++) {
      const focusText = breakdown[w] ?? `${subject.name} — Part ${w + 1}`;
      const isLastStudy = w === studyWeekCount - 1;
      weeks.push({
        weekNumber,
        subject: subject.name,
        focus:
          isLastStudy && subject.assignmentWeeks > 0 ? focusText : focusText,
        type: "study",
        hoursRequired: hoursPerWeek,
        hoursAvailable: hoursPerWeek,
        startDate: format(addWeeks(start, weekNumber - 1), "MMM d"),
      });
      weekNumber++;
    }

    /* Assignment (inline with last study week — shown separately) */
    if (subject.assignmentWeeks > 0) {
      weeks.push({
        weekNumber,
        subject: subject.name,
        focus: `${subject.name} — Assignments & Problem Practice`,
        type: "assignment",
        hoursRequired: Math.ceil(subject.assignmentWeeks * hoursPerWeek),
        hoursAvailable: hoursPerWeek,
        startDate: format(addWeeks(start, weekNumber - 1), "MMM d"),
      });
      weekNumber++;
    }

    /* Revision weeks */
    for (let r = 0; r < revWeekCount; r++) {
      weeks.push({
        weekNumber,
        subject: subject.name,
        focus:
          r === 0
            ? `${subject.name} — Revision Pass 1 (key theorems, formulas)`
            : `${subject.name} — Revision Pass ${r + 1} (weak areas, problem drill)`,
        type: "revision",
        hoursRequired: hoursPerWeek,
        hoursAvailable: hoursPerWeek,
        startDate: format(addWeeks(start, weekNumber - 1), "MMM d"),
      });
      weekNumber++;
    }
  });

  /* Buffer weeks at the end */
  for (let b = 0; b < bufferWeeks; b++) {
    weeks.push({
      weekNumber,
      subject: "Full Syllabus",
      focus:
        b === 0
          ? "Mock Tests — Full length, time management practice"
          : "Final Revision — Formula sheets, exam strategy, weak spots",
      type: "revision",
      hoursRequired: hoursPerWeek,
      hoursAvailable: hoursPerWeek,
      startDate: format(addWeeks(start, weekNumber - 1), "MMM d"),
    });
    weekNumber++;
  }

  return {
    hoursPerDay,
    daysPerWeek,
    targetMonths,
    revisionPercent,
    totalHoursAvailable,
    totalHoursRequired,
    totalWeeksRequired,
    isAchievable,
    minimumMonthsNeeded,
    weeks,
    generatedAt: new Date().toISOString(),
  };
}

/* ─── Week type config ─────────────────── */
const WEEK_TYPE_CFG = {
  study: { label: "Study", color: DARK, bg: `${GOLD}15`, icon: BookOpen },
  assignment: {
    label: "Assignment",
    color: "#7A5A10",
    bg: "#FFF3D0",
    icon: Zap,
  },
  revision: { label: "Revision", color: OLIVE, bg: `${OLIVE}15`, icon: Brain },
  buffer: { label: "Buffer", color: MUTED, bg: `${BORDER}88`, icon: Calendar },
};

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

/* ─── AI progress engine ───────────────── */
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
    recommendation = "Start Phase 1 with consistent daily study.";
  } else if (diff >= 10) {
    status = "ahead";
    statusMessage = "Excellent! Ahead of schedule. 🎉";
    recommendation = "Use extra time for deeper practice and mock tests.";
  } else if (diff >= -5) {
    status = "on_track";
    statusMessage = "Right on track! Keep going. 💪";
    recommendation = "Maintain your current pace. Don't skip sessions.";
  } else if (diff >= -15) {
    status = "behind";
    statusMessage = "Slightly behind — adjustable.";
    recommendation = `Add ${Math.ceil(Math.abs(diff) / 10)} extra study sessions per week to catch up.`;
  } else {
    status = "critical";
    statusMessage = "Significantly behind. Plan adjustment needed.";
    recommendation = "Focus intensely on high-weightage topics.";
  }

  const remaining = roadmap.phases.filter((p) => p.status !== "done");
  const remainingTotal = remaining.reduce((s, p) => s + p.durationWeeks, 0);
  const adjustedPhases = roadmap.phases.map((p) => {
    if (p.status === "done") return p;
    const prop = remainingTotal > 0 ? p.durationWeeks / remainingTotal : 0;
    const extra = Math.round(unavailableWeeks * prop);
    return { ...p, durationWeeks: p.durationWeeks + extra };
  });

  return {
    effectiveWeeks,
    unavailableWeeks,
    estimatedEndDate: format(estimatedEnd, "MMMM d, yyyy"),
    weeklyTargetPercent:
      weeksLeft > 0 ? Math.ceil((100 - completedPercent) / weeksLeft) : 0,
    completedPercent,
    status,
    statusMessage,
    recommendation,
    adjustedPhases,
  };
}

/* ─── Smart Schedule Builder UI ─────────── */
function SmartScheduleBuilder({
  examType,
  startDate,
  onGenerate,
}: {
  examType: string;
  startDate: string;
  onGenerate: (schedule: SmartSchedule) => void;
}) {
  const [hoursPerDay, setHoursPerDay] = useState(2);
  const [daysPerWeek, setDaysPerWeek] = useState(5);
  const [targetMonths, setTargetMonths] = useState(6);
  const [revisionPercent, setRevisionPercent] = useState(30);
  const [preview, setPreview] = useState<SmartSchedule | null>(null);

  function calculate() {
    const schedule = generateSmartSchedule(
      examType,
      hoursPerDay,
      daysPerWeek,
      targetMonths,
      revisionPercent,
      startDate,
    );
    setPreview(schedule);
  }

  const hoursPerWeek = hoursPerDay * daysPerWeek;

  return (
    <div
      className="rounded-2xl p-6 space-y-6"
      style={{ background: CARD, border: `1px solid ${BORDER}` }}
    >
      <div className="flex items-center gap-2">
        <Brain className="w-5 h-5" style={{ color: GOLD }} />
        <h3
          className="font-serif text-lg font-semibold"
          style={{ color: CHARCOAL }}
        >
          AI Schedule Generator
        </h3>
      </div>
      <p className="text-xs" style={{ color: MUTED }}>
        Tell us your availability and target. AI will generate a complete
        week-by-week study plan with assignments and revision built in.
      </p>

      {/* Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label
            className="text-xs font-semibold mb-2 block"
            style={{ color: CHARCOAL }}
          >
            Study hours per day:{" "}
            <span style={{ color: GOLD }}>{hoursPerDay} hrs</span>
          </label>
          <input
            type="range"
            min={0.5}
            max={12}
            step={0.5}
            value={hoursPerDay}
            onChange={(e) => setHoursPerDay(parseFloat(e.target.value))}
            className="w-full accent-amber-600"
          />
          <div
            className="flex justify-between text-[10px] mt-1"
            style={{ color: MUTED }}
          >
            <span>0.5 hrs</span>
            <span>12 hrs</span>
          </div>
        </div>

        <div>
          <label
            className="text-xs font-semibold mb-2 block"
            style={{ color: CHARCOAL }}
          >
            Study days per week:{" "}
            <span style={{ color: GOLD }}>{daysPerWeek} days</span>
          </label>
          <input
            type="range"
            min={1}
            max={7}
            step={1}
            value={daysPerWeek}
            onChange={(e) => setDaysPerWeek(parseInt(e.target.value))}
            className="w-full accent-amber-600"
          />
          <div
            className="flex justify-between text-[10px] mt-1"
            style={{ color: MUTED }}
          >
            <span>1 day</span>
            <span>7 days</span>
          </div>
        </div>

        <div>
          <label
            className="text-xs font-semibold mb-2 block"
            style={{ color: CHARCOAL }}
          >
            Target completion:{" "}
            <span style={{ color: GOLD }}>{targetMonths} months</span>
          </label>
          <input
            type="range"
            min={1}
            max={36}
            step={1}
            value={targetMonths}
            onChange={(e) => setTargetMonths(parseInt(e.target.value))}
            className="w-full accent-amber-600"
          />
          <div
            className="flex justify-between text-[10px] mt-1"
            style={{ color: MUTED }}
          >
            <span>1 month</span>
            <span>36 months</span>
          </div>
        </div>

        <div>
          <label
            className="text-xs font-semibold mb-2 block"
            style={{ color: CHARCOAL }}
          >
            Revision intensity:{" "}
            <span style={{ color: GOLD }}>
              {revisionPercent}% of study time
            </span>
          </label>
          <input
            type="range"
            min={25}
            max={100}
            step={5}
            value={revisionPercent}
            onChange={(e) => setRevisionPercent(parseInt(e.target.value))}
            className="w-full accent-amber-600"
          />
          <div
            className="flex justify-between text-[10px] mt-1"
            style={{ color: MUTED }}
          >
            <span>25% (min)</span>
            <span>100% (intensive)</span>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div
        className="rounded-xl p-4"
        style={{ background: CREAM, border: `1px solid ${BORDER}` }}
      >
        <p className="text-xs font-semibold mb-2" style={{ color: CHARCOAL }}>
          Your availability summary:
        </p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Per Week", value: `${hoursPerWeek} hrs` },
            { label: "Per Month", value: `${hoursPerWeek * 4} hrs` },
            {
              label: "In Target",
              value: `${hoursPerWeek * targetMonths * 4} hrs total`,
            },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <div
                className="text-sm font-bold font-serif"
                style={{ color: DARK }}
              >
                {value}
              </div>
              <div className="text-[10px]" style={{ color: MUTED }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={calculate}
        className="w-full h-12 rounded-xl font-semibold text-sm transition-all hover:scale-[1.01]"
        style={{
          background: `linear-gradient(135deg, #A07840 0%, ${GOLD} 100%)`,
          color: "#fff",
          boxShadow: "0 4px 16px rgba(201,169,110,.35)",
        }}
      >
        ✨ Generate My Week-by-Week Schedule
      </button>

      {/* Preview result */}
      {preview && (
        <div className="space-y-4">
          {/* Feasibility banner */}
          <div
            className="rounded-xl p-4"
            style={{
              background: preview.isAchievable ? `${OLIVE}15` : "#FDE8E8",
              border: `1.5px solid ${preview.isAchievable ? OLIVE : "#C0392B"}44`,
            }}
          >
            {preview.isAchievable ? (
              <div>
                <p className="text-sm font-semibold" style={{ color: OLIVE }}>
                  ✅ Target is achievable!
                </p>
                <p className="text-xs mt-1" style={{ color: MUTED }}>
                  {preview.totalWeeksRequired} weeks needed · {targetMonths * 4}{" "}
                  weeks available ·{preview.weeks.length} week schedule
                  generated
                </p>
              </div>
            ) : (
              <div>
                <p
                  className="text-sm font-semibold"
                  style={{ color: "#C0392B" }}
                >
                  ⚠️ Target too tight — minimum {preview.minimumMonthsNeeded}{" "}
                  months needed
                </p>
                <p className="text-xs mt-1" style={{ color: MUTED }}>
                  At {hoursPerDay} hrs/day × {daysPerWeek} days/week, you need
                  at least {preview.minimumMonthsNeeded} months to complete the
                  full syllabus including {revisionPercent}% revision. Either
                  increase study hours or extend your target.
                </p>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                label: "Total Weeks",
                value: `${preview.totalWeeksRequired} wks`,
                color: DARK,
              },
              {
                label: "Hours Needed",
                value: `${preview.totalHoursRequired} hrs`,
                color: GOLD,
              },
              { label: "Revision", value: `${revisionPercent}%`, color: OLIVE },
              {
                label: "Min. Months",
                value: `${preview.minimumMonthsNeeded} mo`,
                color: MUTED,
              },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="rounded-xl p-3 text-center"
                style={{ background: CREAM, border: `1px solid ${BORDER}` }}
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

          <div className="flex gap-2">
            <button
              onClick={() => onGenerate(preview)}
              className="flex-1 h-11 rounded-xl font-semibold text-sm transition-all hover:scale-[1.01]"
              style={{
                background: `linear-gradient(135deg, #A07840 0%, ${GOLD} 100%)`,
                color: "#fff",
              }}
            >
              Save This Schedule →
            </button>
            <button
              onClick={() => setPreview(null)}
              className="px-5 h-11 rounded-xl text-sm font-semibold"
              style={{ background: BORDER, color: MUTED }}
            >
              Recalculate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Smart Schedule View ──────────────── */
function SmartScheduleView({
  schedule,
  onEdit,
}: {
  schedule: SmartSchedule;
  onEdit: () => void;
}) {
  const [filter, setFilter] = useState<WeekType | "all">("all");
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const filtered =
    filter === "all"
      ? schedule.weeks
      : schedule.weeks.filter((w) => w.type === filter);

  /* Group by subject */
  const subjects = [...new Set(schedule.weeks.map((w) => w.subject))];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3
            className="font-serif text-lg font-semibold"
            style={{ color: CHARCOAL }}
          >
            Your Week-by-Week Schedule
          </h3>
          <p className="text-xs mt-0.5" style={{ color: MUTED }}>
            {schedule.hoursPerDay} hrs/day · {schedule.daysPerWeek} days/week ·
            {schedule.revisionPercent}% revision · Generated{" "}
            {format(parseISO(schedule.generatedAt), "MMM d, yyyy")}
          </p>
        </div>
        <button
          onClick={onEdit}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold"
          style={{ background: `${GOLD}22`, color: DARK }}
        >
          <Edit3 className="w-3 h-3" /> Recalculate
        </button>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "study", "assignment", "revision"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
            style={
              filter === f
                ? { background: DARK, color: CREAM }
                : { background: `${BORDER}88`, color: MUTED }
            }
          >
            {f === "all" ? "All weeks" : WEEK_TYPE_CFG[f].label}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-3 flex-wrap">
        {(
          Object.entries(WEEK_TYPE_CFG) as [
            WeekType,
            (typeof WEEK_TYPE_CFG)[WeekType],
          ][]
        ).map(([type, cfg]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: cfg.color }}
            />
            <span className="text-[11px]" style={{ color: MUTED }}>
              {cfg.label}
            </span>
          </div>
        ))}
      </div>

      {/* Subject blocks */}
      {subjects.map((subject) => {
        const subjectWeeks = filtered.filter((w) => w.subject === subject);
        if (subjectWeeks.length === 0) return null;
        const allWeeks = schedule.weeks.filter((w) => w.subject === subject);
        const isExpanded = expanded[subjectWeeks[0].weekNumber] ?? false;

        return (
          <div
            key={subject}
            className="rounded-2xl overflow-hidden"
            style={{ background: CARD, border: `1px solid ${BORDER}` }}
          >
            <button
              onClick={() =>
                setExpanded((p) => ({
                  ...p,
                  [subjectWeeks[0].weekNumber]: !p[subjectWeeks[0].weekNumber],
                }))
              }
              className="w-full flex items-center gap-3 px-5 py-4 text-left"
              style={{ background: isExpanded ? `${GOLD}08` : CARD }}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className="font-semibold text-sm"
                    style={{ color: CHARCOAL }}
                  >
                    {subject}
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: `${GOLD}22`, color: DARK }}
                  >
                    {allWeeks.length} week(s)
                  </span>
                </div>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {(["study", "assignment", "revision"] as WeekType[]).map(
                    (t) => {
                      const count = allWeeks.filter((w) => w.type === t).length;
                      if (count === 0) return null;
                      const cfg = WEEK_TYPE_CFG[t];
                      return (
                        <span
                          key={t}
                          className="text-[10px] px-1.5 py-0.5 rounded-full"
                          style={{ background: cfg.bg, color: cfg.color }}
                        >
                          {count} {cfg.label}
                        </span>
                      );
                    },
                  )}
                </div>
              </div>
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" style={{ color: MUTED }} />
              ) : (
                <ChevronRight className="w-4 h-4" style={{ color: MUTED }} />
              )}
            </button>

            {isExpanded && (
              <div
                className="divide-y"
                style={{ borderTop: `1px solid ${BORDER}` }}
              >
                {subjectWeeks.map((week) => {
                  const cfg = WEEK_TYPE_CFG[week.type];
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={week.weekNumber}
                      className="flex items-start gap-3 px-5 py-3"
                      style={{ background: cfg.bg }}
                    >
                      <div className="flex-shrink-0 w-16 text-center">
                        <div
                          className="text-[10px] font-bold"
                          style={{ color: cfg.color }}
                        >
                          Week {week.weekNumber}
                        </div>
                        <div className="text-[10px]" style={{ color: MUTED }}>
                          {week.startDate}
                        </div>
                      </div>
                      <Icon
                        className="w-4 h-4 flex-shrink-0 mt-0.5"
                        style={{ color: cfg.color }}
                      />
                      <div className="flex-1">
                        <p className="text-sm" style={{ color: CHARCOAL }}>
                          {week.focus}
                        </p>
                        <p
                          className="text-[10px] mt-0.5"
                          style={{ color: MUTED }}
                        >
                          ~{week.hoursAvailable} hrs available this week
                        </p>
                      </div>
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{
                          background: `${cfg.color}22`,
                          color: cfg.color,
                        }}
                      >
                        {cfg.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

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

/* ─── Main Roadmap View ────────────────── */
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
  const [activeTab, setActiveTab] = useState<"overview" | "schedule">(
    "overview",
  );
  const [showBuilder, setShowBuilder] = useState(!rm.smartSchedule);

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
    persist({
      ...rm,
      unavailablePeriods: [
        ...rm.unavailablePeriods,
        { id: `${Date.now()}`, ...unavailForm },
      ],
    });
    setUnavailForm({ label: "", startDate: "", weeks: 1 });
    setShowUnavail(false);
  }

  function saveSchedule(schedule: SmartSchedule) {
    persist({ ...rm, smartSchedule: schedule });
    setShowBuilder(false);
    setActiveTab("schedule");
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

      {/* Tabs */}
      <div className="flex gap-2">
        {(["overview", "schedule"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-5 py-2 rounded-xl text-sm font-semibold transition-all"
            style={
              activeTab === tab
                ? { background: DARK, color: CREAM }
                : { background: `${BORDER}88`, color: MUTED }
            }
          >
            {tab === "overview" ? "📋 Overview" : "📅 Schedule"}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* AI Status */}
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
                <p
                  className="text-sm font-semibold"
                  style={{ color: CHARCOAL }}
                >
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
                {
                  label: "Est. Finish",
                  value: calc.estimatedEndDate,
                  color: DARK,
                },
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
                  <div
                    className="text-sm font-bold font-serif"
                    style={{ color }}
                  >
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

          {/* Timeline */}
          <div
            className="rounded-2xl p-5"
            style={{ background: CARD, border: `1px solid ${BORDER}` }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" style={{ color: GOLD }} />
                <h3
                  className="font-semibold text-sm"
                  style={{ color: CHARCOAL }}
                >
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
                  <strong>
                    {format(parseISO(rm.startDate), "MMM d, yyyy")}
                  </strong>
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

          {/* Unavailable */}
          <div
            className="rounded-2xl p-5"
            style={{ background: CARD, border: `1px solid ${BORDER}` }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" style={{ color: ROSE }} />
                <h3
                  className="font-semibold text-sm"
                  style={{ color: CHARCOAL }}
                >
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
              AI extends your end date and adjusts targets automatically.
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
                      placeholder="e.g. College exams…"
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
                        setUnavailForm((p) => ({
                          ...p,
                          startDate: e.target.value,
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
                  <div>
                    <label
                      className="text-xs font-semibold mb-1 block"
                      style={{ color: MUTED }}
                    >
                      Weeks
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
                  style={{
                    background: `${ROSE}15`,
                    border: `1px solid ${ROSE}44`,
                  }}
                >
                  <div>
                    <span
                      className="text-sm font-medium"
                      style={{ color: CHARCOAL }}
                    >
                      {p.label}
                    </span>
                    <span className="text-xs ml-2" style={{ color: MUTED }}>
                      {p.startDate
                        ? format(parseISO(p.startDate), "MMM d")
                        : ""}{" "}
                      · {p.weeks} wk(s)
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      persist({
                        ...rm,
                        unavailablePeriods: rm.unavailablePeriods.filter(
                          (x) => x.id !== p.id,
                        ),
                      })
                    }
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
                            phase.status === "done"
                              ? `${OLIVE}22`
                              : `${GOLD}22`,
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
                      <div className="flex gap-1 flex-shrink-0">
                        {(
                          [
                            "not_started",
                            "in_progress",
                            "done",
                          ] as PhaseStatus[]
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
                          className="text-xs mt-3 mb-3"
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
        </div>
      )}

      {/* SCHEDULE TAB */}
      {activeTab === "schedule" && (
        <div className="space-y-6">
          {showBuilder || !rm.smartSchedule ? (
            <SmartScheduleBuilder
              examType={rm.examType}
              startDate={rm.startDate}
              onGenerate={saveSchedule}
            />
          ) : (
            <SmartScheduleView
              schedule={rm.smartSchedule}
              onEdit={() => setShowBuilder(true)}
            />
          )}
        </div>
      )}

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
