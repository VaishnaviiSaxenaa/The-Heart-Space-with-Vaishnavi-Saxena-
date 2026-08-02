import { useState, useEffect, useRef } from "react";
import { saveRoadmapToDB, saveScheduleInputsToDB, saveTopicSpeedToDB, saveSubjectOrderToDB, saveStudyPeriodsToDB, saveBaseWeeksToDB, syncAllFromDB, pushAllToDB } from "../lib/supabase-sync";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
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
import RoadmapCalendar, { loadCalendar, saveCalendarLocal, autoGenerateCalendar } from "./roadmap-calendar-view";
import { JAM_SUBJECTS, NET_SUBJECTS } from "./subjects";
import { format, addWeeks, differenceInWeeks, parseISO } from "date-fns";
import {
  loadSyllabusProgress,
  SYLLABUS,
  type SyllabusProgress,
} from "./syllabus";

/* ─── Brand tokens ─────────────────────── */
const CREAM = "#F8F5F0";
const CHARCOAL = "#2D2A25";
const GOLD = "#C9A84C";
const PROGRESS_PURPLE = "#6B568F";
const DARK = "#2D2A25";
const CARD = "#FFFDF9";
const MUTED = "#7A7267";
const BORDER = "#E5DDD0";
const OLIVE = "#4A8F5C"; // now = COMPLETED_GREEN
const ROSE = "#D4A5A5";

/* ─── Types ────────────────────────────── */
export type RoadmapType =
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
  endDate: string;
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

interface VariableWeek {
  id: string;
  label: string /* e.g. "Holiday week" */;
  startDate: string /* ISO date */;
  endDate: string /* ISO date */;
  multiplier?: number /* e.g. 2.0 = double hours */;
  customHours?: number /* e.g. 5 = 5 hrs/day that week */;
}

/* ─── Topic speed types ─────────────────── */
type TopicSpeedKey =
  | "gentle"
  | "steady"
  | "standard"
  | "accelerated"
  | "rapid";
type TopicSpeedMap = Record<string, TopicSpeedKey>;

const SPEED_MULTIPLIERS: Record<TopicSpeedKey, number> = {
  gentle: 1.40,
  steady: 1.30,
  standard: 1.00,
  accelerated: 0.70,
  rapid: 0.60,
};

const SPEED_CFG: Record<
  TopicSpeedKey,
  { emoji: string; label: string; color: string }
> = {
  gentle:      { emoji: "🐢", label: "Gentle",      color: "#C0392B" },
  steady:      { emoji: "🌿", label: "Steady",      color: OLIVE },
  standard:    { emoji: "⚖️",  label: "Standard",    color: PROGRESS_PURPLE },
  accelerated: { emoji: "⚡", label: "Accelerated", color: "#E67E22" },
  rapid:       { emoji: "🚀", label: "Rapid",       color: "#27AE60" },
};

type BaseWeeksMap = Record<string, number>;

export interface Roadmap {
  type: RoadmapType;
  examType: string;
  totalMonths: number;
  startDate: string;
  phases: RoadmapPhase[];
  unavailablePeriods: UnavailablePeriod[];
  variableWeeks?: VariableWeek[];
  smartSchedule?: SmartSchedule;
  createdAt: string;
  lastUpdated: string;
}

/* ─── Subject order + parallel config ───── */
function lsOrderKey(uid: string) {
  return `hs_subject_order_${uid}`;
}
function lsParallelKey(uid: string) {
  return `hs_parallel_${uid}`;
}

function loadSubjectOrder(uid: string, defaultIds: string[]): string[] {
  try {
    const r = localStorage.getItem(lsOrderKey(uid));
    if (!r) return defaultIds;
    const saved = JSON.parse(r) as string[];
    const extra = defaultIds.filter((id) => !saved.includes(id));
    return [...saved.filter((id: string) => defaultIds.includes(id)), ...extra];
  } catch {
    return defaultIds;
  }
}
function saveSubjectOrder(uid: string, ids: string[]) {
  try {
    localStorage.setItem(lsOrderKey(uid), JSON.stringify(ids));
    saveSubjectOrderToDB(uid, ids).catch(() => {});
  } catch {}
}

interface ParallelConfig {
  mode: "sequential" | "parallel";
  parallelCount: number;
  hoursPerSubject: Record<string, number>;
}

interface StudyPeriod {
  id: string;
  label: string;
  startDate: string;
  endDate: string | "indefinite";
  mode: "sequential" | "parallel";
  parallelCount: number;
  subjectIds: string[];
  hoursPerSubject: Record<string, number>;
}

function lsStudyPeriodsKey(uid: string) {
  return `hs_study_periods_${uid}`;
}
function loadStudyPeriods(uid: string): StudyPeriod[] {
  try {
    const r = localStorage.getItem(lsStudyPeriodsKey(uid));
    return r ? JSON.parse(r) : [];
  } catch {
    return [];
  }
}
function saveStudyPeriods(uid: string, periods: StudyPeriod[]) {
  try {
    localStorage.setItem(lsStudyPeriodsKey(uid), JSON.stringify(periods));
    saveStudyPeriodsToDB(uid, periods).catch(() => {});
  } catch {}
}

function loadParallelConfig(uid: string): ParallelConfig {
  try {
    const r = localStorage.getItem(lsParallelKey(uid));
    return r
      ? JSON.parse(r)
      : { mode: "sequential", parallelCount: 1, hoursPerSubject: {} };
  } catch {
    return { mode: "sequential", parallelCount: 1, hoursPerSubject: {} };
  }
}
function saveParallelConfig(uid: string, cfg: ParallelConfig) {
  try {
    localStorage.setItem(lsParallelKey(uid), JSON.stringify(cfg));
  } catch {}
}

/* ─── Speed + base weeks localStorage ───── */
function lsSpeedKey(uid: string) {
  return `hs_topic_speed_${uid}`;
}
function lsBaseKey(uid: string) {
  return `hs_base_weeks_${uid}`;
}

function loadTopicSpeed(uid: string): TopicSpeedMap {
  try {
    const r = localStorage.getItem(lsSpeedKey(uid));
    return r ? JSON.parse(r) : {};
  } catch {
    return {};
  }
}
function saveTopicSpeed(uid: string, m: TopicSpeedMap) {
  try {
    localStorage.setItem(lsSpeedKey(uid), JSON.stringify(m));
    saveTopicSpeedToDB(uid, m).catch(() => {});
  } catch {}
}
function loadBaseWeeks(uid: string): BaseWeeksMap {
  try {
    const r = localStorage.getItem(lsBaseKey(uid));
    return r ? JSON.parse(r) : {};
  } catch {
    return {};
  }
}
function saveBaseWeeks(uid: string, m: BaseWeeksMap) {
  try {
    localStorage.setItem(lsBaseKey(uid), JSON.stringify(m));
    saveBaseWeeksToDB(uid, m).catch(() => {});
  } catch {}
}

/* ─── Practice integration helpers ──────── */
function loadPracticeProgress(
  uid: string,
): Record<
  string,
  { attempts: { accuracy: number; concept: string; date: string }[] }
> {
  try {
    const r = localStorage.getItem(`hs_practice_${uid}`);
    return r ? JSON.parse(r) : {};
  } catch {
    return {};
  }
}

function getWeightedAccuracy(attempts: { accuracy: number }[]): number | null {
  if (!attempts.length) return null;
  if (attempts.length === 1) return attempts[0].accuracy;
  const latest = attempts[attempts.length - 1].accuracy;
  const restAvg =
    attempts.slice(0, -1).reduce((s, a) => s + a.accuracy, 0) /
    (attempts.length - 1);
  return Math.round(latest * 0.6 + restAvg * 0.4);
}

function getWeightedConcept(attempts: { concept: string }[]): string | null {
  if (!attempts.length) return null;
  const order = ["weak", "developing", "strong"];
  if (attempts.length === 1) return attempts[0].concept;
  const latest = order.indexOf(attempts[attempts.length - 1].concept);
  const restAvg =
    attempts.slice(0, -1).reduce((s, a) => s + order.indexOf(a.concept), 0) /
    (attempts.length - 1);
  return order[Math.round(latest * 0.6 + restAvg * 0.4)] ?? "developing";
}

function getQPRevisionAdjustment(
  syllabusId: string,
  pp: ReturnType<typeof loadPracticeProgress>,
): number {
  const subject = SYLLABUS.find((s) => s.id === syllabusId);
  if (!subject) return 0;
  const subtopics = subject.topics.flatMap((t) => t.subtopics);
  const entries = subtopics.map((st) => pp[st.id]).filter(Boolean);
  if (!entries.length) return 0;
  let adj = 0;
  let count = 0;
  entries.forEach((entry) => {
    if (!entry?.attempts?.length) return;
    const acc = getWeightedAccuracy(entry.attempts);
    const conc = getWeightedConcept(entry.attempts);
    if (acc === null) return;
    count++;
    if (acc > 85) adj -= 0.5;
    else if (acc < 50) adj += 1.0;
    if (conc === "weak") adj += 1.0;
    else if (conc === "developing") adj += 0.5;
    else if (conc === "strong") adj -= 0.5;
  });
  return count > 0 ? adj / count : 0;
}

/* ─── Subject data ─────────────────────── */
/* Subject data now imported from ./subjects.ts (canonical source) */

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
export function getSyllabusPercents(
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
export const ROADMAP_TYPES: Record<
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

export function generatePhases(examType: string, totalMonths: number): RoadmapPhase[] {
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
  unavailablePeriods: UnavailablePeriod[] = [],
  variableWeeks: VariableWeek[] = [],
  topicSpeed: TopicSpeedMap = {},
  baseWeeksOverride: BaseWeeksMap = {},
  practiceProgress: ReturnType<typeof loadPracticeProgress> = {},
  subjectOrder: string[] = [],
  parallelConfig: ParallelConfig = {
    mode: "sequential",
    parallelCount: 1,
    hoursPerSubject: {},
  },
  studyPeriods: StudyPeriod[] = [],
  consumedHoursBySubject: Record<string, number> = {},
): SmartSchedule {
  const rawSubjects = examType === "JAM" ? JAM_SUBJECTS : NET_SUBJECTS;
  /* Apply custom subject order */
  const allSubjects =
    subjectOrder.length > 0
      ? [...rawSubjects].sort((a, b) => {
          const ai = subjectOrder.indexOf(a.id);
          const bi = subjectOrder.indexOf(b.id);
          if (ai === -1 && bi === -1) return 0;
          if (ai === -1) return 1;
          if (bi === -1) return -1;
          return ai - bi;
        })
      : rawSubjects;
  const weekBreakdown =
    examType === "JAM" ? JAM_WEEK_BREAKDOWN : NET_WEEK_BREAKDOWN;
  const baseHoursPerWeek = hoursPerDay * daysPerWeek;

  /* Build a map of week-number → effective hours for that week */
  /* Week 1 starts on startDate */
  const start = parseISO(startDate);

  /* For each calendar week offset, check if it's unavailable or variable */
  function getEffectiveHoursForWeekOffset(weekOffset: number): {
    hours: number;
    isUnavailable: boolean;
    label?: string;
  } {
    const weekStart = addWeeks(start, weekOffset);
    const weekStartStr = format(weekStart, "yyyy-MM-dd");

    /* Check unavailable periods first */
    for (const up of unavailablePeriods) {
      if (!up.startDate || !up.endDate) continue;
      const upStart = parseISO(up.startDate);
      const upEnd = parseISO(up.endDate);
      if (weekStart >= upStart && weekStart < upEnd) {
        return { hours: 0, isUnavailable: true, label: up.label };
      }
    }

    /* Check variable weeks */
    for (const vw of variableWeeks) {
      if (!vw.startDate || !vw.endDate) continue;
      const vwStart = parseISO(vw.startDate);
      const vwEnd = parseISO(vw.endDate);
      if (weekStart >= vwStart && weekStart < vwEnd) {
        const effectiveHoursPerDay =
          vw.customHours !== undefined
            ? vw.customHours
            : (baseHoursPerWeek / daysPerWeek) * (vw.multiplier ?? 1);
        return {
          hours: effectiveHoursPerDay * daysPerWeek,
          isUnavailable: false,
          label: vw.label,
        };
      }
    }

    return { hours: baseHoursPerWeek, isUnavailable: false };
  }

  const hoursPerWeek = baseHoursPerWeek;
  const targetWeeks = targetMonths * 4;
  const syllabusPercs = getSyllabusPercents(syllabusProgress, examType);

  const subjectsWithAdjusted = allSubjects.map((s) => {
    const pct = syllabusPercs[s.syllabusId] ?? 0;
    const totalH = (s as any).totalHours ?? 0;
    const consumedH = consumedHoursBySubject[s.id] ?? 0;
    const remaining = totalH > 0
      ? Math.max(0, 1 - consumedH / totalH)
      : Math.max(0, 1 - pct / 100);
    const computedWeeksFromHours = (s as any).totalHours
      ? (s as any).totalHours / baseHoursPerWeek
      : s.studyWeeks;
    const baseWeeks = baseWeeksOverride[s.id] ?? computedWeeksFromHours;
    const speedKey = (topicSpeed[s.id] ?? "standard") as TopicSpeedKey;
    const speedMult = SPEED_MULTIPLIERS[speedKey] ?? 1.0;
    const adjStudy = Math.max(0, Math.ceil(baseWeeks * remaining * speedMult));
    const adjAssign = pct >= 100 ? 0 : s.assignmentWeeks;
    const baseRev = adjStudy > 0 ? adjStudy * (revisionPercent / 100) : 0;
    const qpAdj = getQPRevisionAdjustment(s.syllabusId, practiceProgress);
    const adjRevision =
      adjStudy > 0 ? Math.max(0, Math.ceil(baseRev + qpAdj)) : 0;
    return {
      ...s,
      baseWeeks,
      speedKey,
      speedMult,
      syllabusPercent: pct,
      adjustedWeeks: adjStudy + adjAssign + adjRevision,
      adjStudy,
      adjAssign,
      adjRevision,
      qpAdj,
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

  /* ── Hours-based schedule engine ─────────────────────────────────────── */
  /* Each task = 1 week-block of hours. Variable intensity compresses real calendar. */
  interface SubjectTask {
    name: string;
    id: string;
    type: "study" | "assignment" | "revision";
    hoursNeeded: number;
    focus: string;
  }
  const tasks: SubjectTask[] = [];
  subjectsWithAdjusted.forEach((subject) => {
    if (subject.adjustedWeeks === 0) return;
    const bd = weekBreakdown[subject.id] ?? [];
    const partialLabel =
      subject.syllabusPercent > 0 && subject.syllabusPercent < 100
        ? ` (continuing from ${subject.syllabusPercent}% done)`
        : "";
    for (let w = 0; w < subject.adjStudy; w++) {
      tasks.push({
        name: subject.name,
        id: subject.id,
        type: "study",
        hoursNeeded: hoursPerWeek,
        focus:
          (bd[w] ?? `${subject.name} — Part ${w + 1}`) +
          (w === 0 ? partialLabel : ""),
      });
    }
    if (subject.adjAssign > 0) {
      tasks.push({
        name: subject.name,
        id: subject.id,
        type: "assignment",
        hoursNeeded: hoursPerWeek * subject.adjAssign,
        focus: `${subject.name} — Assignments & Problem Practice`,
      });
    }
    for (let r = 0; r < subject.adjRevision; r++) {
      tasks.push({
        name: subject.name,
        id: subject.id,
        type: "revision",
        hoursNeeded: hoursPerWeek,
        focus:
          r === 0
            ? `${subject.name} — Revision Pass 1 (key theorems, formulas)`
            : `${subject.name} — Revision Pass ${r + 1} (weak areas, problem drill)`,
      });
    }
  });

  /* Walk calendar engine
     Default: sequential (one subject at a time, hours-based)
     Simultaneous Studies: only when a StudyPeriod is active for that week */
  const weeks: ScheduleWeek[] = [];
  let calOffset2 = 0;

  /* Get active simultaneous study period for a calendar week */
  function getActivePeriod(weekOffset: number): StudyPeriod | null {
    const weekDate = addWeeks(start, weekOffset);
    if (weekOffset === 0) {
      console.log("[DEBUG] studyPeriods passed to engine:", JSON.stringify(studyPeriods));
      console.log("[DEBUG] roadmap start date:", format(start, "yyyy-MM-dd"));
    }
    for (const p of studyPeriods) {
      if (!p.startDate) continue;
      const pStart = parseISO(p.startDate);
      const pEnd =
        p.endDate === "indefinite"
          ? new Date("9999-12-31")
          : parseISO(p.endDate);
      if (weekDate >= pStart && weekDate < pEnd) return p;
    }
    return null;
  }

  /* Build per-subject task queues.
     Each task = hoursNeeded hours of study for that subject.
     hoursNeeded = baseHoursPerWeek (what the student studies per week on that subject).
     In sequential mode this equals full baseHoursPerWeek.
     In simultaneous mode it equals the allocated hours per week for that subject. */
  const subjectIds = [...new Set(tasks.map((t) => t.id))];
  interface TQ {
    id: string;
    name: string;
    tasks: SubjectTask[];
    taskIdx: number;
    taskHrsLeft: number;
  }
  const tQueues: TQ[] = subjectIds.map((id) => {
    const subTasks = tasks.filter((t) => t.id === id);
    return {
      id,
      name: subTasks[0]?.name ?? id,
      tasks: subTasks,
      taskIdx: 0,
      taskHrsLeft: subTasks[0]?.hoursNeeded ?? 0,
    };
  });

  let globalSubjectIdx = 0;

  while (calOffset2 < 500) {
    const allDone = tQueues.every((q) => q.taskIdx >= q.tasks.length);
    if (allDone) break;

    const eff2 = getEffectiveHoursForWeekOffset(calOffset2);
    if (eff2.isUnavailable || eff2.hours <= 0.5) {
      calOffset2++;
      continue;
    }

    const vSuffix =
      eff2.label && Math.abs(eff2.hours - baseHoursPerWeek) > 0.1
        ? " (" + eff2.label + ": " + Math.round(eff2.hours * 10) / 10 + " hrs)"
        : "";

    const activePeriod = getActivePeriod(calOffset2);

    if (activePeriod) {
      /* SIMULTANEOUS MODE: run selected topics in parallel this week */
      const slotIds =
        activePeriod.subjectIds ??
        subjectIds.slice(0, activePeriod.parallelCount);
      slotIds.forEach((sid) => {
        const q = tQueues.find((tq) => tq.id === sid);
        if (!q || q.taskIdx >= q.tasks.length) return;
        const allocHrs = activePeriod.hoursPerSubject[sid]
          ? activePeriod.hoursPerSubject[sid] * daysPerWeek
          : eff2.hours / slotIds.length;
        /* Advance task by one week of allocated hours */
        q.taskHrsLeft -= allocHrs;
        const task = q.tasks[q.taskIdx];
        let focus = task.focus;
        if (q.taskHrsLeft <= 0) {
          q.taskIdx++;
          q.taskHrsLeft =
            q.taskIdx < q.tasks.length ? q.tasks[q.taskIdx].hoursNeeded : 0;
        } else {
          focus = task.focus + " (cont.)";
        }
        weeks.push({
          weekNumber: calOffset2,
          subject: q.name,
          focus: focus + vSuffix,
          type: task.type,
          hoursRequired: allocHrs,
          hoursAvailable: Math.min(allocHrs, eff2.hours),
          startDate: format(addWeeks(start, calOffset2), "MMM d"),
        });
      });
    } else {
      /* SEQUENTIAL MODE: work on one subject at a time */
      while (
        globalSubjectIdx < tQueues.length &&
        tQueues[globalSubjectIdx].taskIdx >=
          tQueues[globalSubjectIdx].tasks.length
      ) {
        globalSubjectIdx++;
      }
      if (globalSubjectIdx >= tQueues.length) break;

      const q = tQueues[globalSubjectIdx];
      let hoursLeft = eff2.hours;
      const focusParts: string[] = [];
      const weekType = q.tasks[q.taskIdx]?.type ?? "study";

      while (q.taskIdx < q.tasks.length && hoursLeft > 0.5) {
        if (q.taskHrsLeft <= hoursLeft) {
          hoursLeft -= q.taskHrsLeft;
          focusParts.push(q.tasks[q.taskIdx].focus);
          q.taskIdx++;
          q.taskHrsLeft =
            q.taskIdx < q.tasks.length ? q.tasks[q.taskIdx].hoursNeeded : 0;
        } else {
          q.taskHrsLeft -= hoursLeft;
          focusParts.push(q.tasks[q.taskIdx].focus + " (cont.)");
          hoursLeft = 0;
        }
      }

      weeks.push({
        weekNumber: weeks.length + 1,
        subject: q.name,
        focus: focusParts.join(" + ") + vSuffix,
        type: weekType,
        hoursRequired: eff2.hours,
        hoursAvailable: eff2.hours,
        startDate: format(addWeeks(start, calOffset2), "MMM d"),
      });

      if (q.taskIdx >= q.tasks.length) globalSubjectIdx++;
    }

    calOffset2++;
  }

  /* Sort and renumber (parallel weeks used calOffset as weekNumber) */
  weeks.sort((a, b) => a.weekNumber - b.weekNumber);
  weeks.forEach((w, i) => {
    w.weekNumber = i + 1;
  });

  /* Reset calendarOffset for finalWeeks phase (picks up from where task walk left off) */
  let calendarOffset = calOffset2;

  /* ── Build finalWeeks: merge study weeks with unavailable pause weeks ── */
  /* weeks[] already has correct hours-based positions. Now insert pause weeks. */
  const finalWeeks: ScheduleWeek[] = [];
  let studyIdx = 0;
  /* Walk all calendar weeks up to the last study week's calendar position */
  const totalCalWeeks = calendarOffset + bufferWeeks + 10;
  calendarOffset = 0;
  while (calendarOffset < totalCalWeeks || studyIdx < weeks.length) {
    const eff = getEffectiveHoursForWeekOffset(calendarOffset);
    /* Check if there's a study week starting at this calendar offset */
    const studyWeek = studyIdx < weeks.length ? weeks[studyIdx] : null;
    const studyWeekCalPos = studyWeek
      ? (() => {
          /* Find which calendar offset this study week corresponds to */
          /* The study week's startDate tells us */
          const swDate = studyWeek.startDate;
          const expectedDate = format(addWeeks(start, calendarOffset), "MMM d");
          return swDate === expectedDate;
        })()
      : false;

    if (eff.isUnavailable) {
      finalWeeks.push({
        weekNumber: finalWeeks.length + 1,
        subject: "Unavailable",
        focus: `⏸ ${eff.label ?? "Unavailable"} — No study this week`,
        type: "buffer",
        hoursRequired: 0,
        hoursAvailable: 0,
        startDate: format(addWeeks(start, calendarOffset), "MMM d"),
      });
      calendarOffset++;
    } else if (studyWeekCalPos && studyWeek) {
      finalWeeks.push({ ...studyWeek, weekNumber: finalWeeks.length + 1 });
      studyIdx++;
      calendarOffset++;
    } else if (studyIdx < weeks.length) {
      /* Gap week (variable intensity week already absorbed into study week) */
      calendarOffset++;
    } else {
      break;
    }
    if (finalWeeks.length > 400) break; /* safety */
  }

  /* Buffer weeks */
  for (let b = 0; b < bufferWeeks; b++) {
    finalWeeks.push({
      weekNumber: finalWeeks.length + 1,
      subject: "Full Syllabus",
      focus:
        b === 0
          ? "Mock Tests — Full length, time management practice"
          : "Final Revision — Formula sheets, exam strategy, weak spots",
      type: "revision",
      hoursRequired: hoursPerWeek,
      hoursAvailable: hoursPerWeek,
      startDate: format(addWeeks(start, finalWeeks.length), "MMM d"),
    });
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
    weeks: finalWeeks,
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
  study: { label: "Study", color: DARK, bg: `${PROGRESS_PURPLE}15`, icon: BookOpen },
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
export function saveRoadmap(userId: string, rm: Roadmap) {
  // Fallback: get userId from localStorage if not provided
  const effectiveId = userId || (() => {
    try { return JSON.parse(localStorage.getItem("heartspace_user") ?? "{}").id ?? ""; } catch { return ""; }
  })();
  if (!effectiveId) { console.warn("saveRoadmap: no userId, skipping"); return; }
  localStorage.setItem(lsKey(effectiveId), JSON.stringify(rm));
  saveRoadmapToDB(effectiveId, rm)
.catch(() => {});
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
  in_progress: { label: "▶", color: PROGRESS_PURPLE },
  done: { label: "✓", color: OLIVE },
};

function runAIEngine(roadmap: Roadmap): AICalc {
  const totalWeeks = roadmap.totalMonths * 4;
  const unavailableWeeks = roadmap.unavailablePeriods.reduce((s, p) => {
    if (!p.startDate || !p.endDate) return s;
    const diff = Math.max(
      0,
      Math.round(
        (parseISO(p.endDate).getTime() - parseISO(p.startDate).getTime()) /
          (7 * 24 * 60 * 60 * 1000),
      ),
    );
    return s + diff;
  }, 0);
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
        borderColor: allDone ? OLIVE : anyDone ? PROGRESS_PURPLE : BORDER,
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
        <div className="w-2 h-2 rounded-full" style={{ background: PROGRESS_PURPLE }} />
      ) : null}
    </button>
  );
}

/* ─── My Progress Tab ──────────────────── */
export function MyProgressTab({
  userId,
  examType,
  storagePrefix = "topic",
  getSubjectHours,
}: {
  userId: string;
  examType: string;
  storagePrefix?: string;
  getSubjectHours?: (syllabusId: string) => { consumed: number; total: number } | null;
}) {
  const isJAM = examType === "JAM";
  const TC_SYLLABUS_KEY = (uidX: string) => `hs_${storagePrefix}_syllabus_${uidX}`;
  const [progress, setProgress] = useState<SyllabusProgress>(() => {
    try { return JSON.parse(localStorage.getItem(TC_SYLLABUS_KEY(userId)) ?? "{}"); } catch { return {}; }
  });
  const calHours = (() => {
    try {
      const uid = userId || (() => { try { return JSON.parse(localStorage.getItem("heartspace_user")||"{}").id||""; } catch { return ""; } })();
      const cal = JSON.parse(localStorage.getItem(`hs_calendar_${uid}`) ?? "{}");
      const todayLocal = new Date();
      const todayKey = `${todayLocal.getFullYear()}-${String(todayLocal.getMonth()+1).padStart(2,'0')}-${String(todayLocal.getDate()).padStart(2,'0')}`;
      const hours: Record<string, number> = {};
      Object.entries(cal).forEach(([day, entries]: [string, any]) => {
        if (day <= todayKey) entries.forEach((e: any) => { hours[e.subjectId] = (hours[e.subjectId] ?? 0) + e.hours; });
      });
      return hours;
    } catch { return {}; }
  })();
  const SUBJ_HOURS: Record<string, number> = isJAM
    ? { la: 70, ra: 70, fov: 50, gt: 50, mvc: 25, ode: 40, int: 30, misc: 25 }
    : { la: 80, ca: 80, ra: 80, dc: 60, aa: 60, ie: 40, cv: 40, ode: 40, pde: 40, na: 40 };
  const SYLLABUS_CAL_MAP: Record<string, string> = isJAM
    ? { linear_algebra: "la", real_analysis: "ra", functions_of_one_variable: "fov", group_theory: "gt", multiple_variable_calculus: "mvc", ode: "ode", integration: "int", miscellaneous: "misc" }
    : { linear_algebra_net: "la", complex_analysis: "ca", real_analysis_net: "ra", differential_calculus_net: "dc", abstract_algebra: "aa", integral_equations: "ie", calculus_of_variations: "cv", ode_net: "ode", pde: "pde", numerical_analysis: "na" };
  useEffect(() => {
    const viewAsId = new URLSearchParams(window.location.search).get("viewAs");
    if (!viewAsId) return;
    import("../lib/supabase").then(({ supabase }) => {
      supabase.from("syllabus_progress").select("data").eq("user_id", userId).single()
        .then(({ data: sd }) => { if (sd?.data) setProgress(sd.data as SyllabusProgress); });
    });
  }, [userId]);
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
  })).sort((a, b) => {
    const order = isJAM
      ? ["linear_algebra","real_analysis","functions_of_one_variable","group_theory","multiple_variable_calculus","ode","integration","miscellaneous"]
      : ["linear_algebra_net","complex_analysis","real_analysis_net","differential_calculus_net","abstract_algebra","integral_equations","calculus_of_variations","ode_net","pde","numerical_analysis"];
    const ai = order.indexOf(a.id); const bi = order.indexOf(b.id);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

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
      localStorage.setItem(TC_SYLLABUS_KEY(userId), JSON.stringify(next));
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
            color: PROGRESS_PURPLE,
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
              background: `linear-gradient(90deg, ${OLIVE} 0%, ${PROGRESS_PURPLE} 100%)`,
            }}
          />
        </div>
        <p className="text-xs mt-2" style={{ color: MUTED }}>
          {doneSubs} of {totalSubs} subtopics completed · Click ○ on a topic to
          mark all done · Click any subtopic to cycle status
        </p>
        {/* Hours progress */}
        {(() => {
          const totalHrs = Object.values(SUBJ_HOURS).reduce((a, b) => a + b, 0);
          const coveredHrs = Object.entries(SUBJ_HOURS).reduce((a, [calId]) => a + (calHours[calId] ?? 0), 0);
          const hrsPct = totalHrs > 0 ? Math.round((coveredHrs / totalHrs) * 100) : 0;
          return (
            <div className="mt-3">
              <div className="flex justify-between text-sm mb-1.5">
                <span className="font-semibold" style={{ color: CHARCOAL }}>Hours Coverage</span>
                <span className="font-bold" style={{ color: "#E07A28" }}>{Math.round(coveredHrs * 10) / 10}/{totalHrs}h · {hrsPct}%</span>
              </div>
              <div className="h-3 rounded-full overflow-hidden" style={{ background: BORDER }}>
                <div className="h-full rounded-full transition-all duration-700" style={{
                  width: `${hrsPct}%`,
                  background: "linear-gradient(90deg, #E07A28 0%, #E0B428 100%)",
                }} />
              </div>
            </div>
          );
        })()}
      </div>


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
                  style={{ background: isOpen ? `${PROGRESS_PURPLE}08` : CARD }}
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
                              background: pct === 100 ? OLIVE : PROGRESS_PURPLE,
                            }}
                          />
                        </div>
                        <span
                          className="text-xs flex-shrink-0"
                          style={{ color: pct === 100 ? OLIVE : MUTED }}
                        >
                          {pct}% · {done}/{total}
                          {inProg > 0 && ` · ${inProg} in progress`}
                          {getSubjectHours && (() => {
                            const h = getSubjectHours(subject.id);
                            if (!h) return null;
                            return <span style={{ marginLeft: 6 }}>· {Math.round(h.consumed*10)/10}/{h.total}h</span>;
                          })()}
                        </span>
                      </div>
                      {SUBJ_HOURS[SYLLABUS_CAL_MAP[subject.id] ?? subject.id] && (
                        <div className="flex items-center gap-3 mt-1">
                          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: BORDER }}>
                            <div className="h-full rounded-full" style={{
                              width: `${Math.min(Math.round(((calHours[SYLLABUS_CAL_MAP[subject.id] ?? subject.id] ?? 0) / SUBJ_HOURS[SYLLABUS_CAL_MAP[subject.id] ?? subject.id]) * 100), 100)}%`,
                              background: "#E07A28",
                            }} />
                          </div>
                          <span className="text-xs flex-shrink-0" style={{ color: "#E07A28" }}>
                            {Math.round((calHours[SYLLABUS_CAL_MAP[subject.id] ?? subject.id] ?? 0) * 10) / 10}/{SUBJ_HOURS[SYLLABUS_CAL_MAP[subject.id] ?? subject.id]}h
                          </span>
                        </div>
                      )}
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
                              background: isTopicOpen ? `${PROGRESS_PURPLE}06` : CREAM,
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
                                      ? PROGRESS_PURPLE
                                      : MUTED;
                                const bg =
                                  status === "done"
                                    ? `${OLIVE}12`
                                    : status === "in_progress"
                                      ? `${PROGRESS_PURPLE}12`
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
                                          style={{ color: PROGRESS_PURPLE }}
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
            style={{ color: PROGRESS_PURPLE }}
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
      style={{ background: `${PROGRESS_PURPLE}08`, border: `1.5px solid ${PROGRESS_PURPLE}44` }}
    >
      <div className="flex items-center gap-2">
        <Target className="w-4 h-4" style={{ color: PROGRESS_PURPLE }} />
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
        style={{ color: PROGRESS_PURPLE }}
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
                      style={{ background: `${PROGRESS_PURPLE}22`, color: DARK }}
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

/* ─── Schedule inputs localStorage ─────── */
const DEFAULT_SCHEDULE_SELECTED_DAYS = [1, 2, 3, 4, 5]; // Mon-Fri
function loadScheduleInputs(userId: string) {
  try {
    const r = localStorage.getItem(`hs_schedule_inputs_${userId}`);
    const parsed = r ? JSON.parse(r) : null;
    return parsed
      ? { selectedDays: DEFAULT_SCHEDULE_SELECTED_DAYS, ...parsed }
      : {
          hoursPerDay: 2,
          daysPerWeek: 5,
          targetMonths: 6,
          revisionPercent: 30,
          selectedDays: DEFAULT_SCHEDULE_SELECTED_DAYS,
        };
  } catch {
    return {
      hoursPerDay: 2,
      daysPerWeek: 5,
      targetMonths: 6,
      revisionPercent: 30,
      selectedDays: DEFAULT_SCHEDULE_SELECTED_DAYS,
    };
  }
}
export function saveScheduleInputs(
  userId: string,
  inputs: {
    hoursPerDay: number;
    daysPerWeek: number;
    targetMonths: number;
    revisionPercent: number;
  },
) {
  try {
    localStorage.setItem(
      `hs_schedule_inputs_${userId}`,
      JSON.stringify(inputs),
    );
  } catch {
    /* ignore */
  }
}

/* ─── Variable Weeks Panel ──────────────── */
function VariableWeeksPanel({
  variableWeeks,
  unavailablePeriods,
  baseHoursPerDay,
  daysPerWeek,
}: {
  variableWeeks: VariableWeek[];
  unavailablePeriods: UnavailablePeriod[];
  baseHoursPerDay: number;
  daysPerWeek: number;
}) {
  if (variableWeeks.length === 0 && unavailablePeriods.length === 0)
    return null;

  return (
    <div
      className="rounded-2xl p-4 space-y-2"
      style={{ background: `${PROGRESS_PURPLE}08`, border: `1px solid ${PROGRESS_PURPLE}33` }}
    >
      <p className="text-xs font-semibold" style={{ color: CHARCOAL }}>
        Special Weeks in Schedule
      </p>
      {unavailablePeriods.map((up) => (
        <div
          key={up.id}
          className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: `${ROSE}15`, border: `1px solid ${ROSE}44` }}
        >
          <span className="text-sm">⏸</span>
          <span
            className="flex-1 text-xs font-medium"
            style={{ color: CHARCOAL }}
          >
            {up.label}
          </span>
          <span className="text-[10px]" style={{ color: MUTED }}>
            {up.startDate ? format(parseISO(up.startDate), "MMM d") : ""} ·{" "}
            {up.weeks} week{up.weeks > 1 ? "s" : ""} · 0 hrs
          </span>
        </div>
      ))}
      {variableWeeks.map((vw) => {
        const effectiveHrs =
          vw.customHours !== undefined
            ? vw.customHours * daysPerWeek
            : baseHoursPerDay * daysPerWeek * (vw.multiplier ?? 1);
        const baseHrs = baseHoursPerDay * daysPerWeek;
        const isMore = effectiveHrs > baseHrs;
        return (
          <div
            key={vw.id}
            className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{
              background: isMore ? `${OLIVE}12` : "#FFF8DC",
              border: `1px solid ${isMore ? OLIVE : "#B8860B"}33`,
            }}
          >
            <span className="text-sm">{isMore ? "⚡" : "🐌"}</span>
            <span
              className="flex-1 text-xs font-medium"
              style={{ color: CHARCOAL }}
            >
              {vw.label}
            </span>
            <span
              className="text-[10px]"
              style={{ color: isMore ? OLIVE : "#B8860B" }}
            >
              {vw.startDate ? format(parseISO(vw.startDate), "MMM d") : ""} ·
              {vw.customHours !== undefined
                ? ` ${vw.customHours} hrs/day`
                : ` ${vw.multiplier}x`}{" "}
              ·{effectiveHrs} hrs/week
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Unavailable Periods Manager ───────── */
function UnavailablePeriodsManager({
  rm,
  persist,
}: {
  rm: Roadmap;
  persist: (next: Roadmap) => void;
}) {
  const [show, setShow] = useState(false);
  const [label, setLabel] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  function add() {
    if (!label || !startDate || !endDate) return;
    if (new Date(endDate) <= new Date(startDate)) return;
    persist({
      ...rm,
      unavailablePeriods: [
        ...rm.unavailablePeriods,
        { id: `${Date.now()}`, label, startDate, endDate },
      ],
    });
    setLabel("");
    setStartDate("");
    setEndDate("");
    setShow(false);
  }

  return (
    <div
      className="rounded-2xl p-5 space-y-3"
      style={{ background: CARD, border: `1px solid ${BORDER}` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" style={{ color: ROSE }} />
          <h3 className="font-semibold text-sm" style={{ color: CHARCOAL }}>
            Unavailable Periods
          </h3>
        </div>
        {!show && (
          <button
            onClick={() => setShow(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold"
            style={{ background: `${ROSE}33`, color: "#8B3A3A" }}
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        )}
      </div>
      <p className="text-xs" style={{ color: MUTED }}>
        Add periods when you cannot study. These appear in your schedule as
        paused weeks and push your end date forward.
      </p>

      {show && (
        <div
          className="rounded-xl p-4 space-y-3"
          style={{ background: CREAM, border: `1px solid ${BORDER}` }}
        >
          <div>
            <label
              className="text-xs font-semibold mb-1 block"
              style={{ color: MUTED }}
            >
              Reason
            </label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. College exams, Family trip…"
              className="w-full h-9 px-3 rounded-lg text-xs border-2 outline-none"
              style={{ background: CARD, borderColor: BORDER, color: CHARCOAL }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="text-xs font-semibold mb-1 block"
                style={{ color: MUTED }}
              >
                Start date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
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
                End date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="w-full h-9 px-3 rounded-lg text-xs border-2 outline-none"
                style={{
                  background: CARD,
                  borderColor: BORDER,
                  color: CHARCOAL,
                }}
              />
            </div>
          </div>
          {startDate && endDate && new Date(endDate) <= new Date(startDate) && (
            <p className="text-xs" style={{ color: "#C0392B" }}>
              End date must be after start date.
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={add}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold"
              style={{
                background: `linear-gradient(135deg, #A07840 0%, ${PROGRESS_PURPLE} 100%)`,
                color: "#fff",
              }}
            >
              <Save className="w-3 h-3" /> Add Unavailable Period
            </button>
            <button
              onClick={() => setShow(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold"
              style={{ background: BORDER, color: MUTED }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {rm.unavailablePeriods.length === 0 && !show && (
        <p className="text-xs" style={{ color: MUTED }}>
          No unavailable periods added.
        </p>
      )}

      <div className="space-y-2">
        {rm.unavailablePeriods.map((p) => {
          const days =
            p.startDate && p.endDate
              ? Math.max(
                  0,
                  Math.round(
                    (new Date(p.endDate).getTime() -
                      new Date(p.startDate).getTime()) /
                      (24 * 60 * 60 * 1000),
                  ),
                )
              : 0;
          return (
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
                  {p.startDate ? format(parseISO(p.startDate), "MMM d") : ""} →{" "}
                  {p.endDate ? format(parseISO(p.endDate), "MMM d") : ""} ·{" "}
                  {days} day{days !== 1 ? "s" : ""}
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
          );
        })}
      </div>
    </div>
  );
}

/* ─── Variable Intensity Weeks Manager ─── */
function VariableWeeksManager({
  rm,
  persist,
}: {
  rm: Roadmap;
  persist: (next: Roadmap) => void;
}) {
  const [show, setShow] = useState(false);
  const [label, setLabel] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [useMultiplier, setUseMultiplier] = useState(true);
  const [multiplier, setMultiplier] = useState(2);
  const [customHours, setCustomHours] = useState(4);

  function add() {
    if (!label || !startDate || !endDate) return;
    if (new Date(endDate) <= new Date(startDate)) return;
    const newVW: VariableWeek = {
      id: `${Date.now()}`,
      label,
      startDate,
      endDate,
      ...(useMultiplier ? { multiplier } : { customHours }),
    };
    persist({ ...rm, variableWeeks: [...(rm.variableWeeks ?? []), newVW] });
    setLabel("");
    setStartDate("");
    setEndDate("");
    setShow(false);
  }

  return (
    <div
      className="rounded-2xl p-5 space-y-3"
      style={{ background: CARD, border: `1px solid ${BORDER}` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4" style={{ color: PROGRESS_PURPLE }} />
          <h3 className="font-semibold text-sm" style={{ color: CHARCOAL }}>
            Variable Intensity Periods
          </h3>
        </div>
        {!show && (
          <button
            onClick={() => setShow(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold"
            style={{ background: `${PROGRESS_PURPLE}22`, color: DARK }}
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        )}
      </div>
      <p className="text-xs" style={{ color: MUTED }}>
        Add periods when you can study more or less than usual — e.g. a holiday
        with double hours, or exam week with half hours.
      </p>

      {show && (
        <div
          className="rounded-xl p-4 space-y-3"
          style={{ background: CREAM, border: `1px solid ${BORDER}` }}
        >
          <div>
            <label
              className="text-xs font-semibold mb-1 block"
              style={{ color: MUTED }}
            >
              Label
            </label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Summer holiday, Exam prep week…"
              className="w-full h-9 px-3 rounded-lg text-xs border-2 outline-none"
              style={{ background: CARD, borderColor: BORDER, color: CHARCOAL }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="text-xs font-semibold mb-1 block"
                style={{ color: MUTED }}
              >
                Start date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
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
                End date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="w-full h-9 px-3 rounded-lg text-xs border-2 outline-none"
                style={{
                  background: CARD,
                  borderColor: BORDER,
                  color: CHARCOAL,
                }}
              />
            </div>
          </div>
          {startDate && endDate && new Date(endDate) <= new Date(startDate) && (
            <p className="text-xs" style={{ color: "#C0392B" }}>
              End date must be after start date.
            </p>
          )}

          {/* Toggle multiplier vs custom hours */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setUseMultiplier(true)}
              className="flex-1 py-1.5 rounded-xl text-xs font-semibold"
              style={
                useMultiplier
                  ? { background: DARK, color: CREAM }
                  : { background: `${BORDER}88`, color: MUTED }
              }
            >
              Multiplier (e.g. 2×)
            </button>
            <button
              type="button"
              onClick={() => setUseMultiplier(false)}
              className="flex-1 py-1.5 rounded-xl text-xs font-semibold"
              style={
                !useMultiplier
                  ? { background: DARK, color: CREAM }
                  : { background: `${BORDER}88`, color: MUTED }
              }
            >
              Custom hrs/day
            </button>
          </div>

          {useMultiplier ? (
            <div>
              <label
                className="text-xs font-semibold mb-2 block"
                style={{ color: MUTED }}
              >
                Multiplier:{" "}
                <span style={{ color: PROGRESS_PURPLE }}>{multiplier}× normal hours</span>
                <span className="ml-2 text-[10px]" style={{ color: MUTED }}>
                  (0.5× = half, 1× = same, 2× = double)
                </span>
              </label>
              <input
                type="range"
                min={0.1}
                max={4}
                step={0.1}
                value={multiplier}
                onChange={(e) => setMultiplier(parseFloat(e.target.value))}
                className="w-full accent-amber-600"
              />
              <div
                className="flex justify-between text-[10px] mt-1"
                style={{ color: MUTED }}
              >
                <span>0.1× (very little)</span>
                <span>4× (intensive)</span>
              </div>
            </div>
          ) : (
            <div>
              <label
                className="text-xs font-semibold mb-2 block"
                style={{ color: MUTED }}
              >
                Custom hours per day:{" "}
                <span style={{ color: PROGRESS_PURPLE }}>{customHours} hrs/day</span>
              </label>
              <input
                type="range"
                min={0.5}
                max={16}
                step={0.5}
                value={customHours}
                onChange={(e) => setCustomHours(parseFloat(e.target.value))}
                className="w-full accent-amber-600"
              />
              <div
                className="flex justify-between text-[10px] mt-1"
                style={{ color: MUTED }}
              >
                <span>0.5 hrs</span>
                <span>16 hrs</span>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={add}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold"
              style={{
                background: `linear-gradient(135deg, #A07840 0%, ${PROGRESS_PURPLE} 100%)`,
                color: "#fff",
              }}
            >
              <Save className="w-3 h-3" /> Add Variable Intensity Period
            </button>
            <button
              onClick={() => setShow(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold"
              style={{ background: BORDER, color: MUTED }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {(rm.variableWeeks ?? []).length === 0 && !show && (
        <p className="text-xs" style={{ color: MUTED }}>
          No variable intensity periods added.
        </p>
      )}

      <div className="space-y-2">
        {(rm.variableWeeks ?? []).map((vw) => {
          const days =
            vw.startDate && vw.endDate
              ? Math.max(
                  0,
                  Math.round(
                    (new Date(vw.endDate).getTime() -
                      new Date(vw.startDate).getTime()) /
                      (24 * 60 * 60 * 1000),
                  ),
                )
              : 0;
          const isMore =
            (vw.multiplier !== undefined && vw.multiplier > 1) ||
            vw.customHours !== undefined;
          return (
            <div
              key={vw.id}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl"
              style={{ background: `${PROGRESS_PURPLE}10`, border: `1px solid ${PROGRESS_PURPLE}33` }}
            >
              <div>
                <span
                  className="text-sm font-medium"
                  style={{ color: CHARCOAL }}
                >
                  {isMore ? "⚡" : "🐌"} {vw.label}
                </span>
                <span className="text-xs ml-2" style={{ color: MUTED }}>
                  {vw.startDate ? format(parseISO(vw.startDate), "MMM d") : ""}{" "}
                  → {vw.endDate ? format(parseISO(vw.endDate), "MMM d") : ""} ·{" "}
                  {days} day{days !== 1 ? "s" : ""} ·
                  {vw.customHours !== undefined
                    ? ` ${vw.customHours} hrs/day`
                    : ` ${vw.multiplier}×`}
                </span>
              </div>
              <button
                onClick={() =>
                  persist({
                    ...rm,
                    variableWeeks: (rm.variableWeeks ?? []).filter(
                      (x) => x.id !== vw.id,
                    ),
                  })
                }
                className="p-1 rounded-lg"
                style={{ color: "#C0392B" }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Live Schedule Tab ─────────────────── */

/* ─── Calendar Tab Wrapper — bridges Roadmap data into RoadmapCalendar ─── */
function CalendarTabWrapper({
  examType,
  startDate,
  syllabusProgress,
  effectiveUserId,
  unavailablePeriods,
  variableWeeks,
}: {
  examType: string;
  startDate: string;
  syllabusProgress: SyllabusProgress;
  effectiveUserId: string;
  unavailablePeriods: UnavailablePeriod[];
  variableWeeks: VariableWeek[];
}) {
  const uid = effectiveUserId || (() => { try { return JSON.parse(localStorage.getItem("heartspace_user")||"{}").id||""; } catch { return ""; } })();
  const inputs = loadScheduleInputs(uid);
  const rawSubjectsBase = examType === "JAM" ? JAM_SUBJECTS : NET_SUBJECTS;
  const defaultOrder = rawSubjectsBase.map((s) => s.id);
  const [customOrder, setCustomOrder] = useState<string[]>(() => loadSubjectOrder(effectiveUserId, defaultOrder));
  useEffect(() => {
    supabase.from("subject_order").select("data").eq("user_id", effectiveUserId).single()
      .then(({ data: sd }) => {
        if (sd?.data && Array.isArray(sd.data)) {
          try { localStorage.setItem(`hs_subject_order_${effectiveUserId}`, JSON.stringify(sd.data)); } catch {}
          setCustomOrder(sd.data as string[]);
        }
      });
  }, [effectiveUserId]);
  const rawSubjects = [
    ...customOrder
      .map((id) => rawSubjectsBase.find((s) => s.id === id))
      .filter((s): s is typeof rawSubjectsBase[number] => Boolean(s)),
    ...rawSubjectsBase.filter((s) => customOrder.indexOf(s.id) === -1),
  ];
  const syllabusPercs = getSyllabusPercents(syllabusProgress, examType);

  const calTopicSpeed = loadTopicSpeed(uid);
  const subjects = rawSubjects.map((s) => {
    const speedKey = (calTopicSpeed[s.id] ?? "standard") as TopicSpeedKey;
    const speedMult = SPEED_MULTIPLIERS[speedKey] ?? 1.0;
    const baseHours = (s as any).totalHours ?? 0;
    return {
      id: s.id,
      syllabusId: s.syllabusId,
      name: s.name,
      totalHours: Math.round(baseHours * speedMult),
    };
  });

  /* Calendar is the single source of truth for hours consumed per subject */
  const savedCalendar = loadCalendar(effectiveUserId);
  const consumedHoursBySubject: Record<string, number> = {};
  Object.values(savedCalendar).forEach((entries) => {
    entries.forEach((e) => {
      consumedHoursBySubject[e.subjectId] = (consumedHoursBySubject[e.subjectId] ?? 0) + e.hours;
    });
  });

  const remainingHoursBySubject: Record<string, number> = {};
  rawSubjects.forEach((s) => {
    const syllabusDone = syllabusPercs[(s as any).syllabusId] === 100;
    if (syllabusDone) {
      remainingHoursBySubject[s.id] = 0;
      return;
    }
    const total = (s as any).totalHours ?? 0;
    const consumed = consumedHoursBySubject[s.id] ?? 0;
    remainingHoursBySubject[s.id] = Math.max(0, total - consumed);
  });
  useEffect(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const doneSubjectIds = new Set(
      rawSubjects.filter((s) => syllabusPercs[(s as any).syllabusId] === 100).map((s) => s.id)
    );
    if (doneSubjectIds.size === 0) return;
    const cal = loadCalendar(effectiveUserId);
    let changed = false;
    const cleaned: typeof cal = {};
    Object.entries(cal).forEach(([dateKey, entries]) => {
      const isFuture = dateKey >= todayStr;
      const filtered = isFuture
        ? entries.filter((e) => doneSubjectIds.has(e.subjectId) === false)
        : entries;
      if (filtered.length !== entries.length) changed = true;
      if (filtered.length > 0) cleaned[dateKey] = filtered;
    });
    if (!changed) return;
    const inputs = loadScheduleInputs(effectiveUserId);
    const paceHours = inputs.hoursPerDay ?? 2;
    const paceDays = inputs.selectedDays ?? [1, 2, 3, 4, 5];
    const consumedBySubject: Record<string, number> = {};
    Object.entries(cleaned).forEach(([dateKey, entries]) => {
      if (dateKey >= todayStr) return;
      entries.forEach((e) => { consumedBySubject[e.subjectId] = (consumedBySubject[e.subjectId] ?? 0) + e.hours; });
    });
    const freshRemaining: Record<string, number> = {};
    rawSubjects.forEach((s) => {
      freshRemaining[s.id] = doneSubjectIds.has(s.id) ? 0 : Math.max(0, ((s as any).totalHours ?? 0) - (consumedBySubject[s.id] ?? 0));
    });
    const regenerated = autoGenerateCalendar(rawSubjects as any, freshRemaining, todayStr, paceHours, paceDays, [], [], [], cleaned);
    saveCalendarLocal(effectiveUserId, regenerated);
  }, [effectiveUserId, JSON.stringify(syllabusPercs)]);

  const savedSimSlots = loadStudyPeriods(effectiveUserId);
  const simSlotsForCalendar = savedSimSlots
    .filter((p) => p.mode === "parallel" && p.subjectIds && p.subjectIds.length > 0)
    .map((p) => ({
      startDate: p.startDate,
      endDate: p.endDate,
      subjectIds: p.subjectIds!,
      hoursPerSubject: p.hoursPerSubject,
    }));

  const unavailableForCalendar = unavailablePeriods.map((p) => ({
    startDate: p.startDate,
    endDate: p.endDate,
  }));

  const variableForCalendar = variableWeeks.map((p) => ({
    startDate: p.startDate,
    endDate: p.endDate,
    customHoursPerDay: p.customHours,
    multiplier: p.multiplier,
  }));

  return (
    <div className="space-y-5">
      <StudySchedulePlanner uid={effectiveUserId} examType={examType} />
      <RoadmapCalendar
        uid={effectiveUserId}
        subjects={subjects}
        remainingHoursBySubject={remainingHoursBySubject}
        startDate={startDate}
        hoursPerDay={inputs.hoursPerDay}
        daysPerWeek={inputs.daysPerWeek}
        selectedDays={inputs.selectedDays ?? DEFAULT_SCHEDULE_SELECTED_DAYS}
        simSlots={simSlotsForCalendar}
        unavailablePeriods={unavailableForCalendar}
        variablePeriods={variableForCalendar}
      />
    </div>
  );
}


/* ─── Study Schedule Planner (self-contained, shared between Schedule & Calendar tabs) ─── */
function StudySchedulePlanner({ uid, examType }: { uid: string; examType: string }) {
  const inputs = loadScheduleInputs(uid);
  const [hoursPerDay, setHoursPerDay] = useState(inputs.hoursPerDay);
  const [daysPerWeek, setDaysPerWeek] = useState(inputs.daysPerWeek);
  const [targetMonths, setTargetMonths] = useState(inputs.targetMonths);
  const [pendingPlannerDays, setPendingPlannerDays] = useState<number[]>(inputs.selectedDays ?? DEFAULT_SCHEDULE_SELECTED_DAYS);
  const [plannerDayPickError, setPlannerDayPickError] = useState<string>("");

  useEffect(() => {
    supabase.from("schedule_inputs").select("data").eq("user_id", uid).single()
      .then(({ data: sd }) => {
        if (sd?.data) {
          const d = sd.data as any;
          try { localStorage.setItem(`hs_schedule_inputs_${uid}`, JSON.stringify(d)); } catch {}
          if (d.hoursPerDay !== undefined) setHoursPerDay(d.hoursPerDay);
          if (d.daysPerWeek !== undefined) setDaysPerWeek(d.daysPerWeek);
          if (d.targetMonths !== undefined) setTargetMonths(d.targetMonths);
          if (d.selectedDays !== undefined) setPendingPlannerDays(d.selectedDays);
        }
      });
  }, [uid]);

  const syllabusProgress: SyllabusProgress = (() => { try { return JSON.parse(localStorage.getItem(`hs_topic_syllabus_${uid}`) ?? "{}"); } catch { return {}; } })();
  const syllabusPercs = getSyllabusPercents(syllabusProgress, examType);
  const skipped = Object.values(syllabusPercs).filter((p) => p === 100).length;
  const hoursPerWeek = hoursPerDay * daysPerWeek;

  function persistPlanner(patch: Partial<{ hoursPerDay: number; daysPerWeek: number; targetMonths: number; selectedDays: number[] }>) {
    const next = { ...inputs, hoursPerDay, daysPerWeek, targetMonths, ...patch };
    try {
      localStorage.setItem(`hs_schedule_inputs_${uid}`, JSON.stringify(next));
    } catch {}
    supabase.from("schedule_inputs").upsert({ user_id: uid, data: next }, { onConflict: "user_id" }).then(() => {});
    if (patch.hoursPerDay !== undefined) setHoursPerDay(patch.hoursPerDay);
    if (patch.daysPerWeek !== undefined) setDaysPerWeek(patch.daysPerWeek);
    if (patch.targetMonths !== undefined) setTargetMonths(patch.targetMonths);
  }

  function confirmPlannerDays() {
    if (pendingPlannerDays.length !== daysPerWeek) {
      setPlannerDayPickError(`Please make sure your selected days match the number of days you've selected (${daysPerWeek}).`);
      return;
    }
    setPlannerDayPickError("");
    persistPlanner({ selectedDays: pendingPlannerDays });
  }

  return (
    <div className="rounded-2xl p-5 space-y-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
      <div className="flex items-center gap-2 flex-wrap">
        <Calendar className="w-5 h-5" style={{ color: PROGRESS_PURPLE }} />
        <h3 className="font-serif text-lg font-semibold" style={{ color: CHARCOAL }}>
          Study Schedule Planner
        </h3>
        <span
          className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-semibold"
          style={{ background: `${OLIVE}22`, color: OLIVE }}
        >
          ⚡ Auto-updates with syllabus
        </span>
      </div>
      <p className="text-xs" style={{ color: MUTED }}>
        Set your availability once. Schedule auto-recalculates whenever your syllabus progress changes or you adjust these inputs.
      </p>

      {skipped > 0 && (
        <div className="rounded-xl px-4 py-3" style={{ background: `${OLIVE}12`, border: `1px solid ${OLIVE}33` }}>
          <p className="text-xs font-semibold" style={{ color: OLIVE }}>
            ✅ {skipped} subject(s) 100% complete in syllabus — automatically skipped from schedule.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="text-xs font-semibold mb-2 block" style={{ color: CHARCOAL }}>
            Study hours per day: <span style={{ color: PROGRESS_PURPLE }}>{hoursPerDay} hrs</span>
          </label>
          <input
            type="range" min={0.5} max={12} step={0.5} value={hoursPerDay}
            onChange={(e) => persistPlanner({ hoursPerDay: parseFloat(e.target.value) })}
            className="w-full accent-amber-600"
          />
          <div className="flex justify-between text-[10px] mt-1" style={{ color: MUTED }}>
            <span>0.5 hrs</span><span>12 hrs</span>
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold mb-2 block" style={{ color: CHARCOAL }}>
            Study days per week: <span style={{ color: PROGRESS_PURPLE }}>{daysPerWeek} days</span>
          </label>
          <input
            type="range" min={1} max={7} step={1} value={daysPerWeek}
            onChange={(e) => persistPlanner({ daysPerWeek: parseInt(e.target.value) })}
            className="w-full accent-amber-600"
          />
          <div className="flex justify-between text-[10px] mt-1" style={{ color: MUTED }}>
            <span>1 day</span><span>7 days</span>
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-semibold mb-2 block" style={{ color: CHARCOAL }}>
            Target completion: <span style={{ color: PROGRESS_PURPLE }}>{targetMonths} months</span>
          </label>
          <input
            type="range" min={1} max={36} step={1} value={targetMonths}
            onChange={(e) => persistPlanner({ targetMonths: parseInt(e.target.value) })}
            className="w-full accent-amber-600"
          />
          <div className="flex justify-between text-[10px] mt-1" style={{ color: MUTED }}>
            <span>1 month</span><span>36 months</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl p-3" style={{ background: CREAM, border: `1px solid ${BORDER}` }}>
        <label className="text-xs font-semibold mb-2 block" style={{ color: CHARCOAL }}>
          Which {daysPerWeek} day{daysPerWeek !== 1 ? "s" : ""} of the week?
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label, dow) => {
            const checked = pendingPlannerDays.includes(dow);
            return (
              <button
                key={dow} type="button"
                onClick={() => {
                  setPendingPlannerDays((prev) => (prev.includes(dow) ? prev.filter((d) => d !== dow) : [...prev, dow].sort()));
                  setPlannerDayPickError("");
                }}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                style={{
                  background: checked ? PROGRESS_PURPLE : CREAM,
                  color: checked ? "#fff" : CHARCOAL,
                  border: `1.5px solid ${checked ? PROGRESS_PURPLE : BORDER}`,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
        {plannerDayPickError && <p className="text-xs mb-2" style={{ color: "#C0392B" }}>{plannerDayPickError}</p>}
        <button
          type="button" onClick={confirmPlannerDays}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg"
          style={{ background: PROGRESS_PURPLE, color: "#fff", border: "none" }}
        >
          Confirm days
        </button>
      </div>

      <div className="rounded-xl p-4" style={{ background: CREAM, border: `1px solid ${BORDER}` }}>
        <p className="text-xs font-semibold mb-2" style={{ color: CHARCOAL }}>Your availability:</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Per Week", value: `${hoursPerWeek} hrs` },
            { label: "Per Month", value: `${hoursPerWeek * 4} hrs` },
            { label: "In Target", value: `${hoursPerWeek * targetMonths * 4} hrs total` },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <div className="text-sm font-bold font-serif" style={{ color: DARK }}>{value}</div>
              <div className="text-[10px]" style={{ color: MUTED }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LiveScheduleTab({
  examType,
  startDate,
  syllabusProgress,
  effectiveUserId,
  onSave,
  unavailablePeriods,
  variableWeeks,
  rm,
  persist,
}: {
  examType: string;
  startDate: string;
  syllabusProgress: SyllabusProgress;
  effectiveUserId: string;
  onSave: (schedule: SmartSchedule) => void;
  unavailablePeriods: UnavailablePeriod[];
  variableWeeks: VariableWeek[];
  rm: Roadmap;
  persist: (next: Roadmap) => void;
}) {
  const saved = loadScheduleInputs(effectiveUserId);
  const [hoursPerDay, setHoursPerDay] = useState(saved.hoursPerDay);
  const [daysPerWeek, setDaysPerWeek] = useState(saved.daysPerWeek);
  const [selectedDays, setSelectedDays] = useState<number[]>(saved.selectedDays ?? DEFAULT_SCHEDULE_SELECTED_DAYS);
  const [pendingSchedDays, setPendingSchedDays] = useState<number[]>(saved.selectedDays ?? DEFAULT_SCHEDULE_SELECTED_DAYS);
  const [schedDayPickError, setSchedDayPickError] = useState<string>("");
  const [targetMonths, setTargetMonths] = useState(saved.targetMonths);
  const [revisionPercent, setRevisionPercent] = useState(saved.revisionPercent);
  const [filter, setFilter] = useState<WeekType | "all">("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showSpeedPanel, setShowSpeedPanel] = useState(false);
  const [showOrderPanel, setShowOrderPanel] = useState(false);
  const [showSimPanel, setShowSimPanel] = useState(false);
  const [simSlots, setSimSlots] = useState<StudyPeriod[]>([]);
  useEffect(() => {
    const uid = effectiveUserId || (() => { try { return JSON.parse(localStorage.getItem("heartspace_user")||"{}").id||""; } catch{return "";} })();
    if (uid) setSimSlots(loadStudyPeriods(uid));
  }, [effectiveUserId]);
  const [simForm, setSimForm] = useState({ label: "", startDate: "", endDate: "", subjectIds: [] as string[], hoursPerSubject: {} as Record<string, number> });
  /* Live loads — always fresh */
  const [topicSpeed, setTopicSpeed] = useState<TopicSpeedMap>(() => loadTopicSpeed(effectiveUserId));
  const [baseWeeksOverride, setBaseWeeksOverride] = useState<BaseWeeksMap>(() => loadBaseWeeks(effectiveUserId));
  useEffect(() => {
    supabase.from("base_weeks").select("data").eq("user_id", effectiveUserId).single()
      .then(({ data: sd }) => { if (sd?.data) setBaseWeeksOverride(sd.data as BaseWeeksMap); });
  }, [effectiveUserId]);
  const practiceProgress = loadPracticeProgress(effectiveUserId);
  const rawSubjectsList = examType === "JAM" ? JAM_SUBJECTS : NET_SUBJECTS;
  const defaultOrder = rawSubjectsList.map((s) => s.id);
  const liveCalendarData = loadCalendar(effectiveUserId);
  const consumedHoursBySubject: Record<string, number> = {};
  Object.values(liveCalendarData).forEach((entries) => {
    entries.forEach((e) => {
      consumedHoursBySubject[e.subjectId] = (consumedHoursBySubject[e.subjectId] ?? 0) + e.hours;
    });
  });
  const [calSyncTick, setCalSyncTick] = useState(0);
  useEffect(() => {
    supabase.from("roadmap_calendar").select("data").eq("user_id", effectiveUserId).single()
      .then(({ data: sd }) => {
        if (sd?.data) {
          try { localStorage.setItem(`hs_calendar_${effectiveUserId}`, JSON.stringify(sd.data)); } catch {}
          setCalSyncTick((t) => t + 1);
        }
      });
  }, [effectiveUserId]);
  const [subjectOrder, setSubjectOrderState] = useState<string[]>(() =>
    loadSubjectOrder(effectiveUserId, defaultOrder),
  );
  useEffect(() => {
    supabase.from("subject_order").select("data").eq("user_id", effectiveUserId).single()
      .then(({ data: sd }) => { if (sd?.data) setSubjectOrderState(sd.data as string[]); });
  }, [effectiveUserId]);
  useEffect(() => {
    supabase.from("topic_speed").select("data").eq("user_id", effectiveUserId).single()
      .then(({ data: sd }) => { if (sd?.data) setTopicSpeed(sd.data as TopicSpeedMap); });
  }, [effectiveUserId]);
  useEffect(() => {
    supabase.from("study_periods").select("data").eq("user_id", effectiveUserId).single()
      .then(({ data: sd }) => { if (sd?.data) setSimSlots(sd.data as StudyPeriod[]); });
  }, [effectiveUserId]);
  const [parallelCfg, setParallelCfgState] = useState<ParallelConfig>(() =>
    loadParallelConfig(effectiveUserId),
  );

  const hoursPerWeek = hoursPerDay * daysPerWeek;
  const syllabusPercs = getSyllabusPercents(syllabusProgress, examType);
  const skipped = Object.values(syllabusPercs).filter((p) => p === 100).length;
  const allSubjects = rawSubjectsList;

  function updateSubjectOrder(newOrder: string[]) {
    setSubjectOrderState(newOrder);
    saveSubjectOrder(effectiveUserId, newOrder);
    onSave(
      generateSmartSchedule(
        examType,
        hoursPerDay,
        daysPerWeek,
        targetMonths,
        revisionPercent,
        startDate,
        syllabusProgress,
        rm.unavailablePeriods,
        rm.variableWeeks ?? [],
        topicSpeed,
        baseWeeksOverride,
        practiceProgress,
        newOrder,
        parallelCfg,
        simSlots,
        consumedHoursBySubject,
      ),
    );
  }

  function updateParallelCfg(cfg: ParallelConfig) {
    setParallelCfgState(cfg);
    saveParallelConfig(effectiveUserId, cfg);
    onSave(
      generateSmartSchedule(
        examType,
        hoursPerDay,
        daysPerWeek,
        targetMonths,
        revisionPercent,
        startDate,
        syllabusProgress,
        rm.unavailablePeriods,
        rm.variableWeeks ?? [],
        topicSpeed,
        baseWeeksOverride,
        practiceProgress,
        subjectOrder,
        cfg,
        simSlots,
        consumedHoursBySubject,
      ),
    );
  }

  function updateStudyPeriods(periods: StudyPeriod[]) {
    setSimSlots(periods);
    import("../lib/supabase").then(({ supabase }) => {
      supabase.auth.getUser().then(({ data }) => {
        const uid = data?.user?.id || effectiveUserId || (() => { try { return JSON.parse(localStorage.getItem("heartspace_user")||"{}").id||""; } catch{return "";} })();
        saveStudyPeriods(uid, periods);
      });
    });
    onSave(
      generateSmartSchedule(
        examType,
        hoursPerDay,
        daysPerWeek,
        targetMonths,
        revisionPercent,
        startDate,
        syllabusProgress,
        rm.unavailablePeriods,
        rm.variableWeeks ?? [],
        topicSpeed,
        baseWeeksOverride,
        practiceProgress,
        subjectOrder,
        parallelCfg,
        periods,
        consumedHoursBySubject,
      ),
    );
  }

  /* Live schedule — always recalculated with ALL factors */
  const schedule = generateSmartSchedule(
    examType,
    hoursPerDay,
    daysPerWeek,
    targetMonths,
    revisionPercent,
    startDate,
    syllabusProgress,
    rm.unavailablePeriods,
    rm.variableWeeks ?? [],
    topicSpeed,
    baseWeeksOverride,
    practiceProgress,
    subjectOrder,
    parallelCfg,
    simSlots,
    consumedHoursBySubject,
  );

  /* Save inputs + notify parent whenever anything changes */
  function update(
    patch: Partial<{
      hoursPerDay: number;
      daysPerWeek: number;
      targetMonths: number;
      revisionPercent: number;
      selectedDays: number[];
    }>,
  ) {
    const next = {
      hoursPerDay,
      daysPerWeek,
      targetMonths,
      revisionPercent,
      selectedDays,
      ...patch,
    };
    if (patch.hoursPerDay !== undefined) setHoursPerDay(patch.hoursPerDay);
    if (patch.daysPerWeek !== undefined) setDaysPerWeek(patch.daysPerWeek);
    if (patch.targetMonths !== undefined) setTargetMonths(patch.targetMonths);
    if (patch.revisionPercent !== undefined)
      setRevisionPercent(patch.revisionPercent);
    if (patch.selectedDays !== undefined) setSelectedDays(patch.selectedDays);
    saveScheduleInputs(effectiveUserId, next);
    onSave(
      generateSmartSchedule(
        examType,
        next.hoursPerDay,
        next.daysPerWeek,
        next.targetMonths,
        next.revisionPercent,
        startDate,
        syllabusProgress,
        rm.unavailablePeriods,
        rm.variableWeeks ?? [],
        topicSpeed,
        baseWeeksOverride,
        practiceProgress,
        subjectOrder,
        parallelCfg,
        simSlots,
        consumedHoursBySubject,
      ),
    );
  }

  function updateSpeed(subjectId: string, key: TopicSpeedKey) {
    const next = { ...topicSpeed, [subjectId]: key };
    saveTopicSpeed(effectiveUserId, next);
    setTopicSpeed(next);
    onSave(
      generateSmartSchedule(
        examType,
        hoursPerDay,
        daysPerWeek,
        targetMonths,
        revisionPercent,
        startDate,
        syllabusProgress,
        rm.unavailablePeriods,
        rm.variableWeeks ?? [],
        next,
        baseWeeksOverride,
        practiceProgress,
        subjectOrder,
        parallelCfg,
        simSlots,
        consumedHoursBySubject,
      ),
    );
  }

  function updateBaseWeeks(subjectId: string, weeks: number) {
    const next = { ...baseWeeksOverride, [subjectId]: Math.max(0.5, weeks) };
    saveBaseWeeks(effectiveUserId, next);
    setBaseWeeksOverride(next);
    onSave(
      generateSmartSchedule(
        examType,
        hoursPerDay,
        daysPerWeek,
        targetMonths,
        revisionPercent,
        startDate,
        syllabusProgress,
        rm.unavailablePeriods,
        rm.variableWeeks ?? [],
        topicSpeed,
        next,
        practiceProgress,
        subjectOrder,
        parallelCfg,
        simSlots,
        consumedHoursBySubject,
      ),
    );
  }

  const filtered =
    filter === "all"
      ? schedule.weeks
      : schedule.weeks.filter((w) => w.type === filter);
  const subjects = [...new Set(schedule.weeks.map((w) => w.subject))];

  return (
    <div className="space-y-6">
      {/* Unavailable + Variable periods — live in schedule tab */}
      <UnavailablePeriodsManager rm={rm} persist={persist} />
      <VariableWeeksManager rm={rm} persist={persist} />

      {/* Topic Learning Speed */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: CARD, border: `1px solid ${BORDER}` }}
      >
        <button
          onClick={() => setShowSpeedPanel(!showSpeedPanel)}
          className="w-full flex items-center gap-3 px-5 py-4 text-left"
          style={{ background: showSpeedPanel ? `${PROGRESS_PURPLE}08` : CARD }}
        >
          <Brain className="w-4 h-4" style={{ color: PROGRESS_PURPLE }} />
          <div className="flex-1">
            <p className="font-semibold text-sm" style={{ color: CHARCOAL }}>
              Topic Learning Speed
            </p>
            <p className="text-xs mt-0.5" style={{ color: MUTED }}>
              Set your pace per subject — adjusts study weeks automatically
            </p>
          </div>
          {showSpeedPanel ? (
            <ChevronDown className="w-4 h-4" style={{ color: MUTED }} />
          ) : (
            <ChevronRight className="w-4 h-4" style={{ color: MUTED }} />
          )}
        </button>
        {showSpeedPanel && (
          <div
            className="px-5 pb-5 space-y-4"
            style={{ borderTop: `1px solid ${BORDER}` }}
          >
            <div className="grid grid-cols-2 gap-3 pt-4">
              {[
                {
                  key: "first",
                  label: "First Time Learner",
                  options: [
                    { k: "gentle"      as TopicSpeedKey, e: "🐢", l: "Gentle +40%" },
                    { k: "steady"      as TopicSpeedKey, e: "🌿", l: "Steady +30%" },
                    { k: "standard"    as TopicSpeedKey, e: "⚖️",  l: "Standard" },
                    { k: "accelerated" as TopicSpeedKey, e: "⚡", l: "Accelerated -30%" },
                    { k: "rapid"       as TopicSpeedKey, e: "🚀", l: "Rapid -40%" },
                  ],
                },
              ].map((group) => (
                <div
                  key={group.key}
                  className="rounded-xl p-3"
                  style={{ background: CREAM, border: `1px solid ${BORDER}` }}
                >
                  <p
                    className="text-[10px] font-bold uppercase tracking-wide mb-2"
                    style={{ color: MUTED }}
                  >
                    {group.label}
                  </p>
                  <div className="flex gap-1">
                    {group.options.map((opt) => (
                      <span
                        key={opt.k}
                        className="text-[10px] px-2 py-1 rounded-lg font-semibold"
                        style={{ background: `${PROGRESS_PURPLE}22`, color: DARK }}
                      >
                        {opt.e} {opt.l}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {allSubjects.map((s) => {
                const current = (topicSpeed[s.id] ??
                  "standard") as TopicSpeedKey;
                const cfg = SPEED_CFG[current];
                const computedWeeksFromHours2 = (s as any).totalHours
                  ? (s as any).totalHours / (hoursPerDay * daysPerWeek)
                  : s.studyWeeks;
                const baseW = baseWeeksOverride[s.id] ?? computedWeeksFromHours2;
                const mult = SPEED_MULTIPLIERS[current];
                const effectW = Math.ceil(baseW * mult);
                return (
                  <div
                    key={s.id}
                    className="rounded-xl p-3"
                    style={{ background: CREAM, border: `1px solid ${BORDER}` }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="text-sm font-semibold flex-1"
                        style={{ color: CHARCOAL }}
                      >
                        {s.name}
                      </span>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                        style={{
                          background: `${cfg.color}22`,
                          color: cfg.color,
                        }}
                      >
                        {cfg.emoji} {cfg.label} → {effectW} wks · {Math.round((s as any).totalHours * SPEED_MULTIPLIERS[current])} hrs
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(
                        [
                          "gentle",
                          "steady",
                          "standard",
                          "accelerated",
                          "rapid",
                        ] as TopicSpeedKey[]
                      ).map((key) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => updateSpeed(s.id, key)}
                          className="text-[10px] px-2 py-1 rounded-lg font-semibold transition-all"
                          style={
                            current === key
                              ? {
                                  background: SPEED_CFG[key].color,
                                  color: "#fff",
                                }
                              : { background: `${BORDER}88`, color: MUTED }
                          }
                        >
                          {SPEED_CFG[key].emoji} {SPEED_CFG[key].label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Subject Study Order */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: CARD, border: `1px solid ${BORDER}` }}
      >
        <button
          onClick={() => setShowOrderPanel(!showOrderPanel)}
          className="w-full flex items-center gap-3 px-5 py-4 text-left"
          style={{ background: showOrderPanel ? `${PROGRESS_PURPLE}08` : CARD }}
        >
          <Target className="w-4 h-4" style={{ color: PROGRESS_PURPLE }} />
          <div className="flex-1">
            <p className="font-semibold text-sm" style={{ color: CHARCOAL }}>
              Subject Study Order
            </p>
            <p className="text-xs mt-0.5" style={{ color: MUTED }}>
              Customise the order in which subjects appear in your schedule
            </p>
          </div>
          {showOrderPanel ? (
            <ChevronDown className="w-4 h-4" style={{ color: MUTED }} />
          ) : (
            <ChevronRight className="w-4 h-4" style={{ color: MUTED }} />
          )}
        </button>
        {showOrderPanel && (
          <div
            className="px-5 pb-5 pt-3 space-y-2"
            style={{ borderTop: `1px solid ${BORDER}` }}
          >
            <p className="text-xs" style={{ color: MUTED }}>
              Drag or use arrows to reorder. Schedule updates immediately.
            </p>
            {subjectOrder.map((id, idx) => {
              const subject = rawSubjectsList.find((s) => s.id === id);
              if (!subject) return null;
              return (
                <div
                  key={id}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ background: CREAM, border: `1px solid ${BORDER}` }}
                >
                  <span
                    className="text-xs font-bold w-5 text-center"
                    style={{ color: MUTED }}
                  >
                    {idx + 1}
                  </span>
                  <span
                    className="flex-1 text-sm font-semibold"
                    style={{ color: CHARCOAL }}
                  >
                    {subject.name}
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => {
                        const next = [...subjectOrder];
                        [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                        updateSubjectOrder(next);
                      }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold disabled:opacity-30"
                      style={{ background: `${BORDER}`, color: CHARCOAL }}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={idx === subjectOrder.length - 1}
                      onClick={() => {
                        const next = [...subjectOrder];
                        [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                        updateSubjectOrder(next);
                      }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold disabled:opacity-30"
                      style={{ background: `${BORDER}`, color: CHARCOAL }}
                    >
                      ↓
                    </button>
                  </div>
                </div>
              );
            })}
            <button
              type="button"
              onClick={() => updateSubjectOrder(defaultOrder)}
              className="text-xs px-3 py-1.5 rounded-lg"
              style={{ background: `${BORDER}`, color: MUTED }}
            >
              Reset to default order
            </button>
          </div>
        )}
      </div>

      {/* Simultaneous Studies */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: CARD, border: `1px solid ${BORDER}` }}
      >
        <button
          onClick={() => setShowSimPanel(!showSimPanel)}
          className="w-full flex items-center gap-3 px-5 py-4 text-left"
          style={{ background: showSimPanel ? `${PROGRESS_PURPLE}08` : CARD }}
        >
          <BookOpen className="w-4 h-4" style={{ color: PROGRESS_PURPLE }} />
          <div className="flex-1">
            <p className="font-semibold text-sm" style={{ color: CHARCOAL }}>
              Simultaneous Studies
            </p>
            <p className="text-xs mt-0.5" style={{ color: MUTED }}>
              {simSlots.length === 0
                ? "Sequential by default — add a period below to study topics simultaneously"
                : `${simSlots.length} study period${simSlots.length > 1 ? "s" : ""} configured`}
            </p>
          </div>
          {showSimPanel ? (
            <ChevronDown className="w-4 h-4" style={{ color: MUTED }} />
          ) : (
            <ChevronRight className="w-4 h-4" style={{ color: MUTED }} />
          )}
        </button>
        {showSimPanel && (
          <div
            className="px-5 pb-5 pt-3 space-y-4"
            style={{ borderTop: `1px solid ${BORDER}` }}
          >
            <p className="text-xs" style={{ color: MUTED }}>
              Add date-range periods with a specific study mode. Outside all
              periods, schedule runs sequentially by default.
            </p>
            <div
              className="rounded-xl p-4 space-y-3"
              style={{ background: CREAM, border: `1px solid ${BORDER}` }}
            >
              <p className="text-xs font-semibold" style={{ color: CHARCOAL }}>
                Add Simultaneous Study Slot
              </p>
              <div>
                <label
                  className="text-xs font-semibold mb-1 block"
                  style={{ color: MUTED }}
                >
                  Label
                </label>
                <input
                  value={simForm.label}
                  onChange={(e) =>
                    setSimForm((p) => ({ ...p, label: e.target.value }))
                  }
                  placeholder="e.g. Exam sprint, Daily revision…"
                  className="w-full h-9 px-3 rounded-lg text-xs border-2 outline-none"
                  style={{
                    background: CARD,
                    borderColor: BORDER,
                    color: CHARCOAL,
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    className="text-xs font-semibold mb-1 block"
                    style={{ color: MUTED }}
                  >
                    Start date
                  </label>
                  <input
                    type="date"
                    value={simForm.startDate}
                    onChange={(e) =>
                      setSimForm((p) => ({
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
                    End date
                  </label>
                  <input
                    type="date"
                    value={
                      simForm.endDate === "indefinite"
                        ? ""
                        : simForm.endDate
                    }
                    disabled={simForm.endDate === "indefinite"}
                    onChange={(e) =>
                      setSimForm((p) => ({ ...p, endDate: e.target.value }))
                    }
                    className="w-full h-9 px-3 rounded-lg text-xs border-2 outline-none disabled:opacity-40"
                    style={{
                      background: CARD,
                      borderColor: BORDER,
                      color: CHARCOAL,
                    }}
                  />
                  <label className="flex items-center gap-2 mt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={simForm.endDate === "indefinite"}
                      onChange={(e) =>
                        setSimForm((p) => ({
                          ...p,
                          endDate: e.target.checked ? "indefinite" : "",
                        }))
                      }
                    />
                    <span className="text-xs" style={{ color: MUTED }}>
                      Indefinitely
                    </span>
                  </label>
                </div>
              </div>
              <div>
                <label
                  className="text-xs font-semibold mb-2 block"
                  style={{ color: MUTED }}
                >
                  Study mode:
                </label>
                <div className="flex gap-2">
                  {(
                    [
                      { key: "sequential", label: "📖 One topic at a time" },
                      { key: "parallel", label: "📚 Multiple topics" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() =>
                        setSimForm((p) => ({ ...p, mode: opt.key }))
                      }
                      className="flex-1 p-2.5 rounded-xl text-xs font-semibold"
                      style={
                        simForm.mode === opt.key
                          ? {
                              background: `${PROGRESS_PURPLE}22`,
                              border: `2px solid ${PROGRESS_PURPLE}`,
                              color: DARK,
                            }
                          : {
                              background: CREAM,
                              border: `1px solid ${BORDER}`,
                              color: MUTED,
                            }
                      }
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              {simForm.mode === "parallel" && (
                <div className="space-y-3">
                  <div>
                    <label
                      className="text-xs font-semibold mb-2 block"
                      style={{ color: MUTED }}
                    >
                      Select topics to study simultaneously:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {rawSubjectsList.map((s) => {
                        const selected = simForm.subjectIds.includes(s.id);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() =>
                              setSimForm((p) => ({
                                ...p,
                                subjectIds: selected
                                  ? p.subjectIds.filter((id) => id !== s.id)
                                  : [...p.subjectIds, s.id],
                              }))
                            }
                            className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                            style={
                              selected
                                ? { background: DARK, color: CREAM }
                                : { background: `${BORDER}88`, color: MUTED }
                            }
                          >
                            {s.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {simForm.subjectIds.length > 0 && (
                    <div>
                      <label
                        className="text-xs font-semibold mb-2 block"
                        style={{ color: MUTED }}
                      >
                        Hours per day per topic:
                      </label>
                      {simForm.subjectIds.map((sid) => {
                        const s = rawSubjectsList.find((x) => x.id === sid);
                        if (!s) return null;
                        return (
                          <div
                            key={sid}
                            className="flex items-center gap-3 px-3 py-2 rounded-xl mb-1.5"
                            style={{
                              background: CARD,
                              border: `1px solid ${BORDER}`,
                            }}
                          >
                            <span
                              className="flex-1 text-xs font-medium"
                              style={{ color: CHARCOAL }}
                            >
                              {s.name}
                            </span>
                            <input
                              type="number"
                              min={0.5}
                              max={12}
                              step={0.5}
                              value={simForm.hoursPerSubject[sid] ?? ""}
                              placeholder="hrs/day"
                              onChange={(e) =>
                                setSimForm((p) => ({
                                  ...p,
                                  hoursPerSubject: {
                                    ...p.hoursPerSubject,
                                    [sid]: parseFloat(e.target.value) || 0,
                                  },
                                }))
                              }
                              className="w-16 h-8 px-2 rounded-lg text-xs text-center border-2 outline-none"
                              style={{
                                background: CREAM,
                                borderColor: BORDER,
                                color: CHARCOAL,
                              }}
                            />
                            <span className="text-xs" style={{ color: MUTED }}>
                              hrs/day
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  if (
                    !simForm.label ||
                    !simForm.startDate ||
                    !simForm.endDate
                  )
                    return;
                  if (simForm.endDate !== "indefinite" && simForm.endDate < simForm.startDate) {
                    alert("End date must be after start date. Please fix the dates and try again.");
                    return;
                  }
                  const newP: StudyPeriod = {
                    id: `${Date.now()}`,
                    label: simForm.label,
                    startDate: simForm.startDate,
                    endDate: simForm.endDate,
                    mode: simForm.mode,
                    parallelCount: simForm.parallelCount,
                    subjectIds: simForm.subjectIds,
                    hoursPerSubject: simForm.hoursPerSubject,
                  };
                  updateStudyPeriods([...simSlots, newP]);
                  setSimForm({
                    label: "",
                    startDate: "",
                    endDate: "",
                    mode: "sequential",
                    parallelCount: 2,
                    subjectIds: [],
                    hoursPerSubject: {},
                  });
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold"
                style={{
                  background: `linear-gradient(135deg, #A07840 0%, ${PROGRESS_PURPLE} 100%)`,
                  color: "#fff",
                }}
              >
                <Plus className="w-3 h-3" /> Add Simultaneous Study Period
              </button>
            </div>
            {simSlots.length === 0 ? (
              <p className="text-xs" style={{ color: MUTED }}>
                No simultaneous study periods added. Topics will be studied one
                at a time by default.
              </p>
            ) : (
              <div className="space-y-2">
                {simSlots.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-xl px-4 py-3"
                    style={{
                      background: `${PROGRESS_PURPLE}10`,
                      border: `1px solid ${PROGRESS_PURPLE}33`,
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p
                          className="text-sm font-semibold"
                          style={{ color: CHARCOAL }}
                        >
                          📚 {p.label}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: MUTED }}>
                          {p.startDate
                            ? format(parseISO(p.startDate), "MMM d, yyyy")
                            : ""}{" "}
                          →{" "}
                          {p.endDate === "indefinite"
                            ? "Indefinitely"
                            : p.endDate
                              ? format(parseISO(p.endDate), "MMM d, yyyy")
                              : ""}
                        </p>
                        <p
                          className="text-xs mt-0.5 font-medium"
                          style={{ color: DARK }}
                        >
                          {p.mode === "sequential"
                            ? "📖 Sequential"
                            : `📚 ${p.parallelCount} topics in parallel`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          updateStudyPeriods(
                            simSlots.filter((x) => x.id !== p.id),
                          )
                        }
                        className="p-1 rounded-lg"
                        style={{ color: "#C0392B" }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* QP Integration indicator */}
      {Object.keys(practiceProgress).length > 0 && (
        <div
          className="rounded-2xl px-5 py-4"
          style={{ background: `${OLIVE}10`, border: `1px solid ${OLIVE}33` }}
        >
          <p className="text-xs font-semibold" style={{ color: OLIVE }}>
            📊 Question Practice data is active — revision weeks are adjusted
            based on your accuracy and concept strength.
          </p>
          <p className="text-xs mt-1" style={{ color: MUTED }}>
            Weak concepts (+1 week) · Low accuracy &lt;50% (+1 week) · Strong
            &gt;85% (−0.5 weeks) · Weighted 60% latest / 40% history
          </p>
        </div>
      )}

      <StudySchedulePlanner uid={effectiveUserId || (() => { try { return JSON.parse(localStorage.getItem("heartspace_user")||"{}").id||""; } catch{return "";} })()} examType={examType} />

      {/* Completion forecast — always live */}
      <CompletionForecast schedule={schedule} />

      {/* Variable Weeks panel */}
      <VariableWeeksPanel
        variableWeeks={variableWeeks}
        unavailablePeriods={unavailablePeriods}
        baseHoursPerDay={hoursPerDay}
        daysPerWeek={daysPerWeek}
      />

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

      {/* Week-by-week */}
      {subjects.map((subject) => {
        const subjectWeeks = filtered.filter((w) => w.subject === subject);
        if (subjectWeeks.length === 0) return null;
        const allWeeks = schedule.weeks.filter((w) => w.subject === subject);
        const subjHoursDef = rawSubjectsList.find((sub) => sub.name === subject);
        const subjTotalHours = (subjHoursDef as any)?.totalHours;
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
              style={{ background: isExpanded ? `${PROGRESS_PURPLE}08` : CARD }}
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
                    style={{ background: `${PROGRESS_PURPLE}22`, color: DARK }}
                  >
                    {allWeeks.length} week(s){subjTotalHours ? ` · ${subjTotalHours} hrs` : ""}
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

      {schedule.weeks.length === 0 && (
        <div
          className="text-center py-12 rounded-2xl"
          style={{ background: CREAM, border: `1.5px dashed ${BORDER}` }}
        >
          <CheckCircle2
            className="w-10 h-10 mx-auto mb-3"
            style={{ color: OLIVE }}
          />
          <p className="text-sm font-medium" style={{ color: CHARCOAL }}>
            All subjects complete! 🎉
          </p>
          <p className="text-xs mt-1" style={{ color: MUTED }}>
            Your syllabus tracker shows everything is done.
          </p>
        </div>
      )}
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
          Topic Completion
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
                  background: isSelected ? `${PROGRESS_PURPLE}15` : CREAM,
                  border: `2px solid ${isSelected ? PROGRESS_PURPLE : BORDER}`,
                  boxShadow: isSelected ? `0 4px 16px ${PROGRESS_PURPLE}30` : "none",
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
                <span style={{ color: PROGRESS_PURPLE }}>{months} months</span>
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
                    background: `${PROGRESS_PURPLE}22`,
                    border: `1px solid ${PROGRESS_PURPLE}44`,
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
                background: `linear-gradient(135deg, #A07840 0%, ${PROGRESS_PURPLE} 100%)`,
                color: "#fff",
                boxShadow: "0 4px 16px rgba(201,169,110,.35)",
              }}
            >
              Create Topic Completion →
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
  effectiveUserId,
  onReset,
}: {
  roadmap: Roadmap;
  effectiveUserId: string;
  onReset: () => void;
}) {
  const [rm, setRm] = useState(roadmap);
  useEffect(() => { if (roadmap) setRm(roadmap); }, [roadmap]);
  const [editMonths, setEditMonths] = useState(false);
  const [newMonths, setNewMonths] = useState(rm.totalMonths);
  const [showUnavail, setShowUnavail] = useState(false);
  const [unavailForm, setUnavailForm] = useState({
    label: "",
    startDate: "",
    weeks: 1,
  });
  const [showVarWeek, setShowVarWeek] = useState(false);
  const [varWeekForm, setVarWeekForm] = useState({
    label: "",
    startDate: "",
    useMultiplier: true,
    multiplier: 2,
    customHours: 4,
  });
  const [expandPhase, setExpandPhase] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "progress" | "calendar" | "schedule"
  >("progress");

  const syllabusProgress: SyllabusProgress = (() => { try { return JSON.parse(localStorage.getItem(`hs_topic_syllabus_${effectiveUserId}`) ?? "{}"); } catch { return {}; } })();
  const examType = rm.examType;
  const calc = runAIEngine(rm);
  const statusCfg = STATUS_CFG[calc.status];
  const StatusIcon = statusCfg.icon;

  function persist(next: Roadmap) {
    const updated = { ...next, lastUpdated: new Date().toISOString() };
    setRm(updated);
    saveRoadmap(effectiveUserId, updated);
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
            Topic Completion
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
        {(["progress", "calendar", "schedule"] as const).map((tab) => (
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
            {tab === "progress"
                ? "📊 My Progress"
                : tab === "calendar"
                  ? "🗓️ Calendar"
                  : "📅 Schedule"}
          </button>
        ))}
      </div>

      {/* MY PROGRESS TAB */}
      {activeTab === "progress" && (
        <MyProgressTab userId={effectiveUserId} examType={examType} storagePrefix="topic" />
      )}

      {/* SCHEDULE TAB — live, auto-updates */}
      {activeTab === "calendar" && (
        <CalendarTabWrapper
          examType={rm.examType}
          startDate={rm.startDate}
          syllabusProgress={syllabusProgress}
          effectiveUserId={effectiveUserId}
          unavailablePeriods={rm.unavailablePeriods}
          variableWeeks={rm.variableWeeks ?? []}
        />
      )}

      {activeTab === "schedule" && (
        <>
        <LiveScheduleTab
          examType={rm.examType}
          startDate={rm.startDate}
          syllabusProgress={syllabusProgress}
          effectiveUserId={effectiveUserId || (() => { try { return JSON.parse(localStorage.getItem("heartspace_user")||"{}").id||""; } catch{return "";} })()}
          onSave={saveSchedule}
          unavailablePeriods={rm.unavailablePeriods}
          variableWeeks={rm.variableWeeks ?? []}
          rm={rm}
          persist={persist}
        />
        </>
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


/* ─── AI Roadmap Assistant ─── */
function AIRoadmapAssistant({ examType, subjects }: { examType: string; subjects: { name: string; studyWeeks: number }[] }) {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const GOLD = "#C9A84C";
  const CHARCOAL = "#2D2A25";
  const CREAM = "#F8F5F0";
  const CARD = "#FFFDF9";
  const BORDER = "#E5DDD0";
  const MUTED = "#7A7267";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);

    const subjectList = subjects.map(s => `${s.name} (${s.studyWeeks} weeks)`).join(", ");
    const systemPrompt = `You are a friendly academic planning assistant for HeartSpace, helping students prepare for ${examType === "NET_GATE" ? "CSIR NET/GATE" : "IIT JAM"} mathematics exams.

The student's subjects and estimated study times (at 5hrs/day, 5 days/week) are:
${subjectList}

Help the student plan their study schedule. You can:
- Calculate how long topics will take based on their available hours
- Suggest how to compensate for lost time
- Help prioritize subjects
- Give encouragement and practical advice
- Calculate end dates based on start date and hours per day

Keep responses concise, warm, and practical. Use bullet points when listing things.`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          system: systemPrompt,
          messages: [
            ...messages.map(m => ({ role: m.role, content: m.text })),
            { role: "user", content: userMsg }
          ]
        })
      });
      const data = await response.json();
      const reply = data.content?.[0]?.text ?? "Sorry, I couldn't respond. Please try again.";
      setMessages(prev => [...prev, { role: "assistant", text: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", text: "Something went wrong. Please try again." }]);
    }
    setLoading(false);
  }

  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, marginBottom: "1.5rem", overflow: "hidden" }}>
      <div style={{ padding: "1rem 1.25rem", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={{ fontSize: "1.1rem" }}>✨</span>
        <div>
          <div style={{ fontWeight: 700, color: CHARCOAL, fontSize: "0.95rem" }}>AI Study Planner</div>
          <div style={{ fontSize: "0.75rem", color: MUTED }}>Ask me anything about your schedule, timing, or how to plan your preparation</div>
        </div>
      </div>

      <div style={{ height: 300, overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: MUTED, fontSize: "0.85rem", marginTop: "2rem" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🎓</div>
            <div>Hi! I'm your AI study planner.</div>
            <div style={{ marginTop: "0.5rem", fontSize: "0.8rem" }}>Try asking:</div>
            <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              {["I study 4 hours a day, 6 days a week. How long will it take?",
                "I lost 2 weeks due to illness. How do I compensate?",
                "Which subject should I start with?"].map(q => (
                <button key={q} onClick={() => setInput(q)}
                  style={{ background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "0.4rem 0.75rem", fontSize: "0.78rem", color: CHARCOAL, cursor: "pointer" }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "80%", padding: "0.6rem 0.9rem", borderRadius: 12,
              background: m.role === "user" ? PROGRESS_PURPLE : CREAM,
              color: m.role === "user" ? "#fff" : CHARCOAL,
              fontSize: "0.85rem", lineHeight: 1.5,
              borderBottomRightRadius: m.role === "user" ? 4 : 12,
              borderBottomLeftRadius: m.role === "assistant" ? 4 : 12,
              whiteSpace: "pre-wrap"
            }}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ background: CREAM, borderRadius: 12, padding: "0.6rem 1rem", fontSize: "0.85rem", color: MUTED }}>
              Thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: "0.75rem 1rem", borderTop: `1px solid ${BORDER}`, display: "flex", gap: "0.5rem" }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Ask about your study plan..."
          style={{ flex: 1, padding: "0.6rem 0.9rem", borderRadius: 10, border: `1.5px solid ${BORDER}`, background: CREAM, color: CHARCOAL, fontSize: "0.85rem", outline: "none", fontFamily: "inherit" }}
        />
        <button onClick={send} disabled={loading || !input.trim()}
          style={{ background: PROGRESS_PURPLE, color: "#fff", border: "none", borderRadius: 10, padding: "0.6rem 1rem", fontWeight: 600, cursor: "pointer", opacity: loading || !input.trim() ? 0.5 : 1 }}>
          Send
        </button>
      </div>
    </div>
  );
}

/* ─── Main Component ───────────────────── */
export default function Roadmap() {
  const { user } = useAuth();

  const userId = user?.id ? String(user.id) : (() => {
    try {
      const stored = localStorage.getItem("heartspace_user");
      if (stored) { const p = JSON.parse(stored); return p.id ? String(p.id) : ""; }
    } catch {}
    return "";
  })();
  const viewAsId = new URLSearchParams(window.location.search).get("viewAs");
  const effectiveUserId = viewAsId ?? userId;
  // Sim slots at TOP LEVEL where effectiveUserId is always correct

  const [viewedExamType, setViewedExamType] = useState<string | null>(null);
  useEffect(() => {
    if (!viewAsId) return;
    supabase.from("profiles").select("exam_type").eq("id", viewAsId).single()
      .then(({ data }) => setViewedExamType(data?.exam_type ?? null));
  }, [viewAsId]);
  const examType = ((viewAsId ? viewedExamType : (user as any)?.exam_type) as string | null) ?? "JAM";
  const space = (user as any)?.space as string | null;
  const [roadmap, setRoadmap] = useState<Roadmap | null>(() =>
    loadRoadmap(effectiveUserId),
  );
  useEffect(() => {
    supabase.from("roadmap_data").select("data").eq("user_id", effectiveUserId).single()
      .then(({ data: sd }) => {
        if (sd?.data) setRoadmap(sd.data as Roadmap);
      });
  }, [effectiveUserId]);

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
    saveRoadmap(effectiveUserId, rm);
  }

  function handleReset() {
    if (!confirm("Reset your roadmap? Progress will be lost.")) return;
    localStorage.removeItem(lsKey(effectiveUserId));
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
            style={{ color: PROGRESS_PURPLE }}
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
    <RoadmapView roadmap={roadmap} effectiveUserId={effectiveUserId} onReset={handleReset} />
  );
}

