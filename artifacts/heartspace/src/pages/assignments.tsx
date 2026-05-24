import { useState } from "react";
import { useAuth } from "../lib/auth";
import { format } from "date-fns";
import {
  ChevronDown,
  ChevronRight,
  BookOpen,
  CheckCircle2,
  TrendingUp,
  Zap,
  Brain,
  Plus,
  Trash2,
  BarChart2,
} from "lucide-react";
import { SYLLABUS } from "./syllabus";

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
const SIDEBAR = "#3D2314";

/* ─── Types ────────────────────────────── */
type ConceptLevel = "weak" | "developing" | "strong";
type SpeedLevel = "slow" | "moderate" | "fast";

interface PracticeAttempt {
  id: string;
  date: string /* ISO string */;
  accuracy: number /* 0-100 */;
  concept: ConceptLevel;
  speed: SpeedLevel;
  note?: string;
}

interface PracticeEntry {
  attempts: PracticeAttempt[];
}

/* key = subtopicId or topicId */
type PracticeProgress = Record<string, PracticeEntry>;

/* ─── Level configs ────────────────────── */
const CONCEPT_CFG: Record<
  ConceptLevel,
  { label: string; color: string; bg: string; emoji: string }
> = {
  weak: { label: "Weak", color: "#C0392B", bg: "#FDE8E8", emoji: "🔴" },
  developing: {
    label: "Developing",
    color: "#B8860B",
    bg: "#FFF8DC",
    emoji: "🟡",
  },
  strong: { label: "Strong", color: OLIVE, bg: `${OLIVE}15`, emoji: "🟢" },
};

const SPEED_CFG: Record<
  SpeedLevel,
  { label: string; color: string; bg: string; emoji: string }
> = {
  slow: { label: "Slow", color: "#C0392B", bg: "#FDE8E8", emoji: "🐢" },
  moderate: { label: "Moderate", color: "#B8860B", bg: "#FFF8DC", emoji: "🚶" },
  fast: { label: "Fast", color: OLIVE, bg: `${OLIVE}15`, emoji: "⚡" },
};

/* ─── localStorage ─────────────────────── */
function lsKey(userId: string) {
  return `hs_practice_${userId}`;
}

function loadProgress(userId: string): PracticeProgress {
  try {
    const r = localStorage.getItem(lsKey(userId));
    return r ? JSON.parse(r) : {};
  } catch {
    return {};
  }
}

function saveProgress(userId: string, progress: PracticeProgress) {
  try {
    localStorage.setItem(lsKey(userId), JSON.stringify(progress));
  } catch {
    /* ignore */
  }
}

/* ─── Helpers ──────────────────────────── */
function getLatest(entry?: PracticeEntry): PracticeAttempt | null {
  if (!entry || entry.attempts.length === 0) return null;
  return entry.attempts[entry.attempts.length - 1];
}

function getAccuracyColor(acc: number) {
  if (acc >= 80) return OLIVE;
  if (acc >= 50) return "#B8860B";
  return "#C0392B";
}

function avgAccuracy(attempts: PracticeAttempt[]) {
  if (!attempts.length) return 0;
  return Math.round(
    attempts.reduce((s, a) => s + a.accuracy, 0) / attempts.length,
  );
}

/* ─── Attempt Form ─────────────────────── */
function AttemptForm({
  onSave,
  onCancel,
}: {
  onSave: (attempt: Omit<PracticeAttempt, "id" | "date">) => void;
  onCancel: () => void;
}) {
  const [accuracy, setAccuracy] = useState(50);
  const [concept, setConcept] = useState<ConceptLevel>("developing");
  const [speed, setSpeed] = useState<SpeedLevel>("moderate");
  const [note, setNote] = useState("");

  return (
    <div
      className="rounded-2xl p-5 space-y-4 mt-2"
      style={{ background: `${GOLD}08`, border: `1.5px solid ${GOLD}44` }}
    >
      <p className="text-xs font-semibold" style={{ color: CHARCOAL }}>
        Log a Practice Attempt
      </p>

      {/* Accuracy */}
      <div>
        <label
          className="text-xs font-semibold mb-2 flex items-center gap-2"
          style={{ color: CHARCOAL }}
        >
          <TrendingUp className="w-3.5 h-3.5" style={{ color: GOLD }} />
          Accuracy
          <span
            className="ml-auto text-base font-bold font-serif"
            style={{ color: getAccuracyColor(accuracy) }}
          >
            {accuracy}%
          </span>
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={accuracy}
            onChange={(e) => setAccuracy(parseInt(e.target.value))}
            className="flex-1 accent-amber-600"
          />
          <input
            type="number"
            min={0}
            max={100}
            value={accuracy}
            onChange={(e) =>
              setAccuracy(
                Math.min(100, Math.max(0, parseInt(e.target.value) || 0)),
              )
            }
            className="w-16 h-8 px-2 rounded-lg text-xs font-bold text-center border-2 outline-none"
            style={{
              background: CARD,
              borderColor: BORDER,
              color: getAccuracyColor(accuracy),
            }}
          />
        </div>
        <div
          className="h-2 rounded-full overflow-hidden mt-2"
          style={{ background: BORDER }}
        >
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${accuracy}%`,
              background: getAccuracyColor(accuracy),
            }}
          />
        </div>
      </div>

      {/* Concept Understanding */}
      <div>
        <label
          className="text-xs font-semibold mb-2 flex items-center gap-2"
          style={{ color: CHARCOAL }}
        >
          <Brain className="w-3.5 h-3.5" style={{ color: GOLD }} />
          Concept Understanding
        </label>
        <div className="flex gap-2">
          {(
            Object.entries(CONCEPT_CFG) as [
              ConceptLevel,
              (typeof CONCEPT_CFG)[ConceptLevel],
            ][]
          ).map(([key, cfg]) => (
            <button
              key={key}
              type="button"
              onClick={() => setConcept(key)}
              className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
              style={
                concept === key
                  ? {
                      background: cfg.color,
                      color: "#fff",
                      boxShadow: `0 2px 8px ${cfg.color}44`,
                    }
                  : {
                      background: cfg.bg,
                      color: cfg.color,
                      border: `1px solid ${cfg.color}44`,
                    }
              }
            >
              {cfg.emoji} {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {/* Speed */}
      <div>
        <label
          className="text-xs font-semibold mb-2 flex items-center gap-2"
          style={{ color: CHARCOAL }}
        >
          <Zap className="w-3.5 h-3.5" style={{ color: GOLD }} />
          Speed
        </label>
        <div className="flex gap-2">
          {(
            Object.entries(SPEED_CFG) as [
              SpeedLevel,
              (typeof SPEED_CFG)[SpeedLevel],
            ][]
          ).map(([key, cfg]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSpeed(key)}
              className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
              style={
                speed === key
                  ? {
                      background: cfg.color,
                      color: "#fff",
                      boxShadow: `0 2px 8px ${cfg.color}44`,
                    }
                  : {
                      background: cfg.bg,
                      color: cfg.color,
                      border: `1px solid ${cfg.color}44`,
                    }
              }
            >
              {cfg.emoji} {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {/* Note */}
      <div>
        <label
          className="text-xs font-semibold mb-1 block"
          style={{ color: MUTED }}
        >
          Note (optional)
        </label>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Struggled with Cayley-Hamilton, need more practice..."
          className="w-full h-9 px-3 rounded-xl text-xs border-2 outline-none"
          style={{ background: CARD, borderColor: BORDER, color: CHARCOAL }}
        />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() =>
            onSave({ accuracy, concept, speed, note: note || undefined })
          }
          className="flex-1 h-10 rounded-xl font-semibold text-sm transition-all hover:scale-[1.01]"
          style={{
            background: `linear-gradient(135deg, #A07840 0%, ${GOLD} 100%)`,
            color: "#fff",
          }}
        >
          Save Attempt
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 h-10 rounded-xl text-sm font-semibold"
          style={{ background: BORDER, color: MUTED }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ─── Attempt History ──────────────────── */
function AttemptHistory({
  attempts,
  onDelete,
}: {
  attempts: PracticeAttempt[];
  onDelete: (id: string) => void;
}) {
  if (attempts.length === 0) return null;

  return (
    <div className="space-y-2 mt-2">
      <p
        className="text-[10px] font-semibold uppercase tracking-wide"
        style={{ color: MUTED }}
      >
        Attempt History ({attempts.length})
      </p>
      {[...attempts].reverse().map((attempt, idx) => {
        const conceptCfg = CONCEPT_CFG[attempt.concept];
        const speedCfg = SPEED_CFG[attempt.speed];
        const isLatest = idx === 0;

        return (
          <div
            key={attempt.id}
            className="rounded-xl px-4 py-3"
            style={{
              background: isLatest ? `${OLIVE}08` : CREAM,
              border: `1px solid ${isLatest ? OLIVE : BORDER}33`,
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              {isLatest && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: `${OLIVE}22`, color: OLIVE }}
                >
                  Latest
                </span>
              )}
              <span className="text-[10px]" style={{ color: MUTED }}>
                {format(new Date(attempt.date), "MMM d, yyyy · h:mm a")}
              </span>
              <button
                type="button"
                onClick={() => onDelete(attempt.id)}
                className="ml-auto p-1 rounded-lg opacity-40 hover:opacity-100 transition-opacity"
                style={{ color: "#C0392B" }}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {/* Accuracy */}
              <div className="flex items-center gap-1.5">
                <TrendingUp
                  className="w-3 h-3"
                  style={{ color: getAccuracyColor(attempt.accuracy) }}
                />
                <span
                  className="text-sm font-bold font-serif"
                  style={{ color: getAccuracyColor(attempt.accuracy) }}
                >
                  {attempt.accuracy}%
                </span>
              </div>
              {/* Concept */}
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: conceptCfg.bg, color: conceptCfg.color }}
              >
                {conceptCfg.emoji} {conceptCfg.label}
              </span>
              {/* Speed */}
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: speedCfg.bg, color: speedCfg.color }}
              >
                {speedCfg.emoji} {speedCfg.label}
              </span>
            </div>
            {attempt.note && (
              <p className="text-[10px] mt-2 italic" style={{ color: MUTED }}>
                "{attempt.note}"
              </p>
            )}
          </div>
        );
      })}

      {/* Improvement summary if 2+ attempts */}
      {attempts.length >= 2 &&
        (() => {
          const first = attempts[0];
          const latest = attempts[attempts.length - 1];
          const diff = latest.accuracy - first.accuracy;
          return (
            <div
              className="rounded-xl px-4 py-2.5"
              style={{
                background: diff >= 0 ? `${OLIVE}10` : "#FDE8E8",
                border: `1px solid ${diff >= 0 ? OLIVE : "#C0392B"}22`,
              }}
            >
              <p
                className="text-xs font-semibold"
                style={{ color: diff >= 0 ? OLIVE : "#C0392B" }}
              >
                {diff >= 0 ? "📈" : "📉"} {Math.abs(diff)}%{" "}
                {diff >= 0 ? "improvement" : "drop"} from first to latest
                attempt
                {diff >= 10 && " — great progress! 🎉"}
              </p>
            </div>
          );
        })()}
    </div>
  );
}

/* ─── Subtopic Practice Row ────────────── */
function SubtopicRow({
  stId,
  stName,
  entry,
  onAdd,
  onDelete,
}: {
  stId: string;
  stName: string;
  entry?: PracticeEntry;
  onAdd: (attempt: Omit<PracticeAttempt, "id" | "date">) => void;
  onDelete: (attemptId: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const latest = getLatest(entry);
  const attemptCount = entry?.attempts.length ?? 0;
  const conceptCfg = latest ? CONCEPT_CFG[latest.concept] : null;
  const speedCfg = latest ? SPEED_CFG[latest.speed] : null;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: latest ? `${OLIVE}06` : CREAM,
        border: `1px solid ${latest ? OLIVE : BORDER}33`,
      }}
    >
      {/* Row header */}
      <div className="flex items-center gap-3 px-4 py-2.5">
        <div
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: latest ? OLIVE : BORDER }}
        />
        <span className="flex-1 text-sm" style={{ color: CHARCOAL }}>
          {stName}
        </span>

        {/* Latest stats */}
        {latest && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className="text-xs font-bold font-serif"
              style={{ color: getAccuracyColor(latest.accuracy) }}
            >
              {latest.accuracy}%
            </span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full"
              style={{ background: conceptCfg!.bg, color: conceptCfg!.color }}
            >
              {conceptCfg!.emoji}
            </span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full"
              style={{ background: speedCfg!.bg, color: speedCfg!.color }}
            >
              {speedCfg!.emoji}
            </span>
            {attemptCount > 1 && (
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="text-[10px] px-1.5 py-0.5 rounded-full"
                style={{ background: `${GOLD}22`, color: DARK }}
              >
                {attemptCount} attempts
              </button>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            setShowForm(!showForm);
            setShowHistory(false);
          }}
          className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all hover:scale-110"
          style={{
            background: showForm ? GOLD : `${GOLD}22`,
            color: showForm ? "#fff" : DARK,
          }}
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {showForm && (
        <div className="px-4 pb-3">
          <AttemptForm
            onSave={(attempt) => {
              onAdd(attempt);
              setShowForm(false);
              setShowHistory(true);
            }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {showHistory && entry && entry.attempts.length > 0 && (
        <div className="px-4 pb-3">
          <AttemptHistory attempts={entry.attempts} onDelete={onDelete} />
        </div>
      )}
    </div>
  );
}

/* ─── Topic Practice Block ─────────────── */
function TopicBlock({
  topic,
  subjectId,
  progress,
  userId,
  onUpdate,
}: {
  topic: {
    id: string;
    name: string;
    subtopics: { id: string; name: string }[];
  };
  subjectId: string;
  progress: PracticeProgress;
  userId: string;
  onUpdate: (next: PracticeProgress) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showTopicForm, setShowTopicForm] = useState(false);

  /* Stats across all subtopics */
  const subtopicEntries = topic.subtopics.map((st) => progress[st.id]);
  const attempted = subtopicEntries.filter(
    (e) => e && e.attempts.length > 0,
  ).length;
  const latestAccs = subtopicEntries
    .map((e) => getLatest(e)?.accuracy ?? null)
    .filter((v) => v !== null) as number[];
  const avgAcc = latestAccs.length
    ? Math.round(latestAccs.reduce((s, v) => s + v, 0) / latestAccs.length)
    : null;

  /* Worst concept/speed across subtopics */
  const conceptOrder: ConceptLevel[] = ["weak", "developing", "strong"];
  const speedOrder: SpeedLevel[] = ["slow", "moderate", "fast"];
  const latestConcepts = subtopicEntries
    .map((e) => getLatest(e)?.concept)
    .filter(Boolean) as ConceptLevel[];
  const latestSpeeds = subtopicEntries
    .map((e) => getLatest(e)?.speed)
    .filter(Boolean) as SpeedLevel[];
  const worstConcept = latestConcepts.length
    ? latestConcepts.reduce((a, b) =>
        conceptOrder.indexOf(a) < conceptOrder.indexOf(b) ? a : b,
      )
    : null;
  const worstSpeed = latestSpeeds.length
    ? latestSpeeds.reduce((a, b) =>
        speedOrder.indexOf(a) < speedOrder.indexOf(b) ? a : b,
      )
    : null;

  function addTopicAttempt(attempt: Omit<PracticeAttempt, "id" | "date">) {
    const now = new Date().toISOString();
    const next = { ...progress };
    topic.subtopics.forEach((st) => {
      const prev = next[st.id] ?? { attempts: [] };
      const newAttempt: PracticeAttempt = {
        id: `${Date.now()}_${st.id}`,
        date: now,
        ...attempt,
      };
      next[st.id] = { attempts: [...prev.attempts, newAttempt] };
    });
    onUpdate(next);
  }

  function addSubtopicAttempt(
    stId: string,
    attempt: Omit<PracticeAttempt, "id" | "date">,
  ) {
    const now = new Date().toISOString();
    const prev = progress[stId] ?? { attempts: [] };
    const newAttempt: PracticeAttempt = {
      id: `${Date.now()}_${stId}`,
      date: now,
      ...attempt,
    };
    onUpdate({
      ...progress,
      [stId]: { attempts: [...prev.attempts, newAttempt] },
    });
  }

  function deleteAttempt(stId: string, attemptId: string) {
    const prev = progress[stId] ?? { attempts: [] };
    onUpdate({
      ...progress,
      [stId]: { attempts: prev.attempts.filter((a) => a.id !== attemptId) },
    });
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: CARD, border: `1px solid ${BORDER}` }}
    >
      {/* Topic header */}
      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{ background: expanded ? `${GOLD}06` : CREAM }}
      >
        {/* Expand */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex flex-1 items-center gap-3 text-left"
        >
          {expanded ? (
            <ChevronDown
              className="w-4 h-4 flex-shrink-0"
              style={{ color: MUTED }}
            />
          ) : (
            <ChevronRight
              className="w-4 h-4 flex-shrink-0"
              style={{ color: MUTED }}
            />
          )}
          <span className="font-semibold text-sm" style={{ color: CHARCOAL }}>
            {topic.name}
          </span>
          <span className="text-[10px]" style={{ color: MUTED }}>
            {attempted}/{topic.subtopics.length} practiced
          </span>
        </button>

        {/* Summary badges */}
        {avgAcc !== null && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span
              className="text-xs font-bold font-serif"
              style={{ color: getAccuracyColor(avgAcc) }}
            >
              {avgAcc}%
            </span>
            {worstConcept && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full"
                style={{
                  background: CONCEPT_CFG[worstConcept].bg,
                  color: CONCEPT_CFG[worstConcept].color,
                }}
              >
                {CONCEPT_CFG[worstConcept].emoji}
              </span>
            )}
            {worstSpeed && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full"
                style={{
                  background: SPEED_CFG[worstSpeed].bg,
                  color: SPEED_CFG[worstSpeed].color,
                }}
              >
                {SPEED_CFG[worstSpeed].emoji}
              </span>
            )}
          </div>
        )}

        {/* Add for whole topic */}
        <button
          type="button"
          onClick={() => {
            setShowTopicForm(!showTopicForm);
            setExpanded(true);
          }}
          title="Log practice for entire topic"
          className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all"
          style={{
            background: showTopicForm ? GOLD : `${GOLD}22`,
            color: showTopicForm ? "#fff" : DARK,
          }}
        >
          <Plus className="w-3 h-3" /> Topic
        </button>
      </div>

      {/* Topic-level form */}
      {showTopicForm && (
        <div className="px-4 pb-3" style={{ background: CREAM }}>
          <p
            className="text-[10px] text-muted pt-2 pb-1"
            style={{ color: MUTED }}
          >
            This will log the same attempt for all {topic.subtopics.length}{" "}
            subtopics.
          </p>
          <AttemptForm
            onSave={(attempt) => {
              addTopicAttempt(attempt);
              setShowTopicForm(false);
            }}
            onCancel={() => setShowTopicForm(false)}
          />
        </div>
      )}

      {/* Subtopics */}
      {expanded && (
        <div
          className="px-4 pb-4 space-y-2"
          style={{ borderTop: `1px solid ${BORDER}` }}
        >
          <p
            className="text-[10px] font-semibold uppercase tracking-wide pt-3"
            style={{ color: MUTED }}
          >
            Subtopics — click + to log practice
          </p>
          {topic.subtopics.map((st) => (
            <SubtopicRow
              key={st.id}
              stId={st.id}
              stName={st.name}
              entry={progress[st.id]}
              onAdd={(attempt) => addSubtopicAttempt(st.id, attempt)}
              onDelete={(attemptId) => deleteAttempt(st.id, attemptId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ───────────────────── */
export default function QuestionPractice() {
  const { user } = useAuth();
  const userId = String(user?.id ?? "guest");
  const examType = (user as any)?.exam_type as string | null;
  const isJAM = examType === "JAM";

  const [progress, setProgress] = useState<PracticeProgress>(() =>
    loadProgress(userId),
  );
  const [expandedSubj, setExpandedSubj] = useState<Record<string, boolean>>({});
  const [filterSubject, setFilterSubject] = useState<string>("all");

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

  function updateProgress(next: PracticeProgress) {
    setProgress(next);
    saveProgress(userId, next);
  }

  /* Overall stats */
  const allSubtopics = filteredSyllabus.flatMap((s) =>
    s.topics.flatMap((t) => t.subtopics),
  );
  const totalSubs = allSubtopics.length;
  const practiced = allSubtopics.filter(
    (st) => (progress[st.id]?.attempts.length ?? 0) > 0,
  ).length;
  const totalAttempts = Object.values(progress).reduce(
    (s, e) => s + e.attempts.length,
    0,
  );
  const allLatestAccs = allSubtopics
    .map((st) => getLatest(progress[st.id])?.accuracy ?? null)
    .filter((v) => v !== null) as number[];
  const overallAvgAcc = allLatestAccs.length
    ? Math.round(
        allLatestAccs.reduce((s, v) => s + v, 0) / allLatestAccs.length,
      )
    : null;

  /* Weak areas */
  const weakAreas = allSubtopics
    .map((st) => ({ ...st, latest: getLatest(progress[st.id]) }))
    .filter(
      (st) =>
        st.latest && (st.latest.accuracy < 60 || st.latest.concept === "weak"),
    )
    .slice(0, 5);

  const displaySyllabus =
    filterSubject === "all"
      ? filteredSyllabus
      : filteredSyllabus.filter((s) => s.id === filterSubject);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1
            className="text-3xl font-serif font-bold"
            style={{ color: CHARCOAL }}
          >
            Question Practice
          </h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>
            Track accuracy, concept understanding, and speed — topic by topic.
          </p>
        </div>
        <div
          className="flex items-center gap-4 px-5 py-3 rounded-2xl"
          style={{ background: CARD, border: `1px solid ${BORDER}` }}
        >
          <div className="text-center">
            <div
              className="text-2xl font-bold font-serif"
              style={{ color: OLIVE }}
            >
              {practiced}
            </div>
            <div className="text-xs" style={{ color: MUTED }}>
              of {totalSubs} practiced
            </div>
          </div>
          <div className="w-px h-10" style={{ background: BORDER }} />
          <div className="text-center">
            <div
              className="text-2xl font-bold font-serif"
              style={{ color: GOLD }}
            >
              {totalAttempts}
            </div>
            <div className="text-xs" style={{ color: MUTED }}>
              total attempts
            </div>
          </div>
          {overallAvgAcc !== null && (
            <>
              <div className="w-px h-10" style={{ background: BORDER }} />
              <div className="text-center">
                <div
                  className="text-2xl font-bold font-serif"
                  style={{ color: getAccuracyColor(overallAvgAcc) }}
                >
                  {overallAvgAcc}%
                </div>
                <div className="text-xs" style={{ color: MUTED }}>
                  avg accuracy
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Legend */}
      <div
        className="flex flex-wrap gap-4 px-4 py-3 rounded-2xl"
        style={{ background: CARD, border: `1px solid ${BORDER}` }}
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5" style={{ color: GOLD }} />
          <span className="text-xs font-semibold" style={{ color: CHARCOAL }}>
            Accuracy %
          </span>
        </div>
        <div className="flex items-center gap-3">
          {(
            Object.entries(CONCEPT_CFG) as [
              ConceptLevel,
              (typeof CONCEPT_CFG)[ConceptLevel],
            ][]
          ).map(([, cfg]) => (
            <span
              key={cfg.label}
              className="text-xs"
              style={{ color: cfg.color }}
            >
              {cfg.emoji} {cfg.label}
            </span>
          ))}
          <span className="text-xs font-semibold" style={{ color: CHARCOAL }}>
            Concept
          </span>
        </div>
        <div className="flex items-center gap-3">
          {(
            Object.entries(SPEED_CFG) as [
              SpeedLevel,
              (typeof SPEED_CFG)[SpeedLevel],
            ][]
          ).map(([, cfg]) => (
            <span
              key={cfg.label}
              className="text-xs"
              style={{ color: cfg.color }}
            >
              {cfg.emoji} {cfg.label}
            </span>
          ))}
          <span className="text-xs font-semibold" style={{ color: CHARCOAL }}>
            Speed
          </span>
        </div>
      </div>

      {/* Weak areas */}
      {weakAreas.length > 0 && (
        <div
          className="rounded-2xl p-5"
          style={{ background: "#FDE8E822", border: "1.5px solid #C0392B33" }}
        >
          <h3
            className="font-semibold text-sm mb-3 flex items-center gap-2"
            style={{ color: "#C0392B" }}
          >
            <AlertIcon /> Areas Needing Attention
          </h3>
          <div className="space-y-2">
            {weakAreas.map((st) => {
              const cfg = CONCEPT_CFG[st.latest!.concept];
              return (
                <div
                  key={st.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl"
                  style={{ background: CARD, border: `1px solid #C0392B22` }}
                >
                  <span className="flex-1 text-sm" style={{ color: CHARCOAL }}>
                    {st.name}
                  </span>
                  <span
                    className="text-xs font-bold"
                    style={{ color: getAccuracyColor(st.latest!.accuracy) }}
                  >
                    {st.latest!.accuracy}%
                  </span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full"
                    style={{ background: cfg.bg, color: cfg.color }}
                  >
                    {cfg.emoji} {cfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Subject filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterSubject("all")}
          className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
          style={
            filterSubject === "all"
              ? { background: DARK, color: CREAM }
              : { background: `${BORDER}88`, color: MUTED }
          }
        >
          All Subjects
        </button>
        {filteredSyllabus.map((s) => (
          <button
            key={s.id}
            onClick={() => setFilterSubject(s.id)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={
              filterSubject === s.id
                ? { background: DARK, color: CREAM }
                : { background: `${BORDER}88`, color: MUTED }
            }
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Subjects */}
      {displaySyllabus.map((subject) => {
        const allSubtopicsInSubj = subject.topics.flatMap((t) => t.subtopics);
        const practicedInSubj = allSubtopicsInSubj.filter(
          (st) => (progress[st.id]?.attempts.length ?? 0) > 0,
        ).length;
        const latestAccsInSubj = allSubtopicsInSubj
          .map((st) => getLatest(progress[st.id])?.accuracy ?? null)
          .filter((v) => v !== null) as number[];
        const avgAccInSubj = latestAccsInSubj.length
          ? Math.round(
              latestAccsInSubj.reduce((s, v) => s + v, 0) /
                latestAccsInSubj.length,
            )
          : null;
        const isOpen = expandedSubj[subject.id] ?? false;

        return (
          <div
            key={subject.id}
            className="rounded-2xl overflow-hidden"
            style={{
              background: CARD,
              border: `1px solid ${BORDER}`,
              boxShadow: "0 2px 8px rgba(61,53,48,.05)",
            }}
          >
            {/* Subject header */}
            <button
              onClick={() =>
                setExpandedSubj((p) => ({ ...p, [subject.id]: !p[subject.id] }))
              }
              className="w-full flex items-center gap-4 px-6 py-4 text-left"
              style={{ background: isOpen ? `${SIDEBAR}08` : CARD }}
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <BookOpen
                    className="w-4 h-4 flex-shrink-0"
                    style={{ color: GOLD }}
                  />
                  <span
                    className="font-serif text-base font-bold"
                    style={{ color: CHARCOAL }}
                  >
                    {subject.name}
                  </span>
                  {subject.jamOnly && (
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: `${GOLD}22`, color: SIDEBAR }}
                    >
                      JAM only
                    </span>
                  )}
                  {subject.netOnly && (
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: `${ROSE}33`, color: "#8B3A3A" }}
                    >
                      NET / GATE
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 pl-7">
                  <div
                    className="flex-1 h-1.5 rounded-full overflow-hidden"
                    style={{ background: BORDER }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${totalSubs ? Math.round((practicedInSubj / allSubtopicsInSubj.length) * 100) : 0}%`,
                        background: GOLD,
                      }}
                    />
                  </div>
                  <span
                    className="text-xs font-semibold flex-shrink-0"
                    style={{ color: MUTED }}
                  >
                    {practicedInSubj}/{allSubtopicsInSubj.length} practiced
                    {avgAccInSubj !== null && (
                      <span
                        className="ml-2"
                        style={{ color: getAccuracyColor(avgAccInSubj) }}
                      >
                        · {avgAccInSubj}% avg
                      </span>
                    )}
                  </span>
                </div>
              </div>
              {isOpen ? (
                <ChevronDown
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: MUTED }}
                />
              ) : (
                <ChevronRight
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: MUTED }}
                />
              )}
            </button>

            {/* Topics */}
            {isOpen && (
              <div
                className="px-4 pb-4 space-y-3"
                style={{ borderTop: `1px solid ${BORDER}` }}
              >
                <p className="text-xs pt-3" style={{ color: MUTED }}>
                  Click "+ Topic" to log practice for all subtopics at once, or
                  expand a topic to log individually.
                </p>
                {subject.topics.map((topic) => (
                  <TopicBlock
                    key={topic.id}
                    topic={topic}
                    subjectId={subject.id}
                    progress={progress}
                    userId={userId}
                    onUpdate={updateProgress}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {practiced === 0 && (
        <div
          className="text-center py-16 rounded-2xl"
          style={{ background: CREAM, border: `1.5px dashed ${BORDER}` }}
        >
          <BarChart2
            className="w-10 h-10 mx-auto mb-3 opacity-30"
            style={{ color: GOLD }}
          />
          <p className="text-sm font-medium" style={{ color: CHARCOAL }}>
            No practice logged yet
          </p>
          <p className="text-xs mt-1" style={{ color: MUTED }}>
            Expand any subject → topic → click + to log your first practice
            attempt.
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── Inline alert icon ─────────────────── */
function AlertIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
