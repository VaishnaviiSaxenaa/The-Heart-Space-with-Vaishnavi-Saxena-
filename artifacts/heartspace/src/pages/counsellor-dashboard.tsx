import { useState, useEffect } from "react";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { format } from "date-fns";

const DARK = "#2D2A25";
const GOLD = "#C9A84C";
const CREAM = "#F8F5F0";
const CARD = "#FFFDF9";
const BORDER = "#E5DDD0";
const MUTED = "#7A7267";
const CHARCOAL = "#2D2A25";
const OLIVE = "#6E8B6B";

/* ── Types ── */
interface Student {
  id: string;
  full_name: string;
  email: string;
  role: string;
  plan: string;
  created_at: string;
}

interface StudentData {
  syllabus: Record<string, unknown>;
  practice: Record<string, unknown>;
  roadmap: Record<string, unknown>;
  scheduleInputs: Record<string, unknown>;
  topicSpeed: Record<string, string>;
  subjectOrder: string[];
  studyPeriods: unknown[];
  baseWeeks: Record<string, unknown>;
  daily: Record<string, unknown>;
  sessions: unknown[];
}

const EMPTY_DATA: StudentData = {
  syllabus: {},
  practice: {},
  roadmap: {},
  scheduleInputs: {},
  topicSpeed: {},
  subjectOrder: [],
  studyPeriods: [],
  baseWeeks: {},
  daily: {},
  sessions: [],
};

/* JAM_SUBJECTS now derived from ./subjects.ts (canonical source) */
import { JAM_SUBJECTS as CANONICAL_JAM_SUBJECTS } from "./subjects";
const JAM_SUBJECTS = CANONICAL_JAM_SUBJECTS.map((s) => ({ id: s.syllabusId, name: s.name, short: s.id.toUpperCase() }));

const TOPIC_PREFIX_MAP: Record<string, string> = {
  la: "linear_algebra",
  ra: "real_analysis",
  dc: "differential_calculus",
  int: "differential_calculus",
  gt: "abstract_algebra",
  ode: "ode",
  mvc: "mvc",
  mi: "mi",
};

async function fetchStudentData(userId: string): Promise<StudentData> {
  const tables = [
    "syllabus_progress",
    "practice_progress",
    "roadmap_data",
    "schedule_inputs",
    "topic_speed",
    "subject_order",
    "study_periods",
    "base_weeks",
    "daily_tracker",
    "sessions_data",
  ];
  const results = await Promise.all(
    tables.map((t) =>
      supabase
        .from(t)
        .select("data")
        .eq("user_id", userId)
        .single()
        .then((r) => r.data?.data ?? null),
    ),
  );
  return {
    syllabus: (results[0] as Record<string, unknown>) ?? {},
    practice: (results[1] as Record<string, unknown>) ?? {},
    roadmap: (results[2] as Record<string, unknown>) ?? {},
    scheduleInputs: (results[3] as Record<string, unknown>) ?? {},
    topicSpeed: (results[4] as Record<string, string>) ?? {},
    subjectOrder: (results[5] as string[]) ?? [],
    studyPeriods: (results[6] as unknown[]) ?? [],
    baseWeeks: (results[7] as Record<string, unknown>) ?? {},
    daily: (results[8] as Record<string, unknown>) ?? {},
    sessions: (results[9] as unknown[]) ?? [],
  };
}

async function saveStudentField(userId: string, table: string, data: unknown) {
  await supabase
    .from(table)
    .upsert(
      { user_id: userId, data, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
}

/* ── Syllabus stats helper ── */
function getSyllabusStats(data: Record<string, unknown>) {
  const stats: Record<string, { done: number; total: number }> = {};
  JAM_SUBJECTS.forEach((s) => {
    stats[s.id] = { done: 0, total: 0 };
  });
  Object.entries(data).forEach(([key, val]) => {
    const prefix = key.split("_")[0];
    const sid = TOPIC_PREFIX_MAP[prefix];
    if (sid && stats[sid]) {
      stats[sid].total++;
      if ((val as Record<string, unknown>)?.status === "done")
        stats[sid].done++;
    }
  });
  return stats;
}

/* ── Overview Tab ── */
function OverviewTab({
  student,
  data,
  saving,
  onScheduleSave,
  onSpeedSave,
  onOrderSave,
}: {
  student: Student;
  data: StudentData;
  saving: boolean;
  onScheduleSave: (key: string, val: unknown) => void;
  onSpeedSave: (subjectId: string, speed: string) => void;
  onOrderSave: (order: string[]) => void;
}) {
  const syllabusStats = getSyllabusStats(data.syllabus);
  const overallPct = Math.round(
    (JAM_SUBJECTS.reduce((s, sub) => {
      const st = syllabusStats[sub.id];
      return s + (st.total > 0 ? st.done / st.total : 0);
    }, 0) /
      JAM_SUBJECTS.length) *
      100,
  );
  const hrs = (data.scheduleInputs.hoursPerDay as number) ?? 0;
  const days = (data.scheduleInputs.daysPerWeek as number) ?? 0;
  const doneCount = data.sessions.filter(
    (s: unknown) => (s as Record<string, unknown>).status === "done",
  ).length;
  const pendingCount = data.sessions.filter((s: unknown) => {
    const st = (s as Record<string, unknown>).status as string;
    return st === "requested" || st === "pending";
  }).length;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Study hrs/week", val: `${hrs * days}h`, color: GOLD },
          { label: "Syllabus done", val: `${overallPct}%`, color: OLIVE },
          { label: "Sessions done", val: doneCount, color: DARK },
          {
            label: "Pending sessions",
            val: pendingCount,
            color: pendingCount > 0 ? "#C0392B" : MUTED,
          },
        ].map(({ label, val, color }) => (
          <div
            key={label}
            className="rounded-2xl p-4 text-center"
            style={{ background: CARD, border: `1px solid ${BORDER}` }}
          >
            <p className="text-2xl font-bold" style={{ color }}>
              {val}
            </p>
            <p className="text-xs mt-1" style={{ color: MUTED }}>
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Schedule inputs */}
      <div
        className="rounded-2xl p-5"
        style={{ background: CARD, border: `1px solid ${BORDER}` }}
      >
        <p className="text-sm font-bold mb-4" style={{ color: DARK }}>
          📅 Schedule Settings{" "}
          {saving && (
            <span className="text-xs font-normal ml-2" style={{ color: OLIVE }}>
              Saving…
            </span>
          )}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Hours/day", key: "hoursPerDay", min: 1, max: 12 },
            { label: "Days/week", key: "daysPerWeek", min: 1, max: 7 },
            { label: "Target months", key: "targetMonths", min: 1, max: 36 },
            { label: "Revision %", key: "revisionPercent", min: 25, max: 60 },
          ].map(({ label, key, min, max }) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-xs flex-1" style={{ color: MUTED }}>
                {label}
              </span>
              <input
                type="number"
                min={min}
                max={max}
                value={(data.scheduleInputs[key] as number) ?? min}
                onChange={(e) =>
                  onScheduleSave(key, parseFloat(e.target.value))
                }
                className="w-16 h-8 px-2 rounded-lg text-xs text-center border-2 outline-none"
                style={{
                  background: CREAM,
                  borderColor: BORDER,
                  color: CHARCOAL,
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Syllabus overview */}
      <div
        className="rounded-2xl p-5"
        style={{ background: CARD, border: `1px solid ${BORDER}` }}
      >
        <p className="text-sm font-bold mb-4" style={{ color: DARK }}>
          📚 Syllabus Overview
        </p>
        <div className="space-y-2">
          {JAM_SUBJECTS.map((s) => {
            const { done, total } = syllabusStats[s.id];
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            return (
              <div key={s.id} className="flex items-center gap-3">
                <span
                  className="text-xs w-36 flex-shrink-0"
                  style={{ color: CHARCOAL }}
                >
                  {s.name}
                </span>
                <div
                  className="flex-1 h-2 rounded-full overflow-hidden"
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
                  className="text-xs w-16 text-right"
                  style={{ color: MUTED }}
                >
                  {done}/{total} · {pct}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Syllabus Tab ── */
function SyllabusTab({ data }: { data: StudentData }) {
  const stats = getSyllabusStats(data.syllabus);
  const entries = Object.entries(data.syllabus) as [
    string,
    Record<string, unknown>,
  ][];

  return (
    <div className="space-y-4">
      {JAM_SUBJECTS.map((s) => {
        const { done, total } = stats[s.id];
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        const subEntries = entries.filter(([key]) => {
          const prefix = key.split("_")[0];
          return TOPIC_PREFIX_MAP[prefix] === s.id;
        });
        return (
          <div
            key={s.id}
            className="rounded-2xl p-4"
            style={{ background: CARD, border: `1px solid ${BORDER}` }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold" style={{ color: DARK }}>
                {s.name}
              </p>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: pct === 100 ? `${OLIVE}22` : `${GOLD}22`,
                  color: pct === 100 ? OLIVE : GOLD,
                }}
              >
                {done}/{total} · {pct}%
              </span>
            </div>
            <div
              className="w-full h-1.5 rounded-full mb-3 overflow-hidden"
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
            <div className="flex flex-wrap gap-1.5">
              {subEntries.map(([key, val]) => (
                <span
                  key={key}
                  className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{
                    background:
                      val.status === "done"
                        ? `${OLIVE}22`
                        : val.status === "in_progress"
                          ? `${GOLD}22`
                          : BORDER,
                    color:
                      val.status === "done"
                        ? OLIVE
                        : val.status === "in_progress"
                          ? GOLD
                          : MUTED,
                  }}
                >
                  {key}{" "}
                  {val.status === "done"
                    ? "✓"
                    : val.status === "in_progress"
                      ? "~"
                      : "○"}
                </span>
              ))}
              {subEntries.length === 0 && (
                <p className="text-xs" style={{ color: MUTED }}>
                  No data yet
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Practice Tab ── */
function PracticeTab({ data }: { data: StudentData }) {
  return (
    <div className="space-y-3">
      {JAM_SUBJECTS.map((s) => {
        const subData = (data.practice[s.id] as Record<string, unknown>) ?? {};
        const topics = Object.values(subData) as Record<string, unknown>[];
        const attempts = topics.flatMap(
          (t) => (t.attempts as unknown[]) ?? [],
        ) as Record<string, unknown>[];
        const latest = attempts[attempts.length - 1];
        const acc = (latest?.accuracy as number) ?? null;
        return (
          <div
            key={s.id}
            className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: CARD, border: `1px solid ${BORDER}` }}
          >
            <span
              className="flex-1 text-sm font-medium"
              style={{ color: CHARCOAL }}
            >
              {s.name}
            </span>
            <span className="text-xs" style={{ color: MUTED }}>
              {attempts.length} attempts
            </span>
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{
                background:
                  acc === null
                    ? BORDER
                    : acc >= 80
                      ? `${OLIVE}22`
                      : acc >= 50
                        ? `${GOLD}22`
                        : "#E0707022",
                color:
                  acc === null
                    ? MUTED
                    : acc >= 80
                      ? OLIVE
                      : acc >= 50
                        ? GOLD
                        : "#C0392B",
              }}
            >
              {acc === null ? "Not started" : `${acc}%`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Daily Tab ── */
const MOOD_EMOJIS = ["😞", "😕", "😐", "🙂", "😄"];
const MOOD_LABELS = ["Rough", "Hard", "Okay", "Good", "Great"];
const STRESS_COLOR = (s: number) =>
  s >= 4 ? "#C0392B" : s <= 2 ? "#27AE60" : "#E67E22";

function DailyTab({ data }: { data: StudentData }) {
  const entries = Object.entries(data.daily)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 30);

  if (entries.length === 0)
    return (
      <div
        className="text-center py-16 rounded-2xl"
        style={{ background: CREAM, border: `1.5px dashed ${BORDER}` }}
      >
        <p className="text-sm font-medium" style={{ color: MUTED }}>
          No daily entries yet
        </p>
        <p className="text-xs mt-1" style={{ color: MUTED }}>
          Student hasn't logged any days
        </p>
      </div>
    );

  return (
    <div className="space-y-5 max-w-2xl">
      {entries.map(([date, entry]) => {
        const e = entry as Record<string, unknown>;
        const priorities =
          (e.priorities as Array<Record<string, unknown>>) ?? [];
        const nextTasks =
          (e.nextDayTasks as Array<Record<string, unknown>>) ?? [];
        const emotions = (e.emotionalState as string[]) ?? [];
        const energySlots =
          (e.energySlots as Record<string, Array<Record<string, string>>>) ??
          {};
        const mood = e.mood as number | null;
        const donePriorities = priorities.filter((p) => p.done).length;

        return (
          <div
            key={date}
            className="rounded-2xl overflow-hidden"
            style={{
              background: CARD,
              border: `1px solid ${BORDER}`,
              boxShadow: "0 4px 24px rgba(44,24,16,.06)",
            }}
          >
            {/* Date header */}
            <div
              className="px-6 py-4 flex items-center justify-between"
              style={{
                background: `${DARK}08`,
                borderBottom: `1px solid ${BORDER}`,
              }}
            >
              <div>
                <p className="text-sm font-bold" style={{ color: DARK }}>
                  {format(new Date(date + "T00:00:00"), "EEEE, MMMM d, yyyy")}
                </p>
                {donePriorities > 0 && (
                  <p className="text-xs mt-0.5" style={{ color: OLIVE }}>
                    ✓ {donePriorities}/{priorities.length} priorities done
                  </p>
                )}
              </div>
              {/* Mood */}
              {mood != null && (
                <div
                  className="flex flex-col items-center px-4 py-2 rounded-2xl"
                  style={{ background: DARK }}
                >
                  <span className="text-2xl">{MOOD_EMOJIS[mood - 1]}</span>
                  <span
                    className="text-[10px] font-semibold mt-0.5"
                    style={{ color: CREAM }}
                  >
                    {MOOD_LABELS[mood - 1]}
                  </span>
                </div>
              )}
            </div>

            <div className="p-6 space-y-5">
              {/* Key stats row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {e.studyHours != null && (
                  <div
                    className="rounded-xl p-3 text-center"
                    style={{
                      background: `${OLIVE}11`,
                      border: `1px solid ${OLIVE}33`,
                    }}
                  >
                    <p className="text-lg font-bold" style={{ color: OLIVE }}>
                      {e.studyHours as number}h
                    </p>
                    <p className="text-[10px]" style={{ color: MUTED }}>
                      Study hours
                    </p>
                  </div>
                )}
                {e.sleepHours != null && (
                  <div
                    className="rounded-xl p-3 text-center"
                    style={{
                      background: `${DARK}08`,
                      border: `1px solid ${BORDER}`,
                    }}
                  >
                    <p className="text-lg font-bold" style={{ color: DARK }}>
                      {e.sleepHours as number}h
                    </p>
                    <p className="text-[10px]" style={{ color: MUTED }}>
                      Sleep
                    </p>
                  </div>
                )}
                {e.stressLevel != null && (
                  <div
                    className="rounded-xl p-3 text-center"
                    style={{
                      background: "#fff",
                      border: `1px solid ${BORDER}`,
                    }}
                  >
                    <p
                      className="text-lg font-bold"
                      style={{ color: STRESS_COLOR(e.stressLevel as number) }}
                    >
                      {e.stressLevel as number}/5
                    </p>
                    <p className="text-[10px]" style={{ color: MUTED }}>
                      Stress
                    </p>
                  </div>
                )}
                {e.sittingCapacityHours != null && (
                  <div
                    className="rounded-xl p-3 text-center"
                    style={{
                      background: `${GOLD}11`,
                      border: `1px solid ${GOLD}33`,
                    }}
                  >
                    <p className="text-lg font-bold" style={{ color: GOLD }}>
                      {e.sittingCapacityHours as number}h
                    </p>
                    <p className="text-[10px]" style={{ color: MUTED }}>
                      Sitting
                    </p>
                  </div>
                )}
              </div>

              {/* Extra stats */}
              <div className="flex flex-wrap gap-2">
                {e.sleepQuality != null && (
                  <span
                    className="text-xs px-3 py-1.5 rounded-full font-medium"
                    style={{ background: `${DARK}08`, color: MUTED }}
                  >
                    😴 Sleep quality: {e.sleepQuality as number}/5
                  </span>
                )}
                {e.studyCapacityHours != null && (
                  <span
                    className="text-xs px-3 py-1.5 rounded-full font-medium"
                    style={{ background: `${OLIVE}11`, color: OLIVE }}
                  >
                    📖 Study capacity: {e.studyCapacityHours as number}h
                  </span>
                )}
                {e.meTimeMinutes != null && (
                  <span
                    className="text-xs px-3 py-1.5 rounded-full font-medium"
                    style={{ background: `${GOLD}11`, color: GOLD }}
                  >
                    🌿 Me time: {e.meTimeMinutes as number} mins
                  </span>
                )}
                {e.physicalActivity && (
                  <span
                    className="text-xs px-3 py-1.5 rounded-full font-medium"
                    style={{ background: `${OLIVE}22`, color: OLIVE }}
                  >
                    🏃 {(e.activityType as string) || "Active"} ✓
                  </span>
                )}
              </div>

              {/* Note */}
              {e.note && (
                <div
                  className="px-4 py-3 rounded-xl"
                  style={{ background: CREAM, border: `1px solid ${BORDER}` }}
                >
                  <p
                    className="text-[10px] font-semibold uppercase mb-1"
                    style={{ color: MUTED }}
                  >
                    Note
                  </p>
                  <p className="text-sm" style={{ color: CHARCOAL }}>
                    "{e.note as string}"
                  </p>
                </div>
              )}

              {/* Emotional state */}
              {emotions.length > 0 && (
                <div>
                  <p
                    className="text-xs font-semibold mb-2"
                    style={{ color: MUTED }}
                  >
                    Emotional State
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {emotions.map((em, i) => (
                      <span
                        key={i}
                        className="text-xs px-3 py-1.5 rounded-full font-medium"
                        style={{ background: `${GOLD}22`, color: DARK }}
                      >
                        {em}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Energy slots */}
              {(energySlots.high?.length > 0 ||
                energySlots.medium?.length > 0 ||
                energySlots.low?.length > 0) && (
                <div>
                  <p
                    className="text-xs font-semibold mb-2"
                    style={{ color: MUTED }}
                  >
                    Energy Slots
                  </p>
                  <div className="space-y-2">
                    {energySlots.high?.length > 0 && (
                      <div
                        className="flex items-center gap-3 px-3 py-2 rounded-xl"
                        style={{
                          background: `${OLIVE}11`,
                          border: `1px solid ${OLIVE}33`,
                        }}
                      >
                        <span
                          className="text-xs font-bold w-16 flex-shrink-0"
                          style={{ color: OLIVE }}
                        >
                          🟢 High
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {energySlots.high.map((s, i) => (
                            <span
                              key={i}
                              className="text-xs px-2 py-0.5 rounded-lg"
                              style={{ background: `${OLIVE}22`, color: OLIVE }}
                            >
                              {s.start}–{s.end}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {energySlots.medium?.length > 0 && (
                      <div
                        className="flex items-center gap-3 px-3 py-2 rounded-xl"
                        style={{
                          background: `${GOLD}11`,
                          border: `1px solid ${GOLD}33`,
                        }}
                      >
                        <span
                          className="text-xs font-bold w-16 flex-shrink-0"
                          style={{ color: GOLD }}
                        >
                          🟡 Medium
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {energySlots.medium.map((s, i) => (
                            <span
                              key={i}
                              className="text-xs px-2 py-0.5 rounded-lg"
                              style={{ background: `${GOLD}22`, color: GOLD }}
                            >
                              {s.start}–{s.end}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {energySlots.low?.length > 0 && (
                      <div
                        className="flex items-center gap-3 px-3 py-2 rounded-xl"
                        style={{
                          background: "#fff",
                          border: `1px solid ${BORDER}`,
                        }}
                      >
                        <span
                          className="text-xs font-bold w-16 flex-shrink-0"
                          style={{ color: MUTED }}
                        >
                          🔴 Low
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {energySlots.low.map((s, i) => (
                            <span
                              key={i}
                              className="text-xs px-2 py-0.5 rounded-lg"
                              style={{ background: BORDER, color: MUTED }}
                            >
                              {s.start}–{s.end}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Priorities */}
              {priorities.length > 0 && (
                <div>
                  <p
                    className="text-xs font-semibold mb-2"
                    style={{ color: MUTED }}
                  >
                    Priorities — {donePriorities}/{priorities.length} done
                  </p>
                  <div className="space-y-1.5">
                    {priorities.map((p, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                        style={{
                          background: p.done ? `${OLIVE}11` : CREAM,
                          border: `1px solid ${p.done ? OLIVE + "33" : BORDER}`,
                        }}
                      >
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: p.done ? OLIVE : BORDER }}
                        >
                          {p.done && (
                            <span className="text-white text-[10px]">✓</span>
                          )}
                        </div>
                        <span
                          className="text-sm flex-1"
                          style={{
                            color: p.done ? OLIVE : CHARCOAL,
                            textDecoration: p.done ? "line-through" : "none",
                            opacity: p.done ? 0.7 : 1,
                          }}
                        >
                          {p.text as string}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Next day tasks */}
              {nextTasks.length > 0 && (
                <div>
                  <p
                    className="text-xs font-semibold mb-2"
                    style={{ color: MUTED }}
                  >
                    Tomorrow's Plan
                  </p>
                  <div className="space-y-1.5">
                    {nextTasks.map((t, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                        style={{
                          background: CREAM,
                          border: `1px solid ${BORDER}`,
                        }}
                      >
                        <span
                          className="text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: `${GOLD}22`, color: DARK }}
                        >
                          {i + 1}
                        </span>
                        <span className="text-sm" style={{ color: CHARCOAL }}>
                          {t.text as string}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
/* ── Sessions Tab ── */
function SessionsTab({
  student,
  data,
  onSave,
}: {
  student: Student;
  data: StudentData;
  onSave: (sessions: unknown[]) => void;
}) {
  const sessions = data.sessions as Array<Record<string, unknown>>;
  const requested = sessions.filter(
    (s) => s.status === "requested" || s.status === "pending",
  );
  const approved = sessions.filter((s) => s.status === "approved");
  const done = sessions.filter((s) => s.status === "done");
  const [msgInputs, setMsgInputs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  async function approve(id: string) {
    const msg = msgInputs[id]?.trim();
    if (!msg) {
      alert("Write a call time message first!");
      return;
    }
    setSaving(id);
    const updated = sessions.map((s) =>
      s.id === id
        ? { ...s, status: "approved", callMessage: msg, scheduledDate: msg }
        : s,
    );
    await saveStudentField(student.id, "sessions_data", updated);
    onSave(updated);
    setSaving(null);
  }

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="flex gap-3 flex-wrap">
        {[
          { label: "Requested", count: requested.length, color: GOLD },
          { label: "Approved", count: approved.length, color: OLIVE },
          { label: "Done", count: done.length, color: DARK },
        ].map(({ label, count, color }) => (
          <div
            key={label}
            className="rounded-xl px-4 py-2 text-center"
            style={{ background: CARD, border: `1px solid ${BORDER}` }}
          >
            <p className="text-lg font-bold" style={{ color }}>
              {count}
            </p>
            <p className="text-[10px]" style={{ color: MUTED }}>
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Requested */}
      {requested.length > 0 && (
        <div>
          <p
            className="text-xs font-bold mb-2 uppercase"
            style={{ color: MUTED }}
          >
            ⏳ Requested
          </p>
          <div className="space-y-3">
            {requested.map((s) => (
              <div
                key={s.id as string}
                className="rounded-2xl p-4"
                style={{ background: CARD, border: `1px solid ${BORDER}` }}
              >
                <p
                  className="text-sm font-medium mb-2"
                  style={{ color: CHARCOAL }}
                >
                  {s.concern as string}
                </p>
                <p className="text-[10px] mb-3" style={{ color: MUTED }}>
                  Requested:{" "}
                  {format(new Date(s.requestedAt as string), "MMM d, yyyy")}
                </p>
                <textarea
                  rows={2}
                  value={msgInputs[s.id as string] ?? ""}
                  onChange={(e) =>
                    setMsgInputs((p) => ({
                      ...p,
                      [s.id as string]: e.target.value,
                    }))
                  }
                  placeholder="e.g. You can call at 5pm on June 8…"
                  className="w-full px-3 py-2 rounded-xl text-xs border-2 outline-none resize-none mb-2"
                  style={{
                    background: CREAM,
                    borderColor: BORDER,
                    color: CHARCOAL,
                  }}
                />
                <button
                  onClick={() => approve(s.id as string)}
                  disabled={saving === (s.id as string)}
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold"
                  style={{ background: OLIVE, color: "#fff" }}
                >
                  {saving === s.id ? "Saving…" : "✓ Approve & Send Message"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approved */}
      {approved.length > 0 && (
        <div>
          <p
            className="text-xs font-bold mb-2 uppercase"
            style={{ color: OLIVE }}
          >
            ✅ Approved
          </p>
          {approved.map((s) => (
            <div
              key={s.id as string}
              className="rounded-2xl p-4"
              style={{ background: CARD, border: `1.5px solid ${OLIVE}44` }}
            >
              <p className="text-sm font-medium" style={{ color: CHARCOAL }}>
                {s.concern as string}
              </p>
              {s.callMessage && (
                <p
                  className="text-xs mt-2 p-2 rounded-lg"
                  style={{ background: `${OLIVE}11`, color: CHARCOAL }}
                >
                  📅 {s.callMessage as string}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Done */}
      {done.length > 0 && (
        <div>
          <p
            className="text-xs font-bold mb-2 uppercase"
            style={{ color: MUTED }}
          >
            🏁 Done ({done.length})
          </p>
          {done.map((s, i) => (
            <div
              key={s.id as string}
              className="rounded-2xl p-3 flex gap-3 mb-2"
              style={{ background: CREAM, border: `1px solid ${BORDER}` }}
            >
              <span className="text-xs font-bold w-5" style={{ color: GOLD }}>
                {i + 1}
              </span>
              <div>
                <p className="text-xs font-medium" style={{ color: CHARCOAL }}>
                  {s.concern as string}
                </p>
                {s.doneAt && (
                  <p className="text-[10px]" style={{ color: MUTED }}>
                    ✅ {format(new Date(s.doneAt as string), "MMM d, yyyy")}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {sessions.length === 0 && (
        <p className="text-sm" style={{ color: MUTED }}>
          No sessions yet.
        </p>
      )}
    </div>
  );
}

/* ── Schedule Tab ── */
function ScheduleTab({
  student,
  data,
  saving,
  onScheduleSave,
  onSpeedSave,
  onOrderSave,
}: {
  student: Student;
  data: StudentData;
  saving: boolean;
  onScheduleSave: (key: string, val: unknown) => void;
  onSpeedSave: (sid: string, speed: string) => void;
  onOrderSave: (order: string[]) => void;
}) {
  const order =
    data.subjectOrder.length > 0
      ? data.subjectOrder
      : JAM_SUBJECTS.map((s) => s.id);

  return (
    <div className="space-y-5">
      {saving && (
        <p className="text-xs" style={{ color: OLIVE }}>
          Saving…
        </p>
      )}

      {/* Schedule inputs */}
      <div
        className="rounded-2xl p-5"
        style={{ background: CARD, border: `1px solid ${BORDER}` }}
      >
        <p className="text-sm font-bold mb-4" style={{ color: DARK }}>
          Schedule Inputs
        </p>
        <div className="space-y-3">
          {[
            {
              label: "Hours per day",
              key: "hoursPerDay",
              min: 1,
              max: 12,
              unit: "hrs",
            },
            {
              label: "Days per week",
              key: "daysPerWeek",
              min: 1,
              max: 7,
              unit: "days",
            },
            {
              label: "Target months",
              key: "targetMonths",
              min: 1,
              max: 36,
              unit: "months",
            },
            {
              label: "Revision %",
              key: "revisionPercent",
              min: 25,
              max: 60,
              unit: "%",
            },
          ].map(({ label, key, min, max, unit }) => (
            <div key={key} className="flex items-center gap-3">
              <span className="text-xs flex-1" style={{ color: MUTED }}>
                {label}
              </span>
              <input
                type="number"
                min={min}
                max={max}
                value={(data.scheduleInputs[key] as number) ?? min}
                onChange={(e) =>
                  onScheduleSave(key, parseFloat(e.target.value))
                }
                className="w-20 h-8 px-2 rounded-lg text-xs text-center border-2 outline-none"
                style={{
                  background: CREAM,
                  borderColor: BORDER,
                  color: CHARCOAL,
                }}
              />
              <span className="text-xs w-12" style={{ color: MUTED }}>
                {unit}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Topic speed */}
      <div
        className="rounded-2xl p-5"
        style={{ background: CARD, border: `1px solid ${BORDER}` }}
      >
        <p className="text-sm font-bold mb-4" style={{ color: DARK }}>
          Topic Learning Speed
        </p>
        {JAM_SUBJECTS.map((s) => (
          <div key={s.id} className="flex items-center gap-3 mb-2">
            <span className="flex-1 text-xs" style={{ color: CHARCOAL }}>
              {s.name}
            </span>
            <select
              value={data.topicSpeed[s.id] ?? "first_normal"}
              onChange={(e) => onSpeedSave(s.id, e.target.value)}
              className="h-7 px-2 rounded-lg text-xs border outline-none"
              style={{
                background: CREAM,
                borderColor: BORDER,
                color: CHARCOAL,
              }}
            >
              <option value="first_slow">1st — Slow (×1.3)</option>
              <option value="first_normal">1st — Normal (×1.0)</option>
              <option value="first_fast">1st — Fast (×0.8)</option>
              <option value="second_slow">2nd — Slow (×1.0)</option>
              <option value="second_normal">2nd — Normal (×0.67)</option>
              <option value="second_fast">2nd — Fast (×0.5)</option>
            </select>
          </div>
        ))}
      </div>

      {/* Subject order */}
      <div
        className="rounded-2xl p-5"
        style={{ background: CARD, border: `1px solid ${BORDER}` }}
      >
        <p className="text-sm font-bold mb-4" style={{ color: DARK }}>
          Subject Study Order
        </p>
        {order.map((id, idx) => {
          const s = JAM_SUBJECTS.find((x) => x.id === id);
          if (!s) return null;
          return (
            <div
              key={id}
              className="flex items-center gap-3 px-3 py-2 rounded-xl mb-1.5"
              style={{ background: CREAM, border: `1px solid ${BORDER}` }}
            >
              <span className="text-xs font-bold w-5" style={{ color: MUTED }}>
                {idx + 1}
              </span>
              <span
                className="flex-1 text-xs font-medium"
                style={{ color: CHARCOAL }}
              >
                {s.name}
              </span>
              <div className="flex gap-1">
                <button
                  disabled={idx === 0}
                  onClick={() => {
                    const o = [...order];
                    [o[idx - 1], o[idx]] = [o[idx], o[idx - 1]];
                    onOrderSave(o);
                  }}
                  className="w-6 h-6 rounded text-xs disabled:opacity-30"
                  style={{ background: BORDER }}
                >
                  ↑
                </button>
                <button
                  disabled={idx === order.length - 1}
                  onClick={() => {
                    const o = [...order];
                    [o[idx], o[idx + 1]] = [o[idx + 1], o[idx]];
                    onOrderSave(o);
                  }}
                  className="w-6 h-6 rounded text-xs disabled:opacity-30"
                  style={{ background: BORDER }}
                >
                  ↓
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Charts Tab ── */
function ChartsTab({ data }: { data: StudentData }) {
  const syllabusStats = getSyllabusStats(data.syllabus);
  const sortedDates = Object.keys(data.daily).sort().slice(-14);
  const studyData = sortedDates.map((d) => ({
    date: d.slice(5),
    hrs:
      ((data.daily[d] as Record<string, unknown>)?.studyHours as number) ?? 0,
  }));
  const maxHrs = Math.max(...studyData.map((d) => d.hrs), 1);
  const doneCount = data.sessions.filter(
    (s: unknown) => (s as Record<string, unknown>).status === "done",
  ).length;
  const totalStudyHrs = studyData.reduce((s, d) => s + d.hrs, 0);

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div
          className="rounded-2xl p-4 text-center"
          style={{ background: CARD, border: `1px solid ${BORDER}` }}
        >
          <p className="text-xl font-bold" style={{ color: GOLD }}>
            {Math.round(totalStudyHrs)}h
          </p>
          <p className="text-[10px]" style={{ color: MUTED }}>
            Study hrs (14d)
          </p>
        </div>
        <div
          className="rounded-2xl p-4 text-center"
          style={{ background: CARD, border: `1px solid ${BORDER}` }}
        >
          <p className="text-xl font-bold" style={{ color: OLIVE }}>
            {doneCount}
          </p>
          <p className="text-[10px]" style={{ color: MUTED }}>
            Sessions done
          </p>
        </div>
        <div
          className="rounded-2xl p-4 text-center"
          style={{ background: CARD, border: `1px solid ${BORDER}` }}
        >
          <p className="text-xl font-bold" style={{ color: DARK }}>
            {Object.keys(data.daily).length}d
          </p>
          <p className="text-[10px]" style={{ color: MUTED }}>
            Days logged
          </p>
        </div>
      </div>

      {/* Study hours bar chart */}
      <div
        className="rounded-2xl p-5"
        style={{ background: CARD, border: `1px solid ${BORDER}` }}
      >
        <p className="text-sm font-bold mb-4" style={{ color: DARK }}>
          📚 Study Hours (last 14 days)
        </p>
        {studyData.length === 0 ? (
          <p className="text-xs" style={{ color: MUTED }}>
            No data yet
          </p>
        ) : (
          <div className="flex items-end gap-1" style={{ height: 80 }}>
            {studyData.map(({ date, hrs }) => (
              <div
                key={date}
                className="flex-1 flex flex-col items-center gap-0.5"
              >
                <div
                  className="w-full rounded-t"
                  style={{
                    height: `${(hrs / maxHrs) * 72}px`,
                    background: `${GOLD}cc`,
                    minHeight: hrs > 0 ? 3 : 0,
                  }}
                  title={`${date}: ${hrs}h`}
                />
                <span className="text-[7px]" style={{ color: MUTED }}>
                  {date}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Syllabus completion */}
      <div
        className="rounded-2xl p-5"
        style={{ background: CARD, border: `1px solid ${BORDER}` }}
      >
        <p className="text-sm font-bold mb-4" style={{ color: DARK }}>
          🎯 Syllabus Completion
        </p>
        {JAM_SUBJECTS.map((s) => {
          const { done, total } = syllabusStats[s.id];
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          return (
            <div key={s.id} className="mb-3">
              <div className="flex justify-between mb-1">
                <span className="text-xs" style={{ color: CHARCOAL }}>
                  {s.name}
                </span>
                <span
                  className="text-xs font-semibold"
                  style={{ color: pct === 100 ? OLIVE : GOLD }}
                >
                  {pct}%
                </span>
              </div>
              <div
                className="w-full h-2 rounded-full overflow-hidden"
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
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main Counsellor Dashboard ── */
export default function CounsellorDashboard() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [selected, setSelected] = useState<Student | null>(null);
  const [studentData, setStudentData] = useState<StudentData>(EMPTY_DATA);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "schedule"
    | "syllabus"
    | "practice"
    | "daily"
    | "sessions"
    | "charts"
  >("overview");
  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, full_name, email, role, plan, created_at")
      .neq("role", "admin")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setStudents(data as Student[]);
      });
  }, []);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setLoading(true);
    fetchStudentData(selected.id)
      .then((data) => {
        if (!cancelled) setStudentData(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [selected]);

  async function handleScheduleSave(key: string, val: unknown) {
    if (!selected) return;
    const next = { ...studentData.scheduleInputs, [key]: val };
    setStudentData((d) => ({ ...d, scheduleInputs: next }));
    setSaving(true);
    await saveStudentField(selected.id, "schedule_inputs", next);
    setSaving(false);
  }

  async function handleSpeedSave(sid: string, speed: string) {
    if (!selected) return;
    const next = { ...studentData.topicSpeed, [sid]: speed };
    setStudentData((d) => ({ ...d, topicSpeed: next }));
    setSaving(true);
    await saveStudentField(selected.id, "topic_speed", next);
    setSaving(false);
  }

  async function handleOrderSave(order: string[]) {
    if (!selected) return;
    setStudentData((d) => ({ ...d, subjectOrder: order }));
    setSaving(true);
    await saveStudentField(selected.id, "subject_order", order);
    setSaving(false);
  }

  const filtered = students.filter(
    (s) =>
      s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase()),
  );

  const planColor = (plan: string) =>
    plan === "zenith" ? GOLD : plan === "apex" ? OLIVE : MUTED;

  const tabs = [
    { key: "overview", label: "📊 Overview" },
    { key: "schedule", label: "📅 Schedule" },
    { key: "syllabus", label: "📚 Syllabus" },
    { key: "practice", label: "✏️ Practice" },
    { key: "daily", label: "📓 Daily" },
    { key: "sessions", label: "📋 Sessions" },
    { key: "charts", label: "📈 Charts" },
  ] as const;

  return (
    <div className="min-h-screen flex" style={{ background: CREAM }}>
      {/* LEFT — Student List */}
      <div
        className="w-72 flex-shrink-0 border-r flex flex-col"
        style={{ borderColor: BORDER, background: CARD }}
      >
        <div className="p-4 border-b" style={{ borderColor: BORDER }}>
          <h2 className="text-sm font-bold mb-3" style={{ color: DARK }}>
            All Students
          </h2>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full h-8 px-3 rounded-lg text-xs border-2 outline-none"
            style={{ background: CREAM, borderColor: BORDER, color: CHARCOAL }}
          />
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filtered.length === 0 && (
            <p className="text-xs text-center mt-8" style={{ color: MUTED }}>
              No students yet
            </p>
          )}
          {filtered.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setSelected(s);
                setActiveTab("overview");
              }}
              className="w-full text-left p-3 rounded-xl transition-all"
              style={
                selected?.id === s.id
                  ? { background: `${GOLD}15`, border: `2px solid ${GOLD}` }
                  : { background: CREAM, border: `1px solid ${BORDER}` }
              }
            >
              <p
                className="text-xs font-semibold truncate"
                style={{ color: CHARCOAL }}
              >
                {s.full_name || s.email?.split("@")[0]}
              </p>
              <p
                className="text-[10px] truncate mt-0.5"
                style={{ color: MUTED }}
              >
                {s.email}
              </p>
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-1 inline-block"
                style={{
                  background: `${planColor(s.plan)}22`,
                  color: planColor(s.plan),
                }}
              >
                {s.plan || s.role}
              </span>
            </button>
          ))}
        </div>
        <div
          className="p-3 border-t text-xs text-center"
          style={{ borderColor: BORDER, color: MUTED }}
        >
          {students.length} students registered
        </div>
      </div>

      {/* RIGHT — Student Dashboard */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-3">👤</div>
              <p className="text-sm font-semibold" style={{ color: CHARCOAL }}>
                Select a student
              </p>
              <p className="text-xs mt-1" style={{ color: MUTED }}>
                Click any student on the left
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div
              className="px-6 py-4 border-b flex items-center justify-between"
              style={{ borderColor: BORDER, background: CARD }}
            >
              <div>
                <h2 className="text-base font-bold" style={{ color: DARK }}>
                  {selected.full_name || selected.email?.split("@")[0]}
                </h2>
                <p className="text-xs mt-0.5" style={{ color: MUTED }}>
                  {selected.email} · {selected.plan || selected.role} · Joined{" "}
                  {selected.created_at
                    ? format(new Date(selected.created_at), "MMM d, yyyy")
                    : "—"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {saving && (
                  <span className="text-xs" style={{ color: OLIVE }}>
                    Saving…
                  </span>
                )}
                {loading && (
                  <span className="text-xs" style={{ color: MUTED }}>
                    Loading…
                  </span>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: "📊 Dashboard", path: "/dashboard" },
                    { label: "🗺️ Roadmap", path: "/roadmap" },
                    { label: "📚 Syllabus", path: "/syllabus" },
                    { label: "✏️ Practice", path: "/assignments" },
                    { label: "📓 Daily", path: "/daily-tracker" },
                    { label: "💜 Vaishnavi Sessions", path: "/my-sessions" },
                    { label: "🔄 Revision", path: "/revision-tracker" },
                    { label: "📝 Notes", path: "/note-tracker" },
                    { label: "📅 Sagar Sessions", path: "/sessions" },
                    { label: "📈 Reports", path: "/charts" },
                  ].map(({ label, path }) => (
                    <button key={path} type="button"
                      onClick={() => window.open(`${path}?viewAs=${selected.id}`, "_blank")}
                      className="px-2 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap"
                      style={{ background: `${GOLD}22`, color: DARK, border: `1px solid ${GOLD}44` }}>
                      {label} ↗
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div
              className="flex border-b px-4 overflow-x-auto"
              style={{ borderColor: BORDER, background: CARD }}
            >
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className="px-3 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap"
                  style={
                    activeTab === tab.key
                      ? { borderColor: GOLD, color: DARK }
                      : { borderColor: "transparent", color: MUTED }
                  }
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <p className="text-sm" style={{ color: MUTED }}>
                  Loading student data…
                </p>
              ) : (
                <>
                  {activeTab === "overview" && (
                    <OverviewTab
                      student={selected}
                      data={studentData}
                      saving={saving}
                      onScheduleSave={handleScheduleSave}
                      onSpeedSave={handleSpeedSave}
                      onOrderSave={handleOrderSave}
                    />
                  )}
                  {activeTab === "schedule" && (
                    <ScheduleTab
                      student={selected}
                      data={studentData}
                      saving={saving}
                      onScheduleSave={handleScheduleSave}
                      onSpeedSave={handleSpeedSave}
                      onOrderSave={handleOrderSave}
                    />
                  )}
                  {activeTab === "syllabus" && (
                    <SyllabusTab data={studentData} />
                  )}
                  {activeTab === "practice" && (
                    <PracticeTab data={studentData} />
                  )}
                  {activeTab === "daily" && <DailyTab data={studentData} />}
                  {activeTab === "sessions" && (
                    <SessionsTab
                      student={selected}
                      data={studentData}
                      onSave={(sessions) =>
                        setStudentData((d) => ({ ...d, sessions }))
                      }
                    />
                  )}
                  {activeTab === "charts" && <ChartsTab data={studentData} />}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
