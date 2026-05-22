import { useState, useEffect } from "react";
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
  Minus,
  RotateCcw,
} from "lucide-react";
import {
  format,
  addWeeks,
  addMonths,
  differenceInWeeks,
  parseISO,
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
  weekNumber?: number;
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

/* ─── Placeholder phase templates ─────── */
function generatePhases(
  type: RoadmapType,
  totalMonths: number,
  examType: string,
): RoadmapPhase[] {
  const totalWeeks = totalMonths * 4;

  if (totalMonths <= 6) {
    return [
      {
        id: "p1",
        title: "Foundation & Basics",
        description:
          "Core concepts, fundamental theorems, problem-solving techniques",
        durationWeeks: Math.round(totalWeeks * 0.25),
        status: "not_started",
        topics: ["Core theory", "Basic problem solving", "Formula revision"],
      },
      {
        id: "p2",
        title: "Intermediate Topics",
        description: "Mid-level topics, standard problems, past paper patterns",
        durationWeeks: Math.round(totalWeeks * 0.3),
        status: "not_started",
        topics: [
          "Standard problems",
          "Topic-wise practice",
          "Concept strengthening",
        ],
      },
      {
        id: "p3",
        title: "Advanced Topics",
        description:
          "Complex problems, advanced theorems, tricky question types",
        durationWeeks: Math.round(totalWeeks * 0.2),
        status: "not_started",
        topics: [
          "Advanced problems",
          "Tricky questions",
          "High-weightage topics",
        ],
      },
      {
        id: "p4",
        title: "Revision & Mock Tests",
        description: "Full syllabus revision, mock tests, weak area focus",
        durationWeeks: Math.round(totalWeeks * 0.15),
        status: "not_started",
        topics: ["Full revision", "Mock tests", "Error analysis"],
      },
      {
        id: "p5",
        title: "Final Sprint",
        description: "Last-minute revision, formula sheets, exam strategy",
        durationWeeks: Math.round(totalWeeks * 0.1),
        status: "not_started",
        topics: ["Formula sheets", "Quick revision", "Exam strategy"],
      },
    ];
  }

  if (totalMonths <= 12) {
    return [
      {
        id: "p1",
        title: "Foundation",
        description: "Build strong basics across all subjects",
        durationWeeks: Math.round(totalWeeks * 0.2),
        status: "not_started",
        topics: ["Basic concepts", "Standard textbooks", "Foundation problems"],
      },
      {
        id: "p2",
        title: "Topic-wise Study",
        description: "Subject-by-subject deep study",
        durationWeeks: Math.round(totalWeeks * 0.25),
        status: "not_started",
        topics: [
          "Subject 1 deep dive",
          "Subject 2 deep dive",
          "Cross-topic linking",
        ],
      },
      {
        id: "p3",
        title: "Problem Practice",
        description: "Intensive problem solving across topics",
        durationWeeks: Math.round(totalWeeks * 0.2),
        status: "not_started",
        topics: ["Past paper problems", "Standard questions", "Speed building"],
      },
      {
        id: "p4",
        title: "Advanced & Integration",
        description: "Hard problems, multi-topic questions",
        durationWeeks: Math.round(totalWeeks * 0.15),
        status: "not_started",
        topics: [
          "Advanced problems",
          "Integration of topics",
          "High-level questions",
        ],
      },
      {
        id: "p5",
        title: "Revision",
        description: "Complete syllabus revision, topic summaries",
        durationWeeks: Math.round(totalWeeks * 0.1),
        status: "not_started",
        topics: ["Full syllabus sweep", "Mind maps", "Key theorems"],
      },
      {
        id: "p6",
        title: "Mock Tests & Analysis",
        description: "Full mock tests, analysis, weak areas",
        durationWeeks: Math.round(totalWeeks * 0.07),
        status: "not_started",
        topics: ["Mock tests", "Time management", "Error logs"],
      },
      {
        id: "p7",
        title: "Final Sprint",
        description: "Formula sheets, last-minute prep",
        durationWeeks: Math.round(totalWeeks * 0.03),
        status: "not_started",
        topics: ["Formula revision", "Mental preparation", "Exam strategy"],
      },
    ];
  }

  /* Long plans (18+ months) */
  return [
    {
      id: "p1",
      title: "Awareness & Orientation",
      description: "Understand exam pattern, syllabus, and planning",
      durationWeeks: Math.round(totalWeeks * 0.05),
      status: "not_started",
      topics: ["Exam pattern", "Syllabus overview", "Resource selection"],
    },
    {
      id: "p2",
      title: "Foundation Building",
      description: "Strong conceptual foundation across all subjects",
      durationWeeks: Math.round(totalWeeks * 0.2),
      status: "not_started",
      topics: ["Basic concepts", "Textbook study", "Concept clarity"],
    },
    {
      id: "p3",
      title: "Topic-wise Deep Study",
      description: "Go deep into each subject systematically",
      durationWeeks: Math.round(totalWeeks * 0.25),
      status: "not_started",
      topics: ["Subject deep dives", "Notes making", "Topic tests"],
    },
    {
      id: "p4",
      title: "Problem Practice",
      description: "Extensive problem solving, past papers",
      durationWeeks: Math.round(totalWeeks * 0.18),
      status: "not_started",
      topics: ["Previous year questions", "Practice sets", "Speed drills"],
    },
    {
      id: "p5",
      title: "Advanced Topics",
      description: "High-difficulty topics, integration questions",
      durationWeeks: Math.round(totalWeeks * 0.12),
      status: "not_started",
      topics: [
        "Advanced chapters",
        "Tricky problem types",
        "High-weightage areas",
      ],
    },
    {
      id: "p6",
      title: "First Full Revision",
      description: "Complete first pass revision of all topics",
      durationWeeks: Math.round(totalWeeks * 0.08),
      status: "not_started",
      topics: [
        "Full syllabus revision",
        "Summary notes",
        "Weak area identification",
      ],
    },
    {
      id: "p7",
      title: "Mock Tests",
      description: "Regular mock tests and detailed analysis",
      durationWeeks: Math.round(totalWeeks * 0.07),
      status: "not_started",
      topics: ["Full-length mocks", "Section-wise tests", "Error analysis"],
    },
    {
      id: "p8",
      title: "Final Revision & Sprint",
      description: "Final revision, formula sheets, exam readiness",
      durationWeeks: Math.round(totalWeeks * 0.05),
      status: "not_started",
      topics: ["Formula sheets", "Quick revision", "Mental fitness"],
    },
  ];
}

/* ─── AI Calculation Engine ────────────── */
interface AICalculation {
  totalWeeks: number;
  effectiveWeeks: number;
  unavailableWeeks: number;
  estimatedEndDate: string;
  weeklyTargetPercent: number;
  completedPercent: number;
  status: "on_track" | "ahead" | "behind" | "critical";
  statusMessage: string;
  adjustedPhases: RoadmapPhase[];
  recommendation: string;
}

function runAIEngine(roadmap: Roadmap): AICalculation {
  const totalWeeks = roadmap.totalMonths * 4;
  const unavailableWeeks = roadmap.unavailablePeriods.reduce(
    (sum, p) => sum + p.weeks,
    0,
  );
  const effectiveWeeks =
    totalWeeks + unavailableWeeks; /* extend end date by unavailable weeks */

  const startDate = parseISO(roadmap.startDate);
  const estimatedEnd = addWeeks(startDate, effectiveWeeks);
  const now = new Date();
  const weeksElapsed = Math.max(0, differenceInWeeks(now, startDate));
  const weeksRemaining = Math.max(0, effectiveWeeks - weeksElapsed);

  /* Calculate completed phases */
  const donePhasesWeeks = roadmap.phases
    .filter((p) => p.status === "done")
    .reduce((sum, p) => sum + p.durationWeeks, 0);

  const completedPercent =
    totalWeeks > 0
      ? Math.min(100, Math.round((donePhasesWeeks / totalWeeks) * 100))
      : 0;

  /* Expected progress at this point */
  const expectedPercent =
    effectiveWeeks > 0
      ? Math.min(100, Math.round((weeksElapsed / effectiveWeeks) * 100))
      : 0;

  const diff = completedPercent - expectedPercent;

  let status: AICalculation["status"];
  let statusMessage: string;
  let recommendation: string;

  if (weeksElapsed === 0) {
    status = "on_track";
    statusMessage = "Roadmap just started — you're on track!";
    recommendation =
      "Begin with Phase 1 and aim to complete the weekly targets consistently.";
  } else if (diff >= 10) {
    status = "ahead";
    statusMessage = `You're ahead by ~${Math.round((diff / 25) * effectiveWeeks)} week(s)! 🎉`;
    recommendation =
      "Great pace! Use extra time for deeper practice and mock tests.";
  } else if (diff >= -5) {
    status = "on_track";
    statusMessage = "You're right on track! Keep going. 💪";
    recommendation =
      "Maintain your current study pace and don't skip sessions.";
  } else if (diff >= -15) {
    status = "behind";
    statusMessage = `You're slightly behind by ~${Math.round((Math.abs(diff) / 25) * effectiveWeeks)} week(s).`;
    recommendation = `Try to add ${Math.ceil(Math.abs(diff) / 10)} extra study hours per week to get back on track.`;
  } else {
    status = "critical";
    statusMessage = `Significantly behind. Immediate plan adjustment needed.`;
    recommendation =
      "Consider reducing scope of lower-priority topics and focus intensely on high-weightage areas.";
  }

  /* Redistribute unavailable weeks across remaining phases */
  const remainingPhases = roadmap.phases.filter((p) => p.status !== "done");
  const totalRemainingWeeks = remainingPhases.reduce(
    (sum, p) => sum + p.durationWeeks,
    0,
  );

  /* Add unavailable weeks proportionally to remaining phases */
  const adjustedPhases: RoadmapPhase[] = roadmap.phases.map((phase) => {
    if (phase.status === "done") return phase;
    const proportion =
      totalRemainingWeeks > 0 ? phase.durationWeeks / totalRemainingWeeks : 0;
    const extraWeeks = Math.round(unavailableWeeks * proportion);
    return { ...phase, durationWeeks: phase.durationWeeks + extraWeeks };
  });

  const weeklyTargetPercent =
    weeksRemaining > 0
      ? Math.ceil((100 - completedPercent) / weeksRemaining)
      : 0;

  return {
    totalWeeks,
    effectiveWeeks,
    unavailableWeeks,
    estimatedEndDate: format(estimatedEnd, "MMMM d, yyyy"),
    weeklyTargetPercent,
    completedPercent,
    status,
    statusMessage,
    adjustedPhases,
    recommendation,
  };
}

/* ─── localStorage helpers ─────────────── */
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

function saveRoadmap(userId: string, roadmap: Roadmap) {
  localStorage.setItem(lsKey(userId), JSON.stringify(roadmap));
}

/* ─── Status badge ─────────────────────── */
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

const PHASE_STATUS_CFG = {
  not_started: { label: "Not Started", color: MUTED, bg: `${BORDER}88` },
  in_progress: { label: "In Progress", color: GOLD, bg: `${GOLD}22` },
  done: { label: "Done", color: OLIVE, bg: `${OLIVE}22` },
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

  function confirm() {
    if (!selected) return;
    onSelect(selected, months);
  }

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
          This helps us create the right preparation plan for you.
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
                Total preparation time (months)
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
                  className="flex items-center gap-2 px-4 py-2 rounded-xl min-w-[80px] justify-center"
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
                Default for {ROADMAP_TYPES[selected].label}:{" "}
                {ROADMAP_TYPES[selected].defaultMonths} months. You can change
                this anytime.
              </p>
            </div>

            <button
              onClick={confirm}
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

  const calc = runAIEngine(rm);
  const statusCfg = STATUS_CFG[calc.status];
  const StatusIcon = statusCfg.icon;

  function persist(next: Roadmap) {
    const updated = { ...next, lastUpdated: new Date().toISOString() };
    setRm(updated);
    saveRoadmap(userId, updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function applyNewMonths() {
    const recalcPhases = generatePhases(rm.type, newMonths, rm.examType);
    /* Preserve done statuses */
    const merged = recalcPhases.map((p, i) => ({
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
          background: `${statusCfg.bg}`,
          border: `1.5px solid ${statusCfg.color}44`,
        }}
      >
        <div className="flex items-start gap-3 mb-4">
          <StatusIcon
            className="w-5 h-5 flex-shrink-0 mt-0.5"
            style={{ color: statusCfg.color }}
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: `${statusCfg.color}22`,
                  color: statusCfg.color,
                }}
              >
                {statusCfg.label}
              </span>
            </div>
            <p className="text-sm font-semibold" style={{ color: CHARCOAL }}>
              {calc.statusMessage}
            </p>
            <p className="text-xs mt-1" style={{ color: MUTED }}>
              {calc.recommendation}
            </p>
          </div>
        </div>

        {/* Stats grid */}
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
              label: "Unavailable",
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

        {/* Progress bar */}
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
            style={{ background: `${BORDER}` }}
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
            className="flex items-center gap-4 text-sm"
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
        <div className="flex items-center justify-between mb-3">
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
              <Plus className="w-3 h-3" /> Add Period
            </button>
          )}
        </div>

        <p className="text-xs mb-3" style={{ color: MUTED }}>
          Log periods when you can't study — AI will automatically extend your
          roadmap and adjust targets.
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
                  placeholder="e.g. Family event, exams…"
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
            No unavailable periods logged yet.
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
          Phase durations are automatically adjusted based on your timeline and
          unavailable periods.
        </p>

        <div className="space-y-3">
          {calc.adjustedPhases.map((phase, idx) => {
            const isOpen = expandPhase[phase.id] ?? false;
            const statusCfg = PHASE_STATUS_CFG[phase.status];
            const weekStart = calc.adjustedPhases
              .slice(0, idx)
              .reduce((sum, p) => sum + p.durationWeeks, 0);
            const phaseStart = addWeeks(parseISO(rm.startDate), weekStart);

            return (
              <div
                key={phase.id}
                className="rounded-2xl overflow-hidden"
                style={{ background: CARD, border: `1px solid ${BORDER}` }}
              >
                {/* Phase header */}
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
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs" style={{ color: MUTED }}>
                        {phase.durationWeeks} week(s) · From{" "}
                        {format(phaseStart, "MMM d")}
                      </span>
                    </div>
                  </button>

                  {/* Status selector */}
                  <div className="flex gap-1 flex-shrink-0">
                    {(
                      ["not_started", "in_progress", "done"] as PhaseStatus[]
                    ).map((s) => {
                      const cfg = PHASE_STATUS_CFG[s];
                      const active = phase.status === s;
                      return (
                        <button
                          key={s}
                          onClick={() => updatePhaseStatus(phase.id, s)}
                          className="px-2 py-1 rounded-lg text-[10px] font-semibold transition-all"
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
                          {s === "not_started"
                            ? "—"
                            : s === "in_progress"
                              ? "▶"
                              : "✓"}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Phase details */}
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
                    <div className="flex flex-wrap gap-2">
                      {phase.topics.map((t) => (
                        <span
                          key={t}
                          className="text-[11px] px-2.5 py-1 rounded-full font-medium"
                          style={{
                            background: `${GOLD}15`,
                            color: DARK,
                            border: `1px solid ${GOLD}33`,
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    <p className="text-[10px] mt-3" style={{ color: MUTED }}>
                      📌 Detailed topic content will be added once your roadmap
                      is finalised by your mentor.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Save indicator */}
      {saved && (
        <div
          className="fixed bottom-6 right-6 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg"
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
    const phases = generatePhases(type, months, examType ?? "JAM");
    const newRoadmap: Roadmap = {
      type,
      examType: examType ?? "JAM",
      totalMonths: months,
      startDate: new Date().toISOString().split("T")[0],
      phases,
      unavailablePeriods: [],
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };
    setRoadmap(newRoadmap);
    saveRoadmap(userId, newRoadmap);
  }

  function handleReset() {
    if (
      !confirm(
        "Are you sure you want to reset your roadmap? Your progress will be lost.",
      )
    )
      return;
    localStorage.removeItem(lsKey(userId));
    setRoadmap(null);
  }

  /* Apex+ and Zenith only */
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

  if (!roadmap) {
    return (
      <RoadmapSelector examType={examType ?? "JAM"} onSelect={handleSelect} />
    );
  }

  return (
    <RoadmapView roadmap={roadmap} userId={userId} onReset={handleReset} />
  );
}
