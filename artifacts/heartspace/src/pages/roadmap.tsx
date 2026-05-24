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
  Target,
  BarChart2,
  Circle,
  PlayCircle,
} from "lucide-react";
import { format, addWeeks, differenceInWeeks, parseISO } from "date-fns";
import {
  loadSyllabusProgress,
  SYLLABUS,
  type SyllabusProgress,
} from "./syllabus";

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

interface SubjectForecast {
  name: string;
  syllabusId: string;
  weeksNeeded: number;
  weeksAvailable: number;
  canComplete: boolean;
  percentCompletable: number;
  syllabusPercent: number;
  adjustedWeeks: number;
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
  subjectForecasts: SubjectForecast[];
  subjectsFullyCompletable: number;
  totalSubjects: number;
  completedSubjectsSkipped: number;
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

/* ─── Subject data ─────────────────────── */
const JAM_SUBJECTS = [
  {
    id: "la",
    syllabusId: "linear_algebra",
    name: "Linear Algebra",
    studyWeeks: 4,
    assignmentWeeks: 0.5,
  },
  {
    id: "ra",
    syllabusId: "real_analysis",
    name: "Real Analysis",
    studyWeeks: 4,
    assignmentWeeks: 0.5,
  },
  {
    id: "dc",
    syllabusId: "differential_calculus",
    name: "Functions of One Variable",
    studyWeeks: 4,
    assignmentWeeks: 0.5,
  },
  {
    id: "gt",
    syllabusId: "abstract_algebra",
    name: "Group Theory",
    studyWeeks: 4,
    assignmentWeeks: 0.5,
  },
  {
    id: "ode",
    syllabusId: "ode",
    name: "ODE",
    studyWeeks: 3,
    assignmentWeeks: 0.5,
  },
  {
    id: "mvc",
    syllabusId: "real_analysis",
    name: "Functions of Two Variables",
    studyWeeks: 2,
    assignmentWeeks: 0.5,
  },
  {
    id: "mi",
    syllabusId: "integration",
    name: "Multiple Integration",
    studyWeeks: 2,
    assignmentWeeks: 0.5,
  },
];

const NET_SUBJECTS = [
  {
    id: "ra",
    syllabusId: "real_analysis",
    name: "Real Analysis",
    studyWeeks: 4,
    assignmentWeeks: 0.5,
  },
  {
    id: "la",
    syllabusId: "linear_algebra",
    name: "Linear Algebra",
    studyWeeks: 4,
    assignmentWeeks: 0.5,
  },
  {
    id: "ca",
    syllabusId: "complex_analysis",
    name: "Complex Analysis",
    studyWeeks: 3,
    assignmentWeeks: 0.5,
  },
  {
    id: "ma",
    syllabusId: "abstract_algebra",
    name: "Modern Algebra (Group + Ring + Field)",
    studyWeeks: 5,
    assignmentWeeks: 1.0,
  },
  {
    id: "top",
    syllabusId: "topology",
    name: "Topology",
    studyWeeks: 3,
    assignmentWeeks: 0.5,
  },
  {
    id: "fa",
    syllabusId: "functional_analysis",
    name: "Functional Analysis",
    studyWeeks: 2,
    assignmentWeeks: 0.5,
  },
  {
    id: "ode",
    syllabusId: "ode",
    name: "ODE",
    studyWeeks: 3,
    assignmentWeeks: 0.5,
  },
  {
    id: "pde",
    syllabusId: "pde",
    name: "PDE",
    studyWeeks: 2,
    assignmentWeeks: 0.5,
  },
  {
    id: "na",
    syllabusId: "numerical_analysis",
    name: "Numerical Analysis",
    studyWeeks: 1,
    assignmentWeeks: 0.25,
  },
  {
    id: "ie",
    syllabusId: "calculus_of_variations",
    name: "Integral Equations",
    studyWeeks: 1,
    assignmentWeeks: 0.25,
  },
  {
    id: "cov",
    syllabusId: "calculus_of_variations",
    name: "Calculus of Variations",
    studyWeeks: 1,
    assignmentWeeks: 0.25,
  },
];

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

/* ─── Syllabus % per subject ─────────────── */
function getSyllabusPercents(
  syllabusProgress: SyllabusProgress,
  examType: string,
): Record<string, number> {
  const isJAM = examType === "JAM";
  const result: Record<string, number> = {};
  SYLLABUS.forEach((subject) => {
    if (subject.netOnly && isJAM) return;
    if (subject.jamOnly && !isJAM) return;
    const subtopics = subject.topics
      .filter((t) => !(t.netOnly && isJAM))
      .flatMap((t) => t.subtopics.filter((st: any) => !(st.netOnly && isJAM)));
    const total = subtopics.length;
    const done = subtopics.filter(
      (st) => syllabusProgress[st.id]?.status === "done",
    ).length;
    result[subject.id] = total ? Math.round((done / total) * 100) : 0;
  });
  return result;
}

/* ─── Roadmap types ────────────────────── */
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

const JAM_PHASES: Omit<RoadmapPhase, "durationWeeks" | "status">[] = [
  {
    id: "jam_p1",
    title: "Phase 1 — Foundation",
    description: "Linear Algebra and Real Analysis.",
    marks: "28–31 marks",
    topics: [
      "Linear Algebra — System of Equations, Vector Spaces, Linear Transformations, Eigenvalues, Matrices",
      "Real Analysis — Set Theory, Real Numbers, Sequences, Series, Limits, Differentiability, Riemann Integration, FSV",
    ],
  },
  {
    id: "jam_p2",
    title: "Phase 2 — Calculus & Algebra",
    description: "Differential Calculus and Group Theory.",
    marks: "24–26 marks",
    topics: [
      "Differential Calculus — Limits, Continuity, Differentiability, MVT, Taylor, Maxima-Minima",
      "Group Theory — Basics, Normal Subgroups, Quotient Groups, Isomorphism Theorems",
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
      "Multiple Integration — Double & Triple Integrals, Surface Area, Solids",
    ],
  },
  {
    id: "jam_p4",
    title: "Phase 4 — Full Revision & Mock Tests",
    description: "Complete syllabus revision and mock tests.",
    marks: "All topics",
    topics: [
      "Phase 1 full revision — LA + RA",
      "Phase 2 full revision — DC + GT",
      "Phase 3 full revision — ODE + MVC + MI",
      "Full-length mock tests",
      "Error analysis",
      "Formula sheets + exam strategy",
    ],
  },
];

const NET_PHASES: Omit<RoadmapPhase, "durationWeeks" | "status">[] = [
  {
    id: "net_p1",
    title: "Phase 1 — Analysis & Algebra",
    description: "Real Analysis and Linear Algebra.",
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
      "Complex Analysis",
      "Modern Algebra — Group Theory (Sylow), Ring Theory, Field Theory",
      "Topology",
      "Functional Analysis",
    ],
  },
  {
    id: "net_p3",
    title: "Phase 3 — Applied Topics",
    description: "ODE, PDE, and optional topics.",
    topics: [
      "ODE",
      "PDE",
      "Numerical Analysis",
      "Integral Equations",
      "Calculus of Variations",
    ],
  },
  {
    id: "net_p4",
    title: "Phase 4 — Full Revision & Mock Tests",
    description: "Complete revision and full-length mocks.",
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
  syllabusProgress: SyllabusProgress,
): SmartSchedule {
  const allSubjects = examType === "JAM" ? JAM_SUBJECTS : NET_SUBJECTS;
  const weekBreakdown =
    examType === "JAM" ? JAM_WEEK_BREAKDOWN : NET_WEEK_BREAKDOWN;
  const hoursPerWeek = hoursPerDay * daysPerWeek;
  const targetWeeks = targetMonths * 4;
  const syllabusPercs = getSyllabusPercents(syllabusProgress, examType);

  const subjectsWithAdjusted = allSubjects.map((s) => {
    const pct = syllabusPercs[s.syllabusId] ?? 0;
    const remaining = Math.max(0, 1 - pct / 100);
    const adjStudy = Math.ceil(s.studyWeeks * remaining);
    const adjAssign = pct >= 100 ? 0 : s.assignmentWeeks;
    const adjRevision =
      adjStudy > 0 ? Math.ceil(adjStudy * (revisionPercent / 100)) : 0;
    return {
      ...s,
      syllabusPercent: pct,
      adjustedWeeks: adjStudy + adjAssign + adjRevision,
      adjStudy,
      adjAssign,
      adjRevision,
    };
  });

  const bufferWeeks = examType === "JAM" ? 2 : 3;
  const totalWeeksRequired = Math.ceil(
    subjectsWithAdjusted.reduce((s, x) => s + x.adjustedWeeks, 0) + bufferWeeks,
  );
  const totalHoursRequired = totalWeeksRequired * hoursPerWeek;
  const isAchievable = targetWeeks >= totalWeeksRequired;
  const minimumMonthsNeeded = Math.ceil(totalWeeksRequired / 4);

  let weeksUsed = 0;
  const subjectForecasts: SubjectForecast[] = subjectsWithAdjusted.map((s) => {
    const weeksNeeded = s.adjustedWeeks;
    const remaining = Math.max(0, targetWeeks - weeksUsed);
    const canComplete = remaining >= weeksNeeded;
    const pct =
      weeksNeeded === 0
        ? 100
        : canComplete
          ? 100
          : Math.round((remaining / weeksNeeded) * 100);
    weeksUsed += weeksNeeded;
    return {
      name: s.name,
      syllabusId: s.syllabusId,
      weeksNeeded,
      weeksAvailable: Math.min(remaining, weeksNeeded),
      canComplete,
      percentCompletable: pct,
      syllabusPercent: s.syllabusPercent,
      adjustedWeeks: s.adjustedWeeks,
    };
  });

  const weeks: ScheduleWeek[] = [];
  let weekNumber = 1;
  const start = parseISO(startDate);

  subjectsWithAdjusted.forEach((subject) => {
    if (subject.adjustedWeeks === 0) return;
    const breakdown = weekBreakdown[subject.id] ?? [];
    const partialLabel =
      subject.syllabusPercent > 0 && subject.syllabusPercent < 100
        ? ` (continuing from ${subject.syllabusPercent}% done)`
        : "";

    for (let w = 0; w < subject.adjStudy; w++) {
      weeks.push({
        weekNumber,
        subject: subject.name,
        focus:
          (breakdown[w] ?? `${subject.name} — Part ${w + 1}`) +
          (w === 0 ? partialLabel : ""),
        type: "study",
        hoursRequired: hoursPerWeek,
        hoursAvailable: hoursPerWeek,
        startDate: format(addWeeks(start, weekNumber - 1), "MMM d"),
      });
      weekNumber++;
    }
    if (subject.adjAssign > 0) {
      weeks.push({
        weekNumber,
        subject: subject.name,
        focus: `${subject.name} — Assignments & Problem Practice`,
        type: "assignment",
        hoursRequired: hoursPerWeek,
        hoursAvailable: hoursPerWeek,
        startDate: format(addWeeks(start, weekNumber - 1), "MMM d"),
      });
      weekNumber++;
    }
    for (let r = 0; r < subject.adjRevision; r++) {
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
    totalHoursAvailable: targetWeeks * hoursPerWeek,
    totalHoursRequired,
    totalWeeksRequired,
    isAchievable,
    minimumMonthsNeeded,
    weeks,
    subjectForecasts,
    subjectsFullyCompletable: subjectForecasts.filter((s) => s.canComplete)
      .length,
    totalSubjects: allSubjects.length,
    completedSubjectsSkipped: subjectsWithAdjusted.filter(
      (s) => s.adjustedWeeks === 0,
    ).length,
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

/* ─── Progress engine ──────────────────── */
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
    recommendation = `Add ${Math.ceil(Math.abs(diff) / 10)} extra sessions per week to catch up.`;
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
    return {
      ...p,
      durationWeeks: p.durationWeeks + Math.round(unavailableWeeks * prop),
    };
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

/* ─── Tick Button ──────────────────────── */
function TickButton({
  allDone,
  anyDone,
  onClick,
  size = "sm",
}: {
  allDone: boolean;
  anyDone: boolean;
  onClick: (e: React.MouseEvent) => void;
  size?: "sm" | "lg";
}) {
  const dim = size === "lg" ? "w-7 h-7" : "w-6 h-6";
  return (
    <button
      type="button"
      onClick={onClick}
      title={allDone ? "Unmark all" : "Mark all as done"}
      className={`flex-shrink-0 ${dim} rounded-full border-2 flex items-center justify-center transition-all duration-200 hover:scale-110`}
      style={{
        borderColor: allDone ? OLIVE : anyDone ? GOLD : BORDER,
        background: allDone ? OLIVE : "transparent",
        boxShadow: allDone ? `0 0 0 3px ${OLIVE}22` : "none",
      }}
    >
      {allDone ? (
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path
            d="M1 4L3.5 6.5L9 1"
            stroke="white"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : anyDone ? (
        <div className="w-2 h-2 rounded-full" style={{ background: GOLD }} />
      ) : null}
    </button>
  );
}

/* ─── My Progress Tab ──────────────────── */
function MyProgressTab({
  userId,
  examType,
}: {
  userId: string;
  examType: string;
}) {
  const isJAM = examType === "JAM";
  const [progress, setProgress] = useState<SyllabusProgress>(() =>
    loadSyllabusProgress(userId),
  );
  const [expandedSubj, setExpandedSubj] = useState<Record<string, boolean>>({});
  const [expandedTopic, setExpandedTopic] = useState<Record<string, boolean>>(
    {},
  );

  const filteredSyllabus = SYLLABUS.filter(
    (s) => !(s.netOnly && isJAM) && !(s.jamOnly && !isJAM),
  ).map((s) => ({
    ...s,
    topics: s.topics
      .filter((t) => !(t.netOnly && isJAM) && !(t.jamOnly && !isJAM))
      .map((t) => ({
        ...t,
        subtopics: t.subtopics.filter((st: any) => !(st.netOnly && isJAM)),
      })),
  }));

  const totalSubs = filteredSyllabus.reduce(
    (a, s) => a + s.topics.reduce((b, t) => b + t.subtopics.length, 0),
    0,
  );
  const doneSubs = Object.values(progress).filter(
    (v) => v.status === "done",
  ).length;
  const inProgSubs = Object.values(progress).filter(
    (v) => v.status === "in_progress",
  ).length;
  const overallPct = totalSubs ? Math.round((doneSubs / totalSubs) * 100) : 0;

  /* Save to localStorage and update state */
  function persistProgress(next: SyllabusProgress) {
    setProgress(next);
    try {
      localStorage.setItem(`hs_syllabus_${userId}`, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  /* Cycle a single subtopic */
  function cycleSubtopic(stId: string) {
    const prev = progress[stId] ?? { status: "not_started" as const };
    const now = new Date().toISOString();
    const nextStatus: Record<string, "not_started" | "in_progress" | "done"> = {
      not_started: "in_progress",
      in_progress: "done",
      done: "not_started",
    };
    const newStatus = nextStatus[prev.status] as
      | "not_started"
      | "in_progress"
      | "done";
    persistProgress({
      ...progress,
      [stId]: {
        status: newStatus,
        doneAt: newStatus === "done" ? (prev.doneAt ?? now) : undefined,
      },
    });
  }

  /* Toggle all subtopics in a topic */
  function toggleSubtopics(subtopics: { id: string }[]) {
    const allDone = subtopics.every((st) => progress[st.id]?.status === "done");
    const now = new Date().toISOString();
    const updated = { ...progress };
    subtopics.forEach((st) => {
      const prev = updated[st.id];
      updated[st.id] = allDone
        ? { status: "not_started", doneAt: undefined }
        : { status: "done", doneAt: prev?.doneAt ?? now };
    });
    persistProgress(updated);
  }

  /* Recent completions */
  const recentDone = Object.entries(progress)
    .filter(([, v]) => v.status === "done" && v.doneAt)
    .sort(([, a], [, b]) => (b.doneAt ?? "").localeCompare(a.doneAt ?? ""))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Overall",
            value: `${overallPct}%`,
            color: OLIVE,
            sub: "complete",
          },
          { label: "Done", value: doneSubs, color: OLIVE, sub: "subtopics" },
          {
            label: "In Progress",
            value: inProgSubs,
            color: GOLD,
            sub: "subtopics",
          },
          {
            label: "Remaining",
            value: totalSubs - doneSubs - inProgSubs,
            color: MUTED,
            sub: "not started",
          },
        ].map(({ label, value, color, sub }) => (
          <div
            key={label}
            className="rounded-2xl p-5 text-center"
            style={{ background: CARD, border: `1px solid ${BORDER}` }}
          >
            <div className="text-2xl font-bold font-serif" style={{ color }}>
              {value}
            </div>
            <div
              className="text-xs font-semibold mt-1"
              style={{ color: CHARCOAL }}
            >
              {label}
            </div>
            <div className="text-[10px]" style={{ color: MUTED }}>
              {sub}
            </div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div
        className="rounded-2xl p-5"
        style={{ background: CARD, border: `1px solid ${BORDER}` }}
      >
        <div className="flex justify-between text-sm mb-2">
          <span className="font-semibold" style={{ color: CHARCOAL }}>
            Syllabus Progress
          </span>
          <span className="font-bold" style={{ color: OLIVE }}>
            {overallPct}%
          </span>
        </div>
        <div
          className="h-3 rounded-full overflow-hidden"
          style={{ background: BORDER }}
        >
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${overallPct}%`,
              background: `linear-gradient(90deg, ${OLIVE} 0%, ${GOLD} 100%)`,
            }}
          />
        </div>
        <p className="text-xs mt-2" style={{ color: MUTED }}>
          {doneSubs} of {totalSubs} subtopics completed · Click ○ on a topic to
          mark all done · Click any subtopic to cycle status
        </p>
      </div>

      {/* Recent completions */}
      {recentDone.length > 0 && (
        <div
          className="rounded-2xl p-5"
          style={{ background: CARD, border: `1px solid ${BORDER}` }}
        >
          <h3
            className="font-semibold text-sm mb-3"
            style={{ color: CHARCOAL }}
          >
            Recently Completed
          </h3>
          <div className="space-y-2">
            {recentDone.map(([id, entry]) => {
              let subtopicName = id;
              SYLLABUS.forEach((subj) =>
                subj.topics.forEach((t) =>
                  t.subtopics.forEach((st) => {
                    if (st.id === id) subtopicName = st.name;
                  }),
                ),
              );
              return (
                <div
                  key={id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{
                    background: `${OLIVE}10`,
                    border: `1px solid ${OLIVE}33`,
                  }}
                >
                  <CheckCircle2
                    className="w-4 h-4 flex-shrink-0"
                    style={{ color: OLIVE }}
                  />
                  <span className="flex-1 text-sm" style={{ color: CHARCOAL }}>
                    {subtopicName}
                  </span>
                  {entry.doneAt && (
                    <span
                      className="text-[10px] flex-shrink-0"
                      style={{ color: OLIVE }}
                    >
                      {format(new Date(entry.doneAt), "MMM d, yyyy")}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Subject breakdown */}
      <div>
        <h3
          className="font-serif text-lg font-semibold mb-3"
          style={{ color: CHARCOAL }}
        >
          Subject Breakdown
        </h3>
        <div className="space-y-3">
          {filteredSyllabus.map((subject) => {
            const allSubtopics = subject.topics.flatMap((t) => t.subtopics);
            const total = allSubtopics.length;
            const done = allSubtopics.filter(
              (st) => progress[st.id]?.status === "done",
            ).length;
            const inProg = allSubtopics.filter(
              (st) => progress[st.id]?.status === "in_progress",
            ).length;
            const pct = total ? Math.round((done / total) * 100) : 0;
            const isOpen = expandedSubj[subject.id] ?? false;

            return (
              <div
                key={subject.id}
                className="rounded-2xl overflow-hidden"
                style={{ background: CARD, border: `1px solid ${BORDER}` }}
              >
                {/* Subject header */}
                <div
                  className="flex items-center gap-3 px-4"
                  style={{ background: isOpen ? `${GOLD}08` : CARD }}
                >
                  <TickButton
                    allDone={allSubtopics.every(
                      (st) => progress[st.id]?.status === "done",
                    )}
                    anyDone={allSubtopics.some(
                      (st) =>
                        progress[st.id]?.status === "done" ||
                        progress[st.id]?.status === "in_progress",
                    )}
                    size="lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSubtopics(allSubtopics);
                    }}
                  />
                  <button
                    onClick={() =>
                      setExpandedSubj((p) => ({
                        ...p,
                        [subject.id]: !p[subject.id],
                      }))
                    }
                    className="flex-1 flex items-center gap-4 py-4 text-left"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span
                          className="font-semibold text-sm"
                          style={{ color: CHARCOAL }}
                        >
                          {subject.name}
                        </span>
                        {pct === 100 && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                            style={{ background: `${OLIVE}22`, color: OLIVE }}
                          >
                            ✓ Complete
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div
                          className="flex-1 h-1.5 rounded-full overflow-hidden"
                          style={{ background: BORDER }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              background: pct === 100 ? OLIVE : GOLD,
                            }}
                          />
                        </div>
                        <span
                          className="text-xs flex-shrink-0"
                          style={{ color: pct === 100 ? OLIVE : MUTED }}
                        >
                          {pct}% · {done}/{total}
                          {inProg > 0 && ` · ${inProg} in progress`}
                        </span>
                      </div>
                    </div>
                    {isOpen ? (
                      <ChevronDown
                        className="w-4 h-4"
                        style={{ color: MUTED }}
                      />
                    ) : (
                      <ChevronRight
                        className="w-4 h-4"
                        style={{ color: MUTED }}
                      />
                    )}
                  </button>
                </div>

                {/* Topics */}
                {isOpen && (
                  <div style={{ borderTop: `1px solid ${BORDER}` }}>
                    {subject.topics.map((topic, tIdx) => {
                      const topicDone = topic.subtopics.filter(
                        (st) => progress[st.id]?.status === "done",
                      ).length;
                      const topicAllDone = topicDone === topic.subtopics.length;
                      const topicInProg = topic.subtopics.some(
                        (st) =>
                          progress[st.id]?.status === "in_progress" ||
                          progress[st.id]?.status === "done",
                      );
                      const isTopicOpen = expandedTopic[topic.id] ?? false;

                      return (
                        <div
                          key={topic.id}
                          style={{
                            borderBottom:
                              tIdx < subject.topics.length - 1
                                ? `1px solid ${BORDER}`
                                : "none",
                          }}
                        >
                          {/* Topic row */}
                          <div
                            className="flex items-center gap-2 px-4"
                            style={{
                              background: isTopicOpen ? `${GOLD}06` : CREAM,
                            }}
                          >
                            {/* Topic tick button */}
                            <TickButton
                              allDone={topicAllDone}
                              anyDone={topicInProg}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSubtopics(topic.subtopics);
                              }}
                            />

                            {/* Topic expand button */}
                            <button
                              onClick={() =>
                                setExpandedTopic((p) => ({
                                  ...p,
                                  [topic.id]: !p[topic.id],
                                }))
                              }
                              className="flex flex-1 items-center gap-2 py-3 text-left"
                            >
                              <div className="w-4 flex-shrink-0 flex items-center justify-center">
                                {isTopicOpen ? (
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
                              <span
                                className="flex-1 text-sm font-semibold"
                                style={{
                                  color: topicAllDone ? OLIVE : CHARCOAL,
                                  textDecoration: topicAllDone
                                    ? "line-through"
                                    : "none",
                                  textDecorationColor: MUTED,
                                }}
                              >
                                {topic.name}
                              </span>
                              <span
                                className="text-xs mr-1"
                                style={{ color: topicAllDone ? OLIVE : MUTED }}
                              >
                                {topicDone}/{topic.subtopics.length}
                              </span>
                            </button>
                          </div>

                          {/* Subtopics — clickable */}
                          {isTopicOpen && (
                            <div
                              className="px-5 pb-3 space-y-1.5"
                              style={{ background: "#FDFBF8" }}
                            >
                              {topic.subtopics.map((st) => {
                                const entry = progress[st.id] ?? {
                                  status: "not_started" as const,
                                };
                                const status = entry.status;
                                const Icon =
                                  status === "done"
                                    ? CheckCircle2
                                    : status === "in_progress"
                                      ? PlayCircle
                                      : Circle;
                                const color =
                                  status === "done"
                                    ? OLIVE
                                    : status === "in_progress"
                                      ? GOLD
                                      : MUTED;
                                const bg =
                                  status === "done"
                                    ? `${OLIVE}12`
                                    : status === "in_progress"
                                      ? `${GOLD}12`
                                      : `${BORDER}55`;

                                return (
                                  <button
                                    key={st.id}
                                    type="button"
                                    onClick={() => cycleSubtopic(st.id)}
                                    className="w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 hover:scale-[1.01]"
                                    style={{
                                      background: bg,
                                      border: `1px solid ${color}33`,
                                    }}
                                  >
                                    <Icon
                                      className="w-4 h-4 flex-shrink-0 mt-0.5"
                                      style={{ color }}
                                    />
                                    <div className="flex-1">
                                      <span
                                        className="text-sm"
                                        style={{
                                          color:
                                            status === "done"
                                              ? OLIVE
                                              : CHARCOAL,
                                          textDecoration:
                                            status === "done"
                                              ? "line-through"
                                              : "none",
                                          textDecorationColor: MUTED,
                                        }}
                                      >
                                        {st.name}
                                      </span>
                                      {status === "done" && entry.doneAt && (
                                        <p
                                          className="text-[10px] mt-0.5"
                                          style={{ color: OLIVE }}
                                        >
                                          Completed on{" "}
                                          {format(
                                            new Date(entry.doneAt),
                                            "MMMM d, yyyy",
                                          )}
                                        </p>
                                      )}
                                      {status === "in_progress" && (
                                        <p
                                          className="text-[10px] mt-0.5"
                                          style={{ color: GOLD }}
                                        >
                                          In Progress
                                        </p>
                                      )}
                                    </div>
                                    <span
                                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                                      style={{
                                        background: `${color}22`,
                                        color,
                                      }}
                                    >
                                      {status === "done"
                                        ? "Done"
                                        : status === "in_progress"
                                          ? "In Progress"
                                          : "Not Started"}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {doneSubs === 0 && (
        <div
          className="text-center py-12 rounded-2xl"
          style={{ background: CREAM, border: `1.5px dashed ${BORDER}` }}
        >
          <BarChart2
            className="w-10 h-10 mx-auto mb-3 opacity-30"
            style={{ color: GOLD }}
          />
          <p className="text-sm font-medium" style={{ color: CHARCOAL }}>
            No topics completed yet
          </p>
          <p className="text-xs mt-1" style={{ color: MUTED }}>
            Click the circle next to any topic to mark it done, or click any
            subtopic to cycle its status.
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── Completion Forecast ──────────────── */
function CompletionForecast({ schedule }: { schedule: SmartSchedule }) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const fullCount = schedule.subjectForecasts.filter(
    (s) => s.canComplete && s.syllabusPercent < 100,
  ).length;
  const partialCount = schedule.subjectForecasts.filter(
    (s) =>
      !s.canComplete && s.percentCompletable > 0 && s.syllabusPercent < 100,
  ).length;
  const zeroCount = schedule.subjectForecasts.filter(
    (s) =>
      !s.canComplete && s.percentCompletable === 0 && s.syllabusPercent < 100,
  ).length;
  const doneCount = schedule.subjectForecasts.filter(
    (s) => s.syllabusPercent === 100,
  ).length;

  return (
    <div
      className="rounded-2xl p-5 space-y-4"
      style={{ background: `${GOLD}08`, border: `1.5px solid ${GOLD}44` }}
    >
      <div className="flex items-center gap-2">
        <Target className="w-4 h-4" style={{ color: GOLD }} />
        <h3 className="font-semibold text-sm" style={{ color: CHARCOAL }}>
          What You Can Complete
        </h3>
      </div>
      <p className="text-xs" style={{ color: MUTED }}>
        With{" "}
        <strong style={{ color: DARK }}>
          {schedule.hoursPerDay} hrs/day × {schedule.daysPerWeek} days/week
        </strong>{" "}
        for{" "}
        <strong style={{ color: DARK }}>{schedule.targetMonths} months</strong>,
        factoring in your syllabus progress:
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {doneCount > 0 && (
          <div
            className="rounded-xl p-3 text-center"
            style={{ background: `${OLIVE}22`, border: `1px solid ${OLIVE}44` }}
          >
            <div
              className="text-xl font-bold font-serif"
              style={{ color: OLIVE }}
            >
              {doneCount}
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: OLIVE }}>
              Already Done ✓
            </div>
          </div>
        )}
        <div
          className="rounded-xl p-3 text-center"
          style={{ background: `${OLIVE}15`, border: `1px solid ${OLIVE}33` }}
        >
          <div
            className="text-xl font-bold font-serif"
            style={{ color: OLIVE }}
          >
            {fullCount}
          </div>
          <div className="text-[10px] mt-0.5" style={{ color: OLIVE }}>
            Fully Complete
          </div>
        </div>
        {partialCount > 0 && (
          <div
            className="rounded-xl p-3 text-center"
            style={{ background: "#FFF8DC", border: "1px solid #B8860B33" }}
          >
            <div
              className="text-xl font-bold font-serif"
              style={{ color: "#B8860B" }}
            >
              {partialCount}
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: "#B8860B" }}>
              Partially Done
            </div>
          </div>
        )}
        {zeroCount > 0 && (
          <div
            className="rounded-xl p-3 text-center"
            style={{ background: "#FDE8E8", border: "1px solid #C0392B33" }}
          >
            <div
              className="text-xl font-bold font-serif"
              style={{ color: "#C0392B" }}
            >
              {zeroCount}
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: "#C0392B" }}>
              Not Reachable
            </div>
          </div>
        )}
        <div
          className="rounded-xl p-3 text-center"
          style={{ background: CREAM, border: `1px solid ${BORDER}` }}
        >
          <div className="text-xl font-bold font-serif" style={{ color: DARK }}>
            {schedule.minimumMonthsNeeded} mo
          </div>
          <div className="text-[10px] mt-0.5" style={{ color: MUTED }}>
            Minimum Needed
          </div>
        </div>
      </div>

      <div
        className="rounded-xl px-4 py-3"
        style={{
          background: schedule.isAchievable ? `${OLIVE}15` : "#FDE8E8",
          border: `1px solid ${schedule.isAchievable ? OLIVE : "#C0392B"}33`,
        }}
      >
        {schedule.isAchievable ? (
          <p className="text-sm font-semibold" style={{ color: OLIVE }}>
            ✅ You can complete the remaining syllabus in{" "}
            {schedule.targetMonths} months at this pace!
          </p>
        ) : (
          <p className="text-sm font-semibold" style={{ color: "#C0392B" }}>
            ⚠️ At this pace you can fully cover {fullCount + doneCount} of{" "}
            {schedule.totalSubjects} subjects. You need at least{" "}
            {schedule.minimumMonthsNeeded} months for the full syllabus.
          </p>
        )}
        {schedule.completedSubjectsSkipped > 0 && (
          <p className="text-xs mt-1" style={{ color: MUTED }}>
            {schedule.completedSubjectsSkipped} subject(s) are 100% done in your
            syllabus tracker — skipped from schedule.
          </p>
        )}
      </div>

      <button
        onClick={() => setShowBreakdown(!showBreakdown)}
        className="flex items-center gap-2 text-xs font-semibold"
        style={{ color: GOLD }}
      >
        {showBreakdown ? (
          <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
        {showBreakdown ? "Hide" : "Show"} subject-by-subject breakdown
      </button>

      {showBreakdown && (
        <div className="space-y-2">
          {schedule.subjectForecasts.map((sf) => (
            <div
              key={sf.name}
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{
                background:
                  sf.syllabusPercent === 100
                    ? `${OLIVE}10`
                    : sf.canComplete
                      ? `${OLIVE}08`
                      : sf.percentCompletable > 0
                        ? "#FFF8DC"
                        : "#FDE8E8",
                border: `1px solid ${sf.syllabusPercent === 100 ? `${OLIVE}44` : sf.canComplete ? `${OLIVE}33` : sf.percentCompletable > 0 ? "#B8860B33" : "#C0392B33"}`,
              }}
            >
              <span className="text-base flex-shrink-0">
                {sf.syllabusPercent === 100
                  ? "✅"
                  : sf.canComplete
                    ? "✅"
                    : sf.percentCompletable > 0
                      ? "⚠️"
                      : "❌"}
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-sm font-semibold"
                    style={{ color: CHARCOAL }}
                  >
                    {sf.name}
                  </span>
                  {sf.syllabusPercent > 0 && sf.syllabusPercent < 100 && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                      style={{ background: `${GOLD}22`, color: DARK }}
                    >
                      {sf.syllabusPercent}% done in syllabus
                    </span>
                  )}
                  {sf.syllabusPercent === 100 && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                      style={{ background: `${OLIVE}22`, color: OLIVE }}
                    >
                      100% in syllabus
                    </span>
                  )}
                </div>
                {sf.syllabusPercent < 100 && (
                  <>
                    <div
                      className="h-1 rounded-full mt-1.5 overflow-hidden"
                      style={{ background: BORDER }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${sf.percentCompletable}%`,
                          background: sf.canComplete
                            ? OLIVE
                            : sf.percentCompletable > 0
                              ? "#B8860B"
                              : "#C0392B",
                        }}
                      />
                    </div>
                    <p className="text-[10px] mt-1" style={{ color: MUTED }}>
                      {sf.adjustedWeeks === 0
                        ? "Fully covered in syllabus — skipped"
                        : sf.canComplete
                          ? `${sf.weeksNeeded} weeks needed — completable`
                          : sf.percentCompletable > 0
                            ? `~${sf.percentCompletable}% completable (${sf.weeksAvailable}/${sf.weeksNeeded} wks)`
                            : "Not reachable in target timeframe"}
                    </p>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Schedule Planner ─────────────────── */
function SchedulePlanner({
  examType,
  startDate,
  syllabusProgress,
  onGenerate,
}: {
  examType: string;
  startDate: string;
  syllabusProgress: SyllabusProgress;
  onGenerate: (schedule: SmartSchedule) => void;
}) {
  const [hoursPerDay, setHoursPerDay] = useState(2);
  const [daysPerWeek, setDaysPerWeek] = useState(5);
  const [targetMonths, setTargetMonths] = useState(6);
  const [revisionPercent, setRevisionPercent] = useState(30);
  const [preview, setPreview] = useState<SmartSchedule | null>(null);

  const hoursPerWeek = hoursPerDay * daysPerWeek;
  const syllabusPercs = getSyllabusPercents(syllabusProgress, examType);
  const skipped = Object.values(syllabusPercs).filter((p) => p === 100).length;

  function calculate() {
    setPreview(
      generateSmartSchedule(
        examType,
        hoursPerDay,
        daysPerWeek,
        targetMonths,
        revisionPercent,
        startDate,
        syllabusProgress,
      ),
    );
  }

  return (
    <div
      className="rounded-2xl p-6 space-y-6"
      style={{ background: CARD, border: `1px solid ${BORDER}` }}
    >
      <div className="flex items-center gap-2">
        <Calendar className="w-5 h-5" style={{ color: GOLD }} />
        <h3
          className="font-serif text-lg font-semibold"
          style={{ color: CHARCOAL }}
        >
          Study Schedule Planner
        </h3>
      </div>
      <p className="text-xs" style={{ color: MUTED }}>
        Your schedule is automatically adjusted based on your Syllabus Tracker
        progress. Subjects you've fully completed are skipped. Partially done
        subjects get fewer weeks.
      </p>

      {skipped > 0 && (
        <div
          className="rounded-xl px-4 py-3"
          style={{ background: `${OLIVE}12`, border: `1px solid ${OLIVE}33` }}
        >
          <p className="text-xs font-semibold" style={{ color: OLIVE }}>
            ✅ {skipped} subject(s) are 100% complete in your Syllabus Tracker —
            they'll be skipped.
          </p>
        </div>
      )}

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

      <div
        className="rounded-xl p-4"
        style={{ background: CREAM, border: `1px solid ${BORDER}` }}
      >
        <p className="text-xs font-semibold mb-2" style={{ color: CHARCOAL }}>
          Your availability:
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
        Generate My Week-by-Week Schedule
      </button>

      {preview && (
        <div className="space-y-4">
          <CompletionForecast schedule={preview} />
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

/* ─── Schedule View ────────────────────── */
function ScheduleView({
  schedule,
  onEdit,
}: {
  schedule: SmartSchedule;
  onEdit: () => void;
}) {
  const [filter, setFilter] = useState<WeekType | "all">("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const filtered =
    filter === "all"
      ? schedule.weeks
      : schedule.weeks.filter((w) => w.type === filter);
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
            {schedule.revisionPercent}% revision · Synced with syllabus tracker
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

      <CompletionForecast schedule={schedule} />

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

      {subjects.map((subject) => {
        const subjectWeeks = filtered.filter((w) => w.subject === subject);
        if (subjectWeeks.length === 0) return null;
        const allWeeks = schedule.weeks.filter((w) => w.subject === subject);
        const isExpanded = expanded[subject] ?? false;

        return (
          <div
            key={subject}
            className="rounded-2xl overflow-hidden"
            style={{ background: CARD, border: `1px solid ${BORDER}` }}
          >
            <button
              onClick={() =>
                setExpanded((p) => ({ ...p, [subject]: !p[subject] }))
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
                          ~{week.hoursAvailable} hrs available
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
  const [activeTab, setActiveTab] = useState<
    "overview" | "progress" | "schedule"
  >("overview");
  const [showBuilder, setShowBuilder] = useState(!rm.smartSchedule);

  const syllabusProgress = loadSyllabusProgress(userId);
  const examType = rm.examType;
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
      <div className="flex gap-2 flex-wrap">
        {(["overview", "progress", "schedule"] as const).map((tab) => (
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
            {tab === "overview"
              ? "📋 Overview"
              : tab === "progress"
                ? "📊 My Progress"
                : "📅 Schedule"}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <div className="space-y-6">
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

          {/* Unavailable periods */}
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
              Log periods when you can't study — end date extends and targets
              adjust automatically.
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

      {/* MY PROGRESS TAB */}
      {activeTab === "progress" && (
        <MyProgressTab userId={userId} examType={examType} />
      )}

      {/* SCHEDULE TAB */}
      {activeTab === "schedule" && (
        <div className="space-y-6">
          {showBuilder || !rm.smartSchedule ? (
            <SchedulePlanner
              examType={rm.examType}
              startDate={rm.startDate}
              syllabusProgress={syllabusProgress}
              onGenerate={saveSchedule}
            />
          ) : (
            <ScheduleView
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
          ✓ Roadmap saved
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
    if (!confirm("Reset your roadmap? Progress will be lost.")) return;
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
