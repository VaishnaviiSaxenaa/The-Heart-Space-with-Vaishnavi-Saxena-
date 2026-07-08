import { useState, useEffect } from "react";
import { savePracticeToDB } from "../lib/supabase-sync";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { format } from "date-fns";
import {
  ChevronDown,
  ChevronRight,
  BookOpen,
  TrendingUp,
  Zap,
  Brain,
  Plus,
  Trash2,
  BarChart2,
  History,
} from "lucide-react";
import { SYLLABUS } from "./syllabus";
import GenericCalendar, { GenericSubjectDef } from "./generic-calendar";
import { JAM_SUBJECTS, NET_SUBJECTS } from "./subjects";

/* ─── Brand tokens ─────────────────────── */
const CREAM = "#F8F5F0";
const CHARCOAL = "#2D2A25";
const GOLD = "#C9A84C";
const PROGRESS_PURPLE = "#6B568F";
const DARK = "#2D2A25";
const CARD = "#FFFDF9";
const MUTED = "#7A7267";
const BORDER = "#E5DDD0";
const OLIVE = "#6E8B6B";
const ROSE = "#D4A5A5";
const SIDEBAR = "#2D2A25";

/* ─── Types ────────────────────────────── */
type ConceptLevel = "weak" | "developing" | "strong";
type SpeedLevel = "slow" | "moderate" | "fast";

interface PracticeAttempt {
  id: string;
  date: string;
  accuracy: number;
  concept: number;
  speed: number;
  mistakeCount: number;
  mistakes: string[];
  note?: string;
}
interface PracticeEntry {
  attempts: PracticeAttempt[];
}
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

// Helper to convert numeric concept/speed to legacy config keys
function getConceptKey(val: number | string): ConceptLevel {
  if (typeof val === "string") return val as ConceptLevel;
  if (val >= 70) return "strong";
  if (val >= 40) return "developing";
  return "weak";
}
function getSpeedKey(val: number | string): SpeedLevel {
  if (typeof val === "string") return val as SpeedLevel;
  if (val >= 70) return "fast";
  if (val >= 40) return "moderate";
  return "slow";
}

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
    savePracticeToDB(userId, progress).catch(() => {});
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

/* ─── Attempt Form ─────────────────────── */
function AttemptForm({
  onSave,
  onCancel,
  label,
}: {
  onSave: (attempt: Omit<PracticeAttempt, "id" | "date">) => void;
  onCancel: () => void;
  label?: string;
}) {
  const [accuracy, setAccuracy] = useState(50);
  const [concept, setConcept] = useState(50);
  const [speed, setSpeed] = useState(50);
  const [mistakeCount, setMistakeCount] = useState(0);
  const [mistakes, setMistakes] = useState<string[]>([]);
  const [activeParam, setActiveParam] = useState<"concept"|"accuracy"|"speed"|"mistakes"|null>(null);

  const updateMistake = (i: number, val: string) => {
    const next = [...mistakes];
    next[i] = val;
    setMistakes(next);
  };

  const handleMistakeCount = (n: number) => {
    setMistakeCount(n);
    setMistakes(Array.from({ length: n }, (_, i) => mistakes[i] ?? ""));
  };

  const params = [
    { key: "concept" as const, label: "Concept Understanding", emoji: "🧠", value: concept, color: "#6B568F" },
    { key: "accuracy" as const, label: "Accuracy", emoji: "🎯", value: accuracy, color: "#2C4A73" },
    { key: "speed" as const, label: "Speed", emoji: "⚡", value: speed, color: "#2C4A73" },
    { key: "mistakes" as const, label: "Mistake Recognition", emoji: "🔍", value: mistakeCount, color: "#C0392B" },
  ];

  return (
    <div className="rounded-2xl p-5 space-y-4 mt-2" style={{ background: `${PROGRESS_PURPLE}08`, border: `1.5px solid ${PROGRESS_PURPLE}44` }}>
      {label && <p className="text-xs font-semibold" style={{ color: MUTED }}>{label}</p>}

      {/* 4 Parameter buttons */}
      <div className="grid grid-cols-2 gap-2">
        {params.map(p => (
          <button key={p.key} onClick={() => setActiveParam(activeParam === p.key ? null : p.key)}
            className="flex items-center gap-2 p-3 rounded-xl text-left transition-all"
            style={{
              background: activeParam === p.key ? `${p.color}15` : CARD,
              border: `1.5px solid ${activeParam === p.key ? p.color : BORDER}`,
            }}>
            <span className="text-lg">{p.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold" style={{ color: p.color }}>{p.label}</p>
              <p className="text-sm font-bold" style={{ color: p.color }}>
                {p.key === "mistakes" ? `${mistakeCount} mistake${mistakeCount !== 1 ? "s" : ""}` : `${p.value}%`}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Active param detail */}
      {activeParam && activeParam !== "mistakes" && (() => {
        const p = params.find(x => x.key === activeParam)!;
        const setter = activeParam === "concept" ? setConcept : activeParam === "accuracy" ? setAccuracy : setSpeed;
        return (
          <div className="p-4 rounded-xl" style={{ background: `${p.color}10`, border: `1px solid ${p.color}30` }}>
            <p className="text-xs font-bold mb-3" style={{ color: p.color }}>{p.emoji} {p.label}</p>
            <div className="flex items-center gap-3">
              <input type="range" min={0} max={100} step={1} value={p.value}
                onChange={e => setter(parseInt(e.target.value))}
                className="flex-1" style={{ accentColor: p.color }} />
              <span className="text-base font-bold w-12 text-right" style={{ color: p.color }}>{p.value}%</span>
            </div>
            <div className="flex justify-between text-[9px] mt-1" style={{ color: MUTED }}>
              <span>Needs Work</span><span>Average</span><span>Excellent</span>
            </div>
          </div>
        );
      })()}

      {/* Mistakes detail */}
      {activeParam === "mistakes" && (
        <div className="p-4 rounded-xl" style={{ background: "#C0392B10", border: "1px solid #C0392B30" }}>
          <p className="text-xs font-bold mb-3" style={{ color: "#C0392B" }}>🔍 Mistake Recognition</p>
          <div className="mb-3">
            <p className="text-[10px] font-semibold mb-1.5" style={{ color: MUTED }}>How many mistakes are you making?</p>
            <div className="flex gap-1.5 flex-wrap">
              {[0,1,2,3,4,5].map(n => (
                <button key={n} onClick={() => handleMistakeCount(n)}
                  className="w-8 h-8 rounded-lg text-xs font-bold"
                  style={{ background: mistakeCount === n ? "#C0392B" : CARD, color: mistakeCount === n ? "#fff" : CHARCOAL, border: `1.5px solid ${mistakeCount === n ? "#C0392B" : BORDER}` }}>
                  {n === 5 ? "5+" : n}
                </button>
              ))}
            </div>
          </div>
          {mistakeCount > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold" style={{ color: MUTED }}>Describe each mistake:</p>
              {Array.from({ length: mistakeCount }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[10px] font-bold w-4" style={{ color: "#C0392B" }}>{i+1}.</span>
                  <input
                    type="text"
                    placeholder={`Mistake ${i+1}...`}
                    value={mistakes[i] ?? ""}
                    onChange={e => updateMistake(i, e.target.value)}
                    className="flex-1 px-2 py-1.5 rounded-lg text-xs outline-none"
                    style={{ background: CARD, border: `1px solid ${BORDER}` }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Save/Cancel */}
      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="flex-1 py-2 rounded-xl text-xs font-semibold"
          style={{ background: CREAM, color: MUTED, border: `1px solid ${BORDER}` }}>
          Cancel
        </button>
        <button onClick={() => onSave({ accuracy, concept, speed, mistakeCount, mistakes: mistakes.filter(Boolean), note: "" })}
          className="flex-1 py-2 rounded-xl text-xs font-bold text-white"
          style={{ background: PROGRESS_PURPLE }}>
          Save
        </button>
      </div>
    </div>
  );
}


function AttemptCard({
  attempt,
  isLatest,
  onDelete,
}: {
  attempt: PracticeAttempt;
  isLatest: boolean;
  onDelete: () => void;
}) {
  const conceptCfg = CONCEPT_CFG[getConceptKey(attempt.concept)];
  const speedCfg = SPEED_CFG[getSpeedKey(attempt.speed)];
  return (
    <div
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
          onClick={onDelete}
          className="ml-auto p-1 rounded-lg opacity-40 hover:opacity-100 transition-opacity"
          style={{ color: "#C0392B" }}
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#2C4A7322", color: "#2C4A73" }}>
          🎯 Accuracy: {attempt.accuracy}%
        </span>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#6B568F22", color: "#6B568F" }}>
          🧠 Concept: {typeof attempt.concept === "number" ? `${attempt.concept}%` : attempt.concept}
        </span>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#2C4A7322", color: "#2C4A73" }}>
          ⚡ Speed: {typeof attempt.speed === "number" ? `${attempt.speed}%` : attempt.speed}
        </span>
        {(attempt.mistakeCount ?? 0) > 0 && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#C0392B22", color: "#C0392B" }}>
            🔍 {attempt.mistakeCount} mistake{attempt.mistakeCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>
      {attempt.mistakes && attempt.mistakes.length > 0 && (
        <div className="mt-2 space-y-1">
          {attempt.mistakes.map((m, i) => m && (
            <p key={i} className="text-[10px] italic" style={{ color: MUTED }}>
              {i+1}. {m}
            </p>
          ))}
        </div>
      )}
      {attempt.note && (
        <p className="text-[10px] mt-2 italic" style={{ color: MUTED }}>
          "{attempt.note}"
        </p>
      )}
    </div>
  );
}

/* ─── Subject History View ─────────────── */
function SubjectHistory({
  subject,
  progress,
  onDelete,
}: {
  subject: {
    topics: {
      id: string;
      name: string;
      subtopics: { id: string; name: string }[];
    }[];
  };
  progress: PracticeProgress;
  onDelete: (stId: string, attemptId: string) => void;
}) {
  /* Collect all attempts across all subtopics with subtopic name */
  const allAttempts: {
    subtopicName: string;
    stId: string;
    attempt: PracticeAttempt;
  }[] = [];
  subject.topics.forEach((topic) => {
    topic.subtopics.forEach((st) => {
      const entry = progress[st.id];
      if (entry) {
        entry.attempts.forEach((attempt) => {
          allAttempts.push({ subtopicName: st.name, stId: st.id, attempt });
        });
      }
    });
  });

  /* Sort by date descending */
  allAttempts.sort((a, b) => b.attempt.date.localeCompare(a.attempt.date));

  if (allAttempts.length === 0) {
    return (
      <div
        className="text-center py-10 rounded-2xl"
        style={{ background: CREAM, border: `1.5px dashed ${BORDER}` }}
      >
        <History
          className="w-8 h-8 mx-auto mb-2 opacity-30"
          style={{ color: PROGRESS_PURPLE }}
        />
        <p className="text-sm" style={{ color: MUTED }}>
          No attempts logged yet for this subject.
        </p>
      </div>
    );
  }

  /* Group by date (day) */
  const byDay: Record<string, typeof allAttempts> = {};
  allAttempts.forEach((item) => {
    const day = format(new Date(item.attempt.date), "MMMM d, yyyy");
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(item);
  });

  return (
    <div className="space-y-4">
      <p className="text-xs" style={{ color: MUTED }}>
        {allAttempts.length} total attempt(s) across all subtopics — newest
        first.
      </p>
      {Object.entries(byDay).map(([day, items]) => (
        <div key={day}>
          <p
            className="text-[10px] font-bold uppercase tracking-wide mb-2"
            style={{ color: MUTED }}
          >
            {day}
          </p>
          <div className="space-y-2">
            {items.map(({ subtopicName, stId, attempt }) => {
              const conceptCfg = CONCEPT_CFG[getConceptKey(attempt.concept)];
              const speedCfg = SPEED_CFG[getSpeedKey(attempt.speed)];
              return (
                <div
                  key={attempt.id}
                  className="rounded-xl px-4 py-3"
                  style={{ background: CARD, border: `1px solid ${BORDER}` }}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <p
                        className="text-xs font-semibold mb-1.5"
                        style={{ color: CHARCOAL }}
                      >
                        {subtopicName}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#2C4A7322", color: "#2C4A73" }}>
                          🎯 {attempt.accuracy}%
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#6B568F22", color: "#6B568F" }}>
                          🧠 {typeof attempt.concept === "number" ? `${attempt.concept}%` : attempt.concept}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#2C4A7322", color: "#2C4A73" }}>
                          ⚡ {typeof attempt.speed === "number" ? `${attempt.speed}%` : attempt.speed}
                        </span>
                        {(attempt.mistakeCount ?? 0) > 0 && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#C0392B22", color: "#C0392B" }}>
                            🔍 {attempt.mistakeCount} mistake{attempt.mistakeCount !== 1 ? "s" : ""}
                          </span>
                        )}
                        <span className="text-[10px]" style={{ color: MUTED }}>
                          {format(new Date(attempt.date), "h:mm a")}
                        </span>
                      </div>
                      {attempt.mistakes && attempt.mistakes.filter(Boolean).length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {attempt.mistakes.filter(Boolean).map((m, i) => (
                            <p key={i} className="text-[10px] italic" style={{ color: "#C0392B" }}>
                              {i+1}. {m}
                            </p>
                          ))}
                        </div>
                      )}
                      {attempt.note && (
                        <p
                          className="text-[10px] mt-1 italic"
                          style={{ color: MUTED }}
                        >
                          "{attempt.note}"
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => onDelete(stId, attempt.id)}
                      className="p-1 rounded-lg opacity-40 hover:opacity-100 transition-opacity flex-shrink-0"
                      style={{ color: "#C0392B" }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Subtopic Row ─────────────────────── */
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
  const [showMistakes, setShowMistakes] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const latest = getLatest(entry);
  const attemptCount = entry?.attempts.length ?? 0;
  const conceptCfg = latest ? CONCEPT_CFG[getConceptKey(latest.concept)] : null;
  const speedCfg = latest ? SPEED_CFG[getSpeedKey(latest.speed)] : null;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: latest ? `${OLIVE}06` : CREAM,
        border: `1px solid ${latest ? OLIVE : BORDER}33`,
      }}
    >
      <div className="flex items-center gap-3 px-4 py-2.5">
        <div
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: latest ? OLIVE : BORDER }}
        />
        <span className="flex-1 text-sm" style={{ color: CHARCOAL }}>
          {stName}
        </span>
        {latest && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className="text-xs font-bold font-serif"
              style={{ color: getAccuracyColor(latest.accuracy) }}
            >
              {latest.accuracy}%
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "#6B568F22", color: "#6B568F" }}>
              🧠 {typeof latest.concept === "number" ? `${latest.concept}%` : latest.concept}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "#2C4A7322", color: "#2C4A73" }}>
              ⚡ {typeof latest.speed === "number" ? `${latest.speed}%` : latest.speed}
            </span>
            {(latest.mistakeCount ?? 0) > 0 && (
              <button onClick={() => setShowMistakes(s => !s)}
                className="text-[10px] px-1.5 py-0.5 rounded-full cursor-pointer"
                style={{ background: "#C0392B22", color: "#C0392B", border: "none" }}>
                🔍 {latest.mistakeCount} mistake{latest.mistakeCount !== 1 ? "s" : ""} {showMistakes ? "▲" : "▼"}
              </button>
            )}
            {attemptCount > 0 && (
              <button onClick={() => setShowHistory(s => !s)}
                className="text-[10px] px-1.5 py-0.5 rounded-full cursor-pointer"
                style={{ background: `${PROGRESS_PURPLE}22`, color: DARK, border: "none" }}
              >
                {attemptCount} attempt{attemptCount > 1 ? "s" : ""} {showHistory ? "▲" : "▼"}
              </button>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all hover:scale-110"
          style={{
            background: showForm ? PROGRESS_PURPLE : `${PROGRESS_PURPLE}22`,
            color: showForm ? "#fff" : DARK,
          }}
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
      {showMistakes && latest?.mistakes && latest.mistakes.filter(Boolean).length > 0 && (
        <div className="px-4 pb-2">
          <div className="p-2 rounded-lg" style={{ background: "#C0392B08", border: "1px solid #C0392B22" }}>
            {latest.mistakes.filter(Boolean).map((m, i) => (
              <p key={i} className="text-[10px] italic" style={{ color: "#C0392B" }}>{i+1}. {m}</p>
            ))}
          </div>
        </div>
      )}
      {showHistory && entry && entry.attempts.length > 0 && (
        <div className="px-4 pb-2">
          <div className="space-y-1.5 p-2 rounded-lg" style={{ background: `${PROGRESS_PURPLE}08`, border: `1px solid ${PROGRESS_PURPLE}22` }}>
            <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: MUTED }}>Attempt History</p>
            {[...entry.attempts].reverse().map((a, i) => (
              <div key={a.id} className="flex items-center gap-2 flex-wrap py-1" style={{ borderBottom: i < entry.attempts.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                <span className="text-[10px] font-semibold" style={{ color: MUTED }}>{new Date(a.date).toLocaleDateString("en-IN", {day:"2-digit",month:"short",year:"2-digit"})}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "#2C4A7322", color: "#2C4A73" }}>🎯 {a.accuracy}%</span>
                {typeof a.concept === "number" && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "#6B568F22", color: "#6B568F" }}>🧠 {a.concept}%</span>}
                {typeof a.speed === "number" && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "#2C4A7322", color: "#2C4A73" }}>⚡ {a.speed}%</span>}
                {(a.mistakeCount ?? 0) > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "#C0392B22", color: "#C0392B" }}>🔍 {a.mistakeCount}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
      {showForm && (
        <div className="px-4 pb-3">
          <AttemptForm
            onSave={(attempt) => {
              onAdd(attempt);
              setShowForm(false);
            }}
            onCancel={() => setShowForm(false)}
          />
          {/* History tab */}
          {activeTab === "history" && (
            <div className="px-5 pb-5 pt-3 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: MUTED }}>All Attempts — Latest First</p>
              {allSubtopicsInSubj.map((st) => {
                const entry = progress[st.id];
                if (!entry || entry.attempts.length === 0) return null;
                return (
                  <div key={st.id} className="rounded-xl p-3" style={{ background: CREAM, border: `1px solid ${BORDER}` }}>
                    <p className="text-xs font-bold mb-2" style={{ color: CHARCOAL }}>{st.name}</p>
                    {[...entry.attempts].reverse().map((a, i) => (
                      <div key={a.id} className="flex items-center gap-2 flex-wrap py-1.5" style={{ borderTop: i > 0 ? `1px solid ${BORDER}` : "none" }}>
                        <span className="text-[10px] font-semibold w-16" style={{ color: MUTED }}>{new Date(a.date).toLocaleDateString("en-IN", {day:"2-digit",month:"short"})}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: `${OLIVE}22`, color: OLIVE }}>🎯 {a.accuracy}%</span>
                        {typeof a.concept === "number" && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "#6B568F22", color: "#6B568F" }}>🧠 {a.concept}%</span>}
                        {typeof a.speed === "number" && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "#2C4A7322", color: "#2C4A73" }}>⚡ {a.speed}%</span>}
                        {(a.mistakeCount ?? 0) > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "#C0392B22", color: "#C0392B" }}>🔍 {a.mistakeCount}</span>}
                        {a.mistakes?.filter(Boolean).map((m, mi) => (
                          <span key={mi} className="text-[10px] italic" style={{ color: "#C0392B" }}>{mi+1}. {m}</span>
                        ))}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Topic Block ──────────────────────── */
function TopicBlock({
  topic,
  progress,
  onUpdate,
}: {
  topic: {
    id: string;
    name: string;
    subtopics: { id: string; name: string }[];
  };
  progress: PracticeProgress;
  onUpdate: (next: PracticeProgress) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showTopicForm, setShowTopicForm] = useState(false);
  const [showTopicMistakes, setShowTopicMistakes] = useState(false);
  const [showTopicHistory, setShowTopicHistory] = useState(false);

  const subtopicEntries = topic.subtopics.map((st) => progress[st.id]);
  const topicEntry = progress[`topic_${topic.id}`];
  const attempted = subtopicEntries.filter(
    (e) => e && e.attempts.length > 0,
  ).length;
  // Use topic-level entry for stats if available, else aggregate subtopics
  const latestTopicAttempt = getLatest(topicEntry);
  const latestAccs = latestTopicAttempt
    ? [latestTopicAttempt.accuracy]
    : subtopicEntries.map((e) => getLatest(e)?.accuracy ?? null).filter((v) => v !== null) as number[];
  const avgAcc = latestAccs.length
    ? Math.round(latestAccs.reduce((s, v) => s + v, 0) / latestAccs.length)
    : null;
  const conceptOrder: ConceptLevel[] = ["weak", "developing", "strong"];
  const speedOrder: SpeedLevel[] = ["slow", "moderate", "fast"];
  const latestConcepts = latestTopicAttempt
    ? (typeof latestTopicAttempt.concept === "number" ? [latestTopicAttempt.concept] : [])
    : subtopicEntries.map((e) => getLatest(e)?.concept).filter((v) => typeof v === "number") as number[];
  const latestSpeeds = latestTopicAttempt
    ? (typeof latestTopicAttempt.speed === "number" ? [latestTopicAttempt.speed] : [])
    : subtopicEntries.map((e) => getLatest(e)?.speed).filter((v) => typeof v === "number") as number[];
  const totalMistakeCount = latestTopicAttempt
    ? (latestTopicAttempt.mistakeCount ?? 0)
    : subtopicEntries.filter(Boolean).reduce((a, e) => a + (getLatest(e)?.mistakeCount ?? 0), 0);
  const avgConcept = latestConcepts.length ? Math.round(latestConcepts.reduce((a,b) => a+b, 0) / latestConcepts.length) : null;
  const avgSpeed = latestSpeeds.length ? Math.round(latestSpeeds.reduce((a,b) => a+b, 0) / latestSpeeds.length) : null;
  const worstConcept = latestConcepts.length
    ? latestConcepts.reduce((a, b) => a < b ? a : b)
    : null;
  const worstSpeed = latestSpeeds.length
    ? latestSpeeds.reduce((a, b) => a < b ? a : b,
      )
    : null;

  function addTopicAttempt(attempt: Omit<PracticeAttempt, "id" | "date">) {
    const now = new Date().toISOString();
    const topicKey = `topic_${topic.id}`;
    const prev = progress[topicKey] ?? { attempts: [] };
    onUpdate({
      ...progress,
      [topicKey]: {
        attempts: [
          ...prev.attempts,
          { id: `${Date.now()}_${topicKey}`, date: now, ...attempt },
        ],
      },
    });
  }

  function addSubtopicAttempt(
    stId: string,
    attempt: Omit<PracticeAttempt, "id" | "date">,
  ) {
    const now = new Date().toISOString();
    const prev = progress[stId] ?? { attempts: [] };
    onUpdate({
      ...progress,
      [stId]: {
        attempts: [
          ...prev.attempts,
          { id: `${Date.now()}_${stId}`, date: now, ...attempt },
        ],
      },
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
      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{ background: expanded ? `${PROGRESS_PURPLE}06` : CREAM }}
      >
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
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {attempted > 0 && avgAcc !== null ? (
            <>
              <span
                className="text-xs font-bold font-serif"
                style={{ color: getAccuracyColor(avgAcc) }}
              >
                {avgAcc}%
              </span>
              {avgConcept !== null && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "#6B568F22", color: "#6B568F" }}>
                  🧠 {avgConcept}%
                </span>
              )}
              {avgSpeed !== null && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "#2C4A7322", color: "#2C4A73" }}>
                  ⚡ {avgSpeed}%
                </span>
              )}
              {totalMistakeCount > 0 && (
                <button onClick={() => setShowTopicMistakes(s => !s)}
                  className="text-[10px] px-1.5 py-0.5 rounded-full cursor-pointer"
                  style={{ background: "#C0392B22", color: "#C0392B", border: "none" }}>
                  🔍 {totalMistakeCount} mistake{totalMistakeCount !== 1 ? "s" : ""} {showTopicMistakes ? "▲" : "▼"}
                </button>
              )}
              {(() => {
                const topicAttempts = (progress[`topic_${topic.id}`]?.attempts.length ?? 0) + topic.subtopics.reduce((sum, st) => sum + (progress[st.id]?.attempts.length ?? 0), 0);
                return topicAttempts > 0 ? (
                  <button onClick={() => setShowTopicHistory(s => !s)}
                    className="text-[10px] px-1.5 py-0.5 rounded-full cursor-pointer"
                    style={{ background: `${PROGRESS_PURPLE}22`, color: CHARCOAL, border: "none" }}>
                    {topicAttempts} attempt{topicAttempts !== 1 ? "s" : ""} {showTopicHistory ? "▲" : "▼"}
                  </button>
                ) : null;
              })()}
            </>
          ) : (
            <span
              className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: `${BORDER}88`, color: MUTED }}
            >
              Not started
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            setShowTopicForm(!showTopicForm);
            setExpanded(true);
          }}
          title="Log practice for entire topic"
          className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all"
          style={{
            background: showTopicForm ? PROGRESS_PURPLE : `${PROGRESS_PURPLE}22`,
            color: showTopicForm ? "#fff" : DARK,
          }}
        >
          <Plus className="w-3 h-3" /> Topic
        </button>
      </div>

      {showTopicForm && (
        <div className="px-4 pb-3" style={{ background: CREAM }}>
          <AttemptForm
            label={`Logging for all ${topic.subtopics.length} subtopics in "${topic.name}"`}
            onSave={(attempt) => {
              addTopicAttempt(attempt);
              setShowTopicForm(false);
            }}
            onCancel={() => setShowTopicForm(false)}
          />
        </div>
      )}

      {showTopicMistakes && (
        <div className="mx-4 mb-2 p-2 rounded-lg" style={{ background: "#C0392B08", border: "1px solid #C0392B22" }}>
          <p className="text-[10px] font-bold mb-1" style={{ color: "#C0392B" }}>Recent Mistakes</p>
          {latestTopicAttempt?.mistakes?.filter(Boolean).length ? (
            latestTopicAttempt.mistakes.filter(Boolean).map((m, i) => (
              <p key={i} className="text-[10px] italic ml-2" style={{ color: "#C0392B" }}>{i+1}. {m}</p>
            ))
          ) : (
            topic.subtopics.map(st => {
              const latest = getLatest(progress[st.id]);
              if (!latest?.mistakes?.filter(Boolean).length) return null;
              return (
                <div key={st.id} className="mb-1">
                  <p className="text-[10px] font-semibold" style={{ color: CHARCOAL }}>{st.name}:</p>
                  {latest.mistakes.filter(Boolean).map((m, i) => (
                    <p key={i} className="text-[10px] italic ml-2" style={{ color: "#C0392B" }}>{i+1}. {m}</p>
                  ))}
                </div>
              );
            })
          )}
        </div>
      )}
      {showTopicHistory && (
        <div className="mx-4 mb-2 p-3 rounded-lg space-y-2" style={{ background: `${PROGRESS_PURPLE}06`, border: `1px solid ${PROGRESS_PURPLE}22` }}>
          <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>Attempt History</p>
          {topicEntry && topicEntry.attempts.length > 0 && (
            <div className="rounded-lg p-2 mb-1" style={{ background: CREAM, border: `1px solid ${BORDER}` }}>
              <p className="text-[10px] font-bold mb-1" style={{ color: CHARCOAL }}>Topic-level attempts</p>
              {[...topicEntry.attempts].reverse().map((a, i) => (
                <div key={a.id} className="flex items-center gap-1.5 flex-wrap py-1" style={{ borderTop: i > 0 ? `1px solid ${BORDER}` : "none" }}>
                  <span className="text-[10px] font-semibold w-14" style={{ color: MUTED }}>{new Date(a.date).toLocaleDateString("en-IN",{day:"2-digit",month:"short"})}</span>
                  <span className="text-[10px] px-1 py-0.5 rounded-full" style={{ background: `${OLIVE}22`, color: OLIVE }}>🎯{a.accuracy}%</span>
                  {typeof a.concept === "number" && <span className="text-[10px] px-1 py-0.5 rounded-full" style={{ background: "#6B568F22", color: "#6B568F" }}>🧠{a.concept}%</span>}
                  {typeof a.speed === "number" && <span className="text-[10px] px-1 py-0.5 rounded-full" style={{ background: "#2C4A7322", color: "#2C4A73" }}>⚡{a.speed}%</span>}
                  {(a.mistakeCount ?? 0) > 0 && <span className="text-[10px] px-1 py-0.5 rounded-full" style={{ background: "#C0392B22", color: "#C0392B" }}>🔍{a.mistakeCount}</span>}
                  {a.mistakes?.filter(Boolean).map((m, mi) => (
                    <p key={mi} className="text-[10px] italic w-full" style={{ color: "#C0392B", marginLeft: "3.5rem" }}>{mi+1}. {m}</p>
                  ))}
                </div>
              ))}
            </div>
          )}
          {topic.subtopics.map(st => {
            const entry = progress[st.id];
            if (!entry || entry.attempts.length === 0) return null;
            return (
              <div key={st.id} className="rounded-lg p-2 mb-1" style={{ background: CREAM, border: `1px solid ${BORDER}` }}>
                <p className="text-[10px] font-bold mb-1" style={{ color: CHARCOAL }}>{st.name}</p>
                {[...entry.attempts].reverse().map((a, i) => (
                  <div key={a.id} className="flex items-center gap-1.5 flex-wrap py-1" style={{ borderTop: i > 0 ? `1px solid ${BORDER}` : "none" }}>
                    <span className="text-[10px] font-semibold w-14" style={{ color: MUTED }}>{new Date(a.date).toLocaleDateString("en-IN",{day:"2-digit",month:"short"})}</span>
                    <span className="text-[10px] px-1 py-0.5 rounded-full" style={{ background: `${OLIVE}22`, color: OLIVE }}>🎯{a.accuracy}%</span>
                    {typeof a.concept === "number" && <span className="text-[10px] px-1 py-0.5 rounded-full" style={{ background: "#6B568F22", color: "#6B568F" }}>🧠{a.concept}%</span>}
                    {typeof a.speed === "number" && <span className="text-[10px] px-1 py-0.5 rounded-full" style={{ background: "#2C4A7322", color: "#2C4A73" }}>⚡{a.speed}%</span>}
                    {(a.mistakeCount ?? 0) > 0 && <span className="text-[10px] px-1 py-0.5 rounded-full" style={{ background: "#C0392B22", color: "#C0392B" }}>🔍{a.mistakeCount}</span>}
                    {a.mistakes?.filter(Boolean).map((m, mi) => (
                      <p key={mi} className="text-[10px] italic w-full" style={{ color: "#C0392B", marginLeft: "3.5rem" }}>{mi+1}. {m}</p>
                    ))}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
      
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

/* ─── Subject Block ────────────────────── */
function SubjectBlock({
  subject,
  progress,
  onUpdate,
  totalSubs,
}: {
  subject: {
    id: string;
    name: string;
    jamOnly?: boolean;
    netOnly?: boolean;
    topics: {
      id: string;
      name: string;
      subtopics: { id: string; name: string }[];
    }[];
  };
  progress: PracticeProgress;
  onUpdate: (next: PracticeProgress) => void;
  totalSubs: number;
}) {
  const [activeTab, setActiveTab] = useState<"overview" | "history">(
    "overview",
  );
  const [isOpen, setIsOpen] = useState(false);
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [showSubjMistakes, setShowSubjMistakes] = useState(false);
  const [showSubjHistory, setShowSubjHistory] = useState(false);

  const allSubtopicsInSubj = subject.topics.flatMap((t) => t.subtopics);
  const practicedInSubj = allSubtopicsInSubj.filter(
    (st) => (progress[st.id]?.attempts.length ?? 0) > 0,
  ).length;
  const latestAccsInSubj = allSubtopicsInSubj
    .map((st) => getLatest(progress[st.id])?.accuracy ?? null)
    .filter((v) => v !== null) as number[];
  const avgAccInSubj = latestAccsInSubj.length
    ? Math.round(
        latestAccsInSubj.reduce((s, v) => s + v, 0) / latestAccsInSubj.length,
      )
    : null;
  const latestConceptsInSubj = allSubtopicsInSubj
    .map((st) => getLatest(progress[st.id])?.concept)
    .filter((v) => typeof v === "number") as number[];
  const avgConceptInSubj = latestConceptsInSubj.length
    ? Math.round(latestConceptsInSubj.reduce((a,b) => a+b, 0) / latestConceptsInSubj.length)
    : null;
  const latestSpeedsInSubj = allSubtopicsInSubj
    .map((st) => getLatest(progress[st.id])?.speed)
    .filter((v) => typeof v === "number") as number[];
  const avgSpeedInSubj = latestSpeedsInSubj.length
    ? Math.round(latestSpeedsInSubj.reduce((a,b) => a+b, 0) / latestSpeedsInSubj.length)
    : null;
  const totalMistakesInSubj = allSubtopicsInSubj
    .reduce((sum, st) => sum + (getLatest(progress[st.id])?.mistakeCount ?? 0), 0);

  const subjEntry = progress[`subject_${subject.id}`];
  const latestSubjAttempt = getLatest(subjEntry);
  const avgConceptInSubjFinal = latestSubjAttempt && typeof latestSubjAttempt.concept === "number"
    ? latestSubjAttempt.concept : avgConceptInSubj;
  const avgSpeedInSubjFinal = latestSubjAttempt && typeof latestSubjAttempt.speed === "number"
    ? latestSubjAttempt.speed : avgSpeedInSubj;
  const totalMistakesInSubjFinal = latestSubjAttempt
    ? (latestSubjAttempt.mistakeCount ?? 0) : totalMistakesInSubj;
  const subjAttemptCount = subjEntry?.attempts.length ?? 0;

  /* Mark entire subject as 100% Strong Fast */
  function markSubjectBest() {
    const now = new Date().toISOString();
    const next = { ...progress };
    allSubtopicsInSubj.forEach((st) => {
      const prev = next[st.id] ?? { attempts: [] };
      next[st.id] = {
        attempts: [
          ...prev.attempts,
          {
            id: `${Date.now()}_${st.id}`,
            date: now,
            accuracy: 100,
            concept: "strong" as ConceptLevel,
            speed: "fast" as SpeedLevel,
            note: "Marked complete from subject level",
          },
        ],
      };
    });
    onUpdate(next);
  }

  function deleteAttempt(stId: string, attemptId: string) {
    const prev = progress[stId] ?? { attempts: [] };
    onUpdate({
      ...progress,
      [stId]: { attempts: prev.attempts.filter((a) => a.id !== attemptId) },
    });
  }

  function addSubjectAttempt(attempt: Omit<PracticeAttempt, "id" | "date">) {
    const now = new Date().toISOString();
    const next = { ...progress };
    allSubtopicsInSubj.forEach((st) => {
      const prev = next[st.id] ?? { attempts: [] };
      next[st.id] = {
        attempts: [
          ...prev.attempts,
          { id: `${Date.now()}_${st.id}`, date: now, ...attempt },
        ],
      };
    });
    onUpdate(next);
    setShowSubjectForm(false);
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: CARD,
        border: `1px solid ${BORDER}`,
        boxShadow: "0 2px 8px rgba(61,53,48,.05)",
      }}
    >
      {/* Subject header */}
      <div
        className="flex items-center gap-3 px-6 py-4"
        style={{ background: isOpen ? `${SIDEBAR}08` : CARD }}
      >
        {/* Expand toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex flex-1 items-center gap-3 text-left"
        >
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <BookOpen
                className="w-4 h-4 flex-shrink-0"
                style={{ color: PROGRESS_PURPLE }}
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
                  style={{ background: `${PROGRESS_PURPLE}22`, color: SIDEBAR }}
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
                    width: `${allSubtopicsInSubj.length ? Math.round((practicedInSubj / allSubtopicsInSubj.length) * 100) : 0}%`,
                    background: PROGRESS_PURPLE,
                  }}
                />
              </div>
              <span
                className="text-xs font-semibold flex-shrink-0"
                style={{ color: MUTED }}
              >
                {practicedInSubj}/{allSubtopicsInSubj.length} practiced
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
              {avgAccInSubj !== null && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: `${OLIVE}22`, color: OLIVE }}>
                  🎯 {avgAccInSubj}%
                </span>
              )}
              {avgConceptInSubj !== null && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "#6B568F22", color: "#6B568F" }}>
                  🧠 {avgConceptInSubjFinal}%
                </span>
              )}
              {avgSpeedInSubj !== null && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "#2C4A7322", color: "#2C4A73" }}>
                  ⚡ {avgSpeedInSubjFinal}%
                </span>
              )}
              {totalMistakesInSubjFinal > 0 && (
                <button onClick={() => setShowSubjMistakes(s => !s)}
                  className="text-[10px] px-1.5 py-0.5 rounded-full cursor-pointer"
                  style={{ background: "#C0392B22", color: "#C0392B", border: "none" }}>
                  🔍 {totalMistakesInSubjFinal} mistake{totalMistakesInSubj !== 1 ? "s" : ""} {showSubjMistakes ? "▲" : "▼"}
                </button>
              )}
              {subjAttemptCount > 0 && (
                <button onClick={() => setShowSubjHistory(s => !s)}
                  className="text-[10px] px-1.5 py-0.5 rounded-full cursor-pointer"
                  style={{ background: `${PROGRESS_PURPLE}22`, color: CHARCOAL, border: "none" }}>
                  {subjAttemptCount} attempt{subjAttemptCount !== 1 ? "s" : ""} {showSubjHistory ? "▲" : "▼"}
                </button>
              )}
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

        {/* Subject-level quick mark button */}
        

        {/* Log custom attempt for whole subject */}
        <button
          type="button"
          onClick={() => {
            setShowSubjectForm(!showSubjectForm);
            setIsOpen(true);
          }}
          title="Log custom attempt for entire subject"
          className="flex-shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-xl text-[10px] font-semibold transition-all"
          style={{
            background: showSubjectForm ? PROGRESS_PURPLE : `${PROGRESS_PURPLE}22`,
            color: showSubjectForm ? "#fff" : DARK,
          }}
        >
          <Plus className="w-3 h-3" /> Subject
        </button>
      </div>

      {/* Subject mistakes expansion */}
      {showSubjMistakes && latestSubjAttempt && (
        <div className="px-5 py-2">
          <div className="p-2 rounded-lg" style={{ background: "#C0392B08", border: "1px solid #C0392B22" }}>
            <p className="text-[10px] font-bold mb-1" style={{ color: "#C0392B" }}>Recent Mistakes</p>
            {latestSubjAttempt.mistakes?.filter(Boolean).length ? (
              latestSubjAttempt.mistakes.filter(Boolean).map((m, i) => (
                <p key={i} className="text-[10px] italic" style={{ color: "#C0392B" }}>{i+1}. {m}</p>
              ))
            ) : <p className="text-[10px]" style={{ color: MUTED }}>No mistakes recorded.</p>}
          </div>
        </div>
      )}
      {/* Subject history expansion */}
      {showSubjHistory && subjEntry && (
        <div className="px-5 py-2">
          <div className="p-3 rounded-lg" style={{ background: `${PROGRESS_PURPLE}06`, border: `1px solid ${PROGRESS_PURPLE}22` }}>
            <p className="text-[10px] font-bold uppercase mb-2" style={{ color: MUTED }}>Subject Attempt History</p>
            {[...subjEntry.attempts].reverse().map((a, i) => (
              <div key={a.id} className="flex items-center gap-1.5 flex-wrap py-1.5" style={{ borderTop: i > 0 ? `1px solid ${BORDER}` : "none" }}>
                <span className="text-[10px] font-semibold w-14" style={{ color: MUTED }}>{new Date(a.date).toLocaleDateString("en-IN",{day:"2-digit",month:"short"})}</span>
                <span className="text-[10px] px-1 py-0.5 rounded-full" style={{ background: `${OLIVE}22`, color: OLIVE }}>🎯{a.accuracy}%</span>
                {typeof a.concept === "number" && <span className="text-[10px] px-1 py-0.5 rounded-full" style={{ background: "#6B568F22", color: "#6B568F" }}>🧠{a.concept}%</span>}
                {typeof a.speed === "number" && <span className="text-[10px] px-1 py-0.5 rounded-full" style={{ background: "#2C4A7322", color: "#2C4A73" }}>⚡{a.speed}%</span>}
                {(a.mistakeCount ?? 0) > 0 && <span className="text-[10px] px-1 py-0.5 rounded-full" style={{ background: "#C0392B22", color: "#C0392B" }}>🔍{a.mistakeCount}</span>}
                {a.mistakes?.filter(Boolean).map((m, mi) => (
                  <p key={mi} className="text-[10px] italic w-full ml-14" style={{ color: "#C0392B" }}>{mi+1}. {m}</p>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Subject-level custom form */}
      {showSubjectForm && (
        <div
          className="px-6 pb-4"
          style={{ background: CREAM, borderTop: `1px solid ${BORDER}` }}
        >
          <AttemptForm
            label={`Logging for all ${allSubtopicsInSubj.length} subtopics in "${subject.name}"`}
            onSave={addSubjectAttempt}
            onCancel={() => setShowSubjectForm(false)}
          />
        </div>
      )}

      {/* Tabs + content */}
      {isOpen && (
        <div style={{ borderTop: `1px solid ${BORDER}` }}>
          {/* Tab pills */}
          <div className="flex gap-2 px-5 pt-4">
            {(["overview"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={
                  activeTab === tab
                    ? { background: DARK, color: CREAM }
                    : { background: `${BORDER}88`, color: MUTED }
                }
              >
                {tab === "overview" ? "📋 Overview" : "📅 History"}
              </button>
            ))}
          </div>

          {/* Overview tab */}
          {activeTab === "overview" && (
            <div className="px-5 pb-5 pt-3 space-y-3">
              <p className="text-xs" style={{ color: MUTED }}>
                Click "+ Topic" on any topic to log for all its subtopics, or
                expand to log individually.
              </p>
              {subject.topics.map((topic) => (
                <TopicBlock
                  key={topic.id}
                  topic={topic}
                  progress={progress}
                  onUpdate={onUpdate}
                />
              ))}
            </div>
          )}


        </div>
      )}
    </div>
  );
}

/* ─── Main Component ───────────────────── */
export default function QuestionPractice() {
  const { user } = useAuth();
  const userId = String(user?.id ?? "guest");
  // View-as mode: counsellor viewing a student
  const viewAsId = new URLSearchParams(window.location.search).get("viewAs");
  const effectiveUserId = viewAsId ?? userId;
  const isViewMode = !!viewAsId;
  const [viewedExamType, setViewedExamType] = useState<string | null>(null);
  useEffect(() => {
    if (!viewAsId) return;
    supabase.from("profiles").select("exam_type").eq("id", viewAsId).single()
      .then(({ data }) => setViewedExamType(data?.exam_type ?? null));
  }, [viewAsId]);
  const examType = isViewMode ? viewedExamType : ((user as any)?.exam_type as string | null);
  const isJAM = examType === "JAM";

  const [activeMainTab, setActiveMainTab] = useState<"log" | "calendar">("log");

  /* Question Practice calendar setup: 70% of each subject's study hours */
  const qpRoadmapSubjects = examType === "NET_GATE" ? NET_SUBJECTS : JAM_SUBJECTS;
  const _effectiveUid = effectiveUserId || (() => { try { return JSON.parse(localStorage.getItem("heartspace_user")||"{}").id||""; } catch { return ""; } })();
  const QP_SPEED_MULTS: Record<string, number> = { gentle: 1.40, steady: 1.30, standard: 1.00, accelerated: 0.70, rapid: 0.60 };
  const QP_SPEED_OPTS = [["gentle","🐢","+40%"],["steady","🌿","+30%"],["standard","⚖️","Std"],["accelerated","⚡","-30%"],["rapid","🚀","-40%"]] as const;
  const [studySpeedMapQP, setStudySpeedMapQP] = useState<Record<string,string>>(() => { try { return JSON.parse(localStorage.getItem(`hs_topic_speed_${_effectiveUid}`) ?? "{}"); } catch { return {}; } });
  const [pracSpeedMap, setPracSpeedMap] = useState<Record<string,string>>(() => { try { return JSON.parse(localStorage.getItem(`hs_practice_speed_${_effectiveUid}`) ?? "{}"); } catch { return {}; } });
  const practiceSubjects: GenericSubjectDef[] = qpRoadmapSubjects.map((s) => {
    const studyMult = QP_SPEED_MULTS[studySpeedMapQP[s.id]] ?? 1.0;
    const pracMult = QP_SPEED_MULTS[pracSpeedMap[s.id]] ?? 1.0;
    return {
      id: s.id,
      name: s.name,
      totalHours: Math.round(s.totalHours * studyMult * 0.7 * pracMult * 10) / 10,
    };
  });
  let practiceStartDate = format(new Date(), "yyyy-MM-dd");
  let practiceHoursPerDay = 2;
  let practiceDaysPerWeek = 5;
  try {
    const rm = JSON.parse(localStorage.getItem(`hs_roadmap_${effectiveUserId}`) || "{}");
    if (rm.startDate) practiceStartDate = rm.startDate;
    const inputs = JSON.parse(localStorage.getItem(`hs_schedule_inputs_${effectiveUserId}`) || "{}");
    if (inputs.hoursPerDay) practiceHoursPerDay = inputs.hoursPerDay;
    if (inputs.daysPerWeek) practiceDaysPerWeek = inputs.daysPerWeek;
  } catch {}

  const [progress, setProgress] = useState<PracticeProgress>(() =>
    loadProgress(effectiveUserId),
  );
  useEffect(() => {
    supabase.from("practice_progress").select("data").eq("user_id", effectiveUserId).single()
      .then(({ data: sd }) => {
        if (sd?.data) setProgress(sd.data as PracticeProgress);
      });
  }, [effectiveUserId]);
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
              style={{ color: PROGRESS_PURPLE }}
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

      {/* Tab Switcher */}
      <div className="flex gap-2">
        {(["log", "calendar"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveMainTab(tab)}
            className="px-4 py-2 rounded-xl text-sm font-semibold"
            style={
              activeMainTab === tab
                ? { background: CHARCOAL, color: CREAM }
                : { background: `${BORDER}88`, color: MUTED }
            }
          >
            {tab === "log" ? "📝 Practice Log" : "📅 Calendar"}
          </button>
        ))}
      </div>

      {activeMainTab === "calendar" && effectiveUserId && (
        <div className="rounded-2xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          {/* Practice Speed Picker */}
          <div style={{ background: "#FFFDF9", border: "1px solid #E5DDD0", borderRadius: 12, padding: "0.75rem 1rem", marginBottom: "1rem" }}>
            <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#7A7267", margin: "0 0 0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Practice Speed per Subject</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {qpRoadmapSubjects.map(s => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "#2D2A25", minWidth: 120 }}>{s.name}</span>
                  <div style={{ display: "flex", gap: "0.25rem", flex: 1 }}>
                    {QP_SPEED_OPTS.map(([key, emoji, label]) => {
                      const current = pracSpeedMap[s.id] ?? "standard";
                      return (
                        <button key={key} onClick={() => {
                          const next = { ...pracSpeedMap, [s.id]: key };
                          setPracSpeedMap(next);
                          localStorage.setItem(`hs_practice_speed_${_effectiveUid}`, JSON.stringify(next));
                        }}
                        style={{
                          flex: 1, padding: "0.2rem 0.1rem", borderRadius: 6, fontSize: "0.6rem", fontWeight: 600, cursor: "pointer",
                          background: current === key ? "#2E7D52" : "#F8F5F0",
                          color: current === key ? "#fff" : "#7A7267",
                          border: `1px solid ${current === key ? "#2E7D52" : "#E5DDD0"}`,
                        }}>{emoji} {label}</button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Practice Coverage Summary */}
          <div style={{ background: "#FFFDF9", border: "1px solid #E5DDD0", borderRadius: 12, padding: "0.75rem 1rem", marginBottom: "1rem" }}>
            <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#7A7267", margin: "0 0 0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Practice Coverage</p>
            {(() => {
              try {
                const uid = _effectiveUid;
                const pracCal = JSON.parse(localStorage.getItem(`hs_cal_practice_${uid}`) ?? "{}");
                const todayLocal = new Date();
                const todayKey = `${todayLocal.getFullYear()}-${String(todayLocal.getMonth()+1).padStart(2,'0')}-${String(todayLocal.getDate()).padStart(2,'0')}`;
                const covHours: Record<string,number> = {};
                Object.entries(pracCal).forEach(([day, entries]: [string,any]) => {
                  if (day <= todayKey) entries.forEach((e: any) => { covHours[e.subjectId] = (covHours[e.subjectId] ?? 0) + e.hours; });
                });
                const totalHrs = practiceSubjects.reduce((a,s) => a + s.totalHours, 0);
                const coveredHrs = practiceSubjects.reduce((a,s) => a + (covHours[s.id] ?? 0), 0);
                const overallPct = totalHrs > 0 ? Math.round((coveredHrs/totalHrs)*100) : 0;
                return (
                  <div>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                      <span style={{ fontSize:"0.75rem", fontWeight:600, color:"#2D2A25" }}>Overall</span>
                      <span style={{ fontSize:"0.75rem", fontWeight:700, color:"#2E7D52" }}>{Math.round(coveredHrs*10)/10}/{Math.round(totalHrs*10)/10}h · {overallPct}%</span>
                    </div>
                    <div style={{ height:6, borderRadius:999, background:"#E5DDD0", marginBottom:8 }}>
                      <div style={{ height:"100%", borderRadius:999, width:`${overallPct}%`, background:"linear-gradient(90deg,#2E7D52,#4CAF7D)" }} />
                    </div>
                    {practiceSubjects.map(s => {
                      const cov = covHours[s.id] ?? 0;
                      const p = s.totalHours > 0 ? Math.round((cov/s.totalHours)*100) : 0;
                      return (
                        <div key={s.id} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                          <span style={{ fontSize:"0.65rem", fontWeight:600, color:"#2D2A25", minWidth:130 }}>{s.name}</span>
                          <div style={{ flex:1, height:4, borderRadius:999, background:"#E5DDD0" }}>
                            <div style={{ height:"100%", borderRadius:999, width:`${Math.min(p,100)}%`, background:"#2E7D52" }} />
                          </div>
                          <span style={{ fontSize:"0.65rem", fontWeight:700, color:"#2E7D52", minWidth:60, textAlign:"right" }}>{Math.round(cov*10)/10}/{s.totalHours}h</span>
                        </div>
                      );
                    })}
                  </div>
                );
              } catch { return <p style={{fontSize:"0.75rem",color:"#7A7267"}}>No data yet</p>; }
            })()}
          </div>
          <GenericCalendar
            namespace="practice"
            uid={effectiveUserId}
            subjects={practiceSubjects}
            startDate={practiceStartDate}
            hoursPerDay={practiceHoursPerDay}
            daysPerWeek={practiceDaysPerWeek}
            title="📅 Question Practice Calendar (70% of study hours)"
          />
        </div>
      )}

      {activeMainTab === "log" && (
      <>


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
              return (
                <div
                  key={st.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl"
                  style={{ background: CARD, border: `1px solid #C0392B22` }}
                >
                  <span className="flex-1 text-sm" style={{ color: CHARCOAL }}>{st.name}</span>
                  <span className="text-xs font-bold" style={{ color: getAccuracyColor(st.latest!.accuracy) }}>
                    🎯 {st.latest!.accuracy}%
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "#6B568F22", color: "#6B568F" }}>
                    🧠 {typeof st.latest!.concept === "number" ? `${st.latest!.concept}%` : st.latest!.concept}
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

      {/* Subject blocks */}
      {displaySyllabus.map((subject) => (
        <SubjectBlock
          key={subject.id}
          subject={subject}
          progress={progress}
          onUpdate={updateProgress}
          totalSubs={totalSubs}
        />
      ))}

      {practiced === 0 && (
        <div
          className="text-center py-16 rounded-2xl"
          style={{ background: CREAM, border: `1.5px dashed ${BORDER}` }}
        >
          <BarChart2
            className="w-10 h-10 mx-auto mb-3 opacity-30"
            style={{ color: PROGRESS_PURPLE }}
          />
          <p className="text-sm font-medium" style={{ color: CHARCOAL }}>
            No practice logged yet
          </p>
          <p className="text-xs mt-1" style={{ color: MUTED }}>
            Click 🟢⚡ 100% on any subject to mark it done instantly, or use +
            Subject / + Topic to log custom attempts.
          </p>
        </div>
      )}
      </>
      )}
    </div>
  );
}

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
