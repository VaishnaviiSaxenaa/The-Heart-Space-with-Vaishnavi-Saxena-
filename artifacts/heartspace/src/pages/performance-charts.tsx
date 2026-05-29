import { useState, useEffect } from "react";
import { useAuth } from "../lib/auth";
import { loadDailyAll } from "./daily-tracker";

const DARK = "#3D2314";
const GOLD = "#C9A96E";
const CREAM = "#FAF7F2";
const CARD = "#FFFFFF";
const BORDER = "#E8DDD0";
const MUTED = "#8C7B70";
const CHARCOAL = "#3D2314";
const OLIVE = "#6E8B6B";

const JAM_SUBJECTS = [
  { id: "linear_algebra", name: "Linear Algebra" },
  { id: "real_analysis", name: "Real Analysis" },
  { id: "differential_calculus", name: "Functions of One Variable" },
  { id: "abstract_algebra", name: "Group Theory" },
  { id: "ode", name: "ODE" },
  { id: "mvc", name: "Multivariable Calculus" },
  { id: "mi", name: "Mathematical Intuition" },
];

function lsSyllabusKey(uid: string) {
  return `hs_syllabus_${uid}`;
}
function lsPracticeKey(uid: string) {
  return `hs_practice_${uid}`;
}

function loadSyllabus(uid: string): Record<string, unknown> {
  try {
    const r = localStorage.getItem(lsSyllabusKey(uid));
    return r ? JSON.parse(r) : {};
  } catch {
    return {};
  }
}
function loadPractice(uid: string): Record<string, unknown> {
  try {
    const r = localStorage.getItem(lsPracticeKey(uid));
    return r ? JSON.parse(r) : {};
  } catch {
    return {};
  }
}

/* ── Mini bar chart ── */
function BarChart({
  data,
  color,
  label,
  maxVal,
}: {
  data: { date: string; val: number }[];
  color: string;
  label: string;
  maxVal: number;
}) {
  if (data.length === 0)
    return (
      <p className="text-xs text-center py-4" style={{ color: MUTED }}>
        No data yet — start logging in your Daily Tracker!
      </p>
    );
  return (
    <div>
      <div className="flex items-end gap-1" style={{ height: 80 }}>
        {data.map(({ date, val }) => (
          <div key={date} className="flex-1 flex flex-col items-center gap-0.5">
            <div
              className="w-full rounded-t transition-all"
              style={{
                height: `${Math.max((val / maxVal) * 72, val > 0 ? 4 : 0)}px`,
                background: color,
                minHeight: val > 0 ? 4 : 0,
              }}
              title={`${date}: ${val} ${label}`}
            />
            <span className="text-[7px]" style={{ color: MUTED }}>
              {date.slice(5)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Streak calculator ── */
function calcStreak(daily: Record<string, unknown>): {
  current: number;
  best: number;
} {
  const dates = Object.keys(daily).sort();
  if (dates.length === 0) return { current: 0, best: 0 };
  let best = 1,
    current = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      current++;
      best = Math.max(best, current);
    } else current = 1;
  }
  const lastDate = new Date(dates[dates.length - 1]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysSinceLast = Math.floor(
    (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (daysSinceLast > 1) current = 0;
  return { current, best };
}

export default function PerformanceCharts() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const [range, setRange] = useState<14 | 30>(14);

  const daily = loadDailyAll(userId);
  const syllabus = loadSyllabus(userId);
  const practice = loadPractice(userId);

  const sortedDates = Object.keys(daily).sort().slice(-range);
  const studyData = sortedDates.map((d) => ({
    date: d,
    val: ((daily[d] as Record<string, unknown>)?.studyHours as number) ?? 0,
  }));
  const moodData = sortedDates.map((d) => ({
    date: d,
    val: ((daily[d] as Record<string, unknown>)?.mood as number) ?? 0,
  }));
  const stressData = sortedDates.map((d) => ({
    date: d,
    val: ((daily[d] as Record<string, unknown>)?.stressLevel as number) ?? 0,
  }));

  const totalStudyHrs = studyData.reduce((s, d) => s + d.val, 0);
  const avgMood =
    moodData.filter((d) => d.val > 0).length > 0
      ? (
          moodData.reduce((s, d) => s + d.val, 0) /
          moodData.filter((d) => d.val > 0).length
        ).toFixed(1)
      : "—";
  const streak = calcStreak(daily);

  /* Syllabus completion */
  const syllabusStats = JAM_SUBJECTS.map((s) => {
    const subData = (syllabus[s.id] as Record<string, unknown>) ?? {};
    const topics = Object.values(subData) as Record<string, unknown>[];
    const done = topics.filter((t) => t?.status === "done").length;
    const total = topics.length || 1;
    return { ...s, done, total, pct: Math.round((done / total) * 100) };
  });
  const overallPct = Math.round(
    syllabusStats.reduce((s, x) => s + x.pct, 0) / syllabusStats.length,
  );

  /* Practice accuracy */
  const practiceStats = JAM_SUBJECTS.map((s) => {
    const subData = (practice[s.id] as Record<string, unknown>) ?? {};
    const topics = Object.values(subData) as Record<string, unknown>[];
    const attempts = topics.flatMap(
      (t) => (t?.attempts as unknown[]) ?? [],
    ) as Record<string, unknown>[];
    if (attempts.length === 0) return { ...s, acc: null, attempts: 0 };
    const latest = attempts[attempts.length - 1];
    const acc = (latest?.accuracy as number) ?? 0;
    return { ...s, acc, attempts: attempts.length };
  });

  return (
    <div className="min-h-screen p-6" style={{ background: CREAM }}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold" style={{ color: DARK }}>
            Performance Charts
          </h1>
          <p className="text-xs mt-1" style={{ color: MUTED }}>
            Your study analytics and progress overview
          </p>
        </div>

        {/* Range toggle */}
        <div className="flex gap-2">
          {([14, 30] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className="px-4 py-1.5 rounded-full text-xs font-semibold"
              style={
                range === r
                  ? { background: DARK, color: CREAM }
                  : {
                      background: CARD,
                      border: `1px solid ${BORDER}`,
                      color: MUTED,
                    }
              }
            >
              Last {r} days
            </button>
          ))}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: "Study hours",
              val: `${Math.round(totalStudyHrs)}h`,
              sub: `last ${range} days`,
              color: GOLD,
            },
            { label: "Avg mood", val: avgMood, sub: "out of 5", color: OLIVE },
            {
              label: "Current streak",
              val: `${streak.current}d`,
              sub: `best: ${streak.best}d`,
              color: DARK,
            },
            {
              label: "Syllabus done",
              val: `${overallPct}%`,
              sub: "overall",
              color: GOLD,
            },
          ].map(({ label, val, sub, color }) => (
            <div
              key={label}
              className="rounded-2xl p-4 text-center"
              style={{ background: CARD, border: `1px solid ${BORDER}` }}
            >
              <p className="text-2xl font-bold" style={{ color }}>
                {val}
              </p>
              <p
                className="text-xs font-semibold mt-1"
                style={{ color: CHARCOAL }}
              >
                {label}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>
                {sub}
              </p>
            </div>
          ))}
        </div>

        {/* Study hours chart */}
        <div
          className="rounded-2xl p-5"
          style={{ background: CARD, border: `1px solid ${BORDER}` }}
        >
          <p className="text-sm font-bold mb-4" style={{ color: DARK }}>
            📚 Study Hours per Day
          </p>
          <BarChart
            data={studyData}
            color={`${GOLD}cc`}
            label="hrs"
            maxVal={Math.max(...studyData.map((d) => d.val), 1)}
          />
        </div>

        {/* Mood chart */}
        <div
          className="rounded-2xl p-5"
          style={{ background: CARD, border: `1px solid ${BORDER}` }}
        >
          <p className="text-sm font-bold mb-4" style={{ color: DARK }}>
            😊 Mood Trend
          </p>
          <BarChart
            data={moodData}
            color={`${OLIVE}cc`}
            label="/ 5"
            maxVal={5}
          />
        </div>

        {/* Stress chart */}
        <div
          className="rounded-2xl p-5"
          style={{ background: CARD, border: `1px solid ${BORDER}` }}
        >
          <p className="text-sm font-bold mb-4" style={{ color: DARK }}>
            😰 Stress Level
          </p>
          <BarChart
            data={stressData}
            color="#E07070cc"
            label="/ 5"
            maxVal={5}
          />
        </div>

        {/* Syllabus progress */}
        <div
          className="rounded-2xl p-5"
          style={{ background: CARD, border: `1px solid ${BORDER}` }}
        >
          <p className="text-sm font-bold mb-4" style={{ color: DARK }}>
            🎯 Syllabus Completion
          </p>
          <div className="space-y-3">
            {syllabusStats.map((s) => (
              <div key={s.id}>
                <div className="flex justify-between mb-1">
                  <span className="text-xs" style={{ color: CHARCOAL }}>
                    {s.name}
                  </span>
                  <span
                    className="text-xs font-semibold"
                    style={{ color: s.pct === 100 ? OLIVE : GOLD }}
                  >
                    {s.done}/{s.total} topics · {s.pct}%
                  </span>
                </div>
                <div
                  className="w-full h-2.5 rounded-full overflow-hidden"
                  style={{ background: BORDER }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${s.pct}%`,
                      background: s.pct === 100 ? OLIVE : GOLD,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Practice accuracy */}
        <div
          className="rounded-2xl p-5"
          style={{ background: CARD, border: `1px solid ${BORDER}` }}
        >
          <p className="text-sm font-bold mb-4" style={{ color: DARK }}>
            ✏️ Question Practice Accuracy
          </p>
          <div className="space-y-3">
            {practiceStats.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{ background: CREAM, border: `1px solid ${BORDER}` }}
              >
                <span
                  className="flex-1 text-xs font-medium"
                  style={{ color: CHARCOAL }}
                >
                  {s.name}
                </span>
                <span className="text-xs" style={{ color: MUTED }}>
                  {s.attempts} attempts
                </span>
                {s.acc === null ? (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: `${BORDER}88`, color: MUTED }}
                  >
                    Not started
                  </span>
                ) : (
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      background:
                        s.acc >= 80
                          ? `${OLIVE}22`
                          : s.acc >= 50
                            ? `${GOLD}22`
                            : "#E0707022",
                      color:
                        s.acc >= 80 ? OLIVE : s.acc >= 50 ? GOLD : "#C0392B",
                    }}
                  >
                    {s.acc}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
