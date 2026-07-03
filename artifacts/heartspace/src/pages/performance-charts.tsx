import { useState } from "react";
import { useAuth } from "../lib/auth";
import { loadDailyAll } from "./daily-tracker";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from "recharts";

const DARK = "#3D2314";
const GOLD = "#2E7D52";
const CREAM = "#FAF7F2";
const CARD = "#FFFFFF";
const BORDER = "#E8DDD0";
const MUTED = "#8C7B70";
const CHARCOAL = "#3D2314";
const OLIVE = "#6E8B6B";
const ROSE = "#D4A5A5";

const JAM_SUBJECTS = [
  { id: "linear_algebra", name: "Linear Algebra", short: "LA" },
  { id: "real_analysis", name: "Real Analysis", short: "RA" },
  {
    id: "differential_calculus",
    name: "Functions of One Variable",
    short: "DC",
  },
  { id: "abstract_algebra", name: "Group Theory", short: "GT" },
  { id: "ode", name: "ODE", short: "ODE" },
  { id: "mvc", name: "Multivariable Calculus", short: "MVC" },
  { id: "mi", name: "Mathematical Intuition", short: "MI" },
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

function calcStreak(daily: Record<string, unknown>) {
  const dates = Object.keys(daily).sort();
  if (!dates.length) return { current: 0, best: 0 };
  let best = 1,
    cur = 1;
  for (let i = 1; i < dates.length; i++) {
    const diff =
      (new Date(dates[i]).getTime() - new Date(dates[i - 1]).getTime()) /
      86400000;
    if (diff === 1) {
      cur++;
      best = Math.max(best, cur);
    } else cur = 1;
  }
  const daysSinceLast = Math.floor(
    (Date.now() - new Date(dates[dates.length - 1]).getTime()) / 86400000,
  );
  return { current: daysSinceLast > 1 ? 0 : cur, best };
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl px-3 py-2 shadow-lg"
      style={{ background: CARD, border: `1px solid ${BORDER}` }}
    >
      <p className="text-xs font-semibold mb-1" style={{ color: CHARCOAL }}>
        {label}
      </p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs" style={{ color: p.color }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

export default function PerformanceCharts() {
  const { user } = useAuth();
  const uid = user?.id ?? "";
  const [range, setRange] = useState<14 | 30>(14);

  const daily = loadDailyAll(uid);
  const syllabus = loadSyllabus(uid);
  const practice = loadPractice(uid);

  const sortedDates = Object.keys(daily).sort().slice(-range);

  /* ── Study hours data ── */
  const studyData = sortedDates.map((d) => {
    const e = daily[d] as Record<string, unknown>;
    return {
      date: d.slice(5),
      fullDate: d,
      hours: (e?.studyHours as number) ?? 0,
    };
  });

  /* ── Mood + Stress data ── */
  const wellnessData = sortedDates
    .map((d) => {
      const e = daily[d] as Record<string, unknown>;
      return {
        date: d.slice(5),
        mood: (e?.mood as number) ?? null,
        stress: (e?.stressLevel as number) ?? null,
      };
    })
    .filter((d) => d.mood !== null || d.stress !== null);

  /* ── Syllabus progress ── */
  const syllabusStats = JAM_SUBJECTS.map((s) => {
    const subData = (syllabus[s.id] as Record<string, unknown>) ?? {};
    const topics = Object.values(subData) as Record<string, unknown>[];
    const done = topics.filter((t) => t?.status === "done").length;
    const total = topics.length || 1;
    return {
      name: s.short,
      fullName: s.name,
      pct: Math.round((done / total) * 100),
      done,
      total,
    };
  });

  /* ── Practice accuracy ── */
  const practiceStats = JAM_SUBJECTS.map((s) => {
    const subData = (practice[s.id] as Record<string, unknown>) ?? {};
    const topics = Object.values(subData) as Record<string, unknown>[];
    const attempts = topics.flatMap(
      (t) => (t?.attempts as unknown[]) ?? [],
    ) as Record<string, unknown>[];
    if (!attempts.length)
      return {
        name: s.short,
        fullName: s.name,
        acc: 0,
        attempts: 0,
        hasData: false,
      };
    const latest = attempts[attempts.length - 1];
    return {
      name: s.short,
      fullName: s.name,
      acc: (latest?.accuracy as number) ?? 0,
      attempts: attempts.length,
      hasData: true,
    };
  });

  /* ── Summary ── */
  const totalHrs = studyData.reduce((s, d) => s + d.hours, 0);
  const moodVals = wellnessData
    .filter((d) => d.mood)
    .map((d) => d.mood as number);
  const avgMood = moodVals.length
    ? (moodVals.reduce((a, b) => a + b, 0) / moodVals.length).toFixed(1)
    : "—";
  const streak = calcStreak(daily);
  const overallPct = Math.round(
    syllabusStats.reduce((s, x) => s + x.pct, 0) / syllabusStats.length,
  );

  const noDaily = sortedDates.length === 0;

  return (
    <div className="min-h-screen p-6" style={{ background: CREAM }}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold" style={{ color: DARK }}>
              📊 Performance Charts
            </h1>
            <p className="text-xs mt-0.5" style={{ color: MUTED }}>
              Your study analytics and progress at a glance
            </p>
          </div>
          <div className="flex gap-2">
            {([14, 30] as const).map((r) => (
              <button
                key={r}
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
                {r} days
              </button>
            ))}
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: "Study hours",
              val: `${Math.round(totalHrs)}h`,
              sub: `last ${range} days`,
              color: GOLD,
            },
            { label: "Avg mood", val: avgMood, sub: "out of 5", color: OLIVE },
            {
              label: "Study streak",
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

        {/* ── 1. Study Hours Bar Chart ── */}
        <div
          className="rounded-2xl p-5"
          style={{ background: CARD, border: `1px solid ${BORDER}` }}
        >
          <p className="text-sm font-bold mb-1" style={{ color: DARK }}>
            📚 Study Hours per Day
          </p>
          <p className="text-xs mb-4" style={{ color: MUTED }}>
            How many hours you studied each day
          </p>
          {noDaily ? (
            <p className="text-xs text-center py-8" style={{ color: MUTED }}>
              No data yet — start logging in Daily Tracker!
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={studyData}
                margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: MUTED }} />
                <YAxis
                  tick={{ fontSize: 10, fill: MUTED }}
                  unit="h"
                  domain={[0, "auto"]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="hours"
                  name="Study hrs"
                  fill={GOLD}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── 2. Mood + Stress Line Chart ── */}
        <div
          className="rounded-2xl p-5"
          style={{ background: CARD, border: `1px solid ${BORDER}` }}
        >
          <p className="text-sm font-bold mb-1" style={{ color: DARK }}>
            😊 Mood & Stress Trend
          </p>
          <p className="text-xs mb-4" style={{ color: MUTED }}>
            Mood (green) and stress (rose) levels over time — both out of 5
          </p>
          {wellnessData.length === 0 ? (
            <p className="text-xs text-center py-8" style={{ color: MUTED }}>
              No mood/stress data yet.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart
                data={wellnessData}
                margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: MUTED }} />
                <YAxis
                  tick={{ fontSize: 10, fill: MUTED }}
                  domain={[0, 5]}
                  ticks={[0, 1, 2, 3, 4, 5]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="mood"
                  name="Mood"
                  stroke={OLIVE}
                  strokeWidth={2}
                  dot={{ r: 3, fill: OLIVE }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="stress"
                  name="Stress"
                  stroke={ROSE}
                  strokeWidth={2}
                  dot={{ r: 3, fill: ROSE }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── 3. Syllabus Progress Bar Chart ── */}
        <div
          className="rounded-2xl p-5"
          style={{ background: CARD, border: `1px solid ${BORDER}` }}
        >
          <p className="text-sm font-bold mb-1" style={{ color: DARK }}>
            🎯 Syllabus Completion by Subject
          </p>
          <p className="text-xs mb-4" style={{ color: MUTED }}>
            Percentage of topics completed per subject
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={syllabusStats}
              margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: MUTED }} />
              <YAxis
                tick={{ fontSize: 10, fill: MUTED }}
                unit="%"
                domain={[0, 100]}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as {
                    fullName: string;
                    pct: number;
                    done: number;
                    total: number;
                  };
                  return (
                    <div
                      className="rounded-xl px-3 py-2 shadow-lg"
                      style={{
                        background: CARD,
                        border: `1px solid ${BORDER}`,
                      }}
                    >
                      <p
                        className="text-xs font-semibold"
                        style={{ color: CHARCOAL }}
                      >
                        {d.fullName}
                      </p>
                      <p className="text-xs" style={{ color: GOLD }}>
                        {d.done}/{d.total} topics · {d.pct}%
                      </p>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="pct"
                name="Completion %"
                radius={[4, 4, 0, 0]}
                fill={GOLD}
                label={{
                  position: "top",
                  fontSize: 9,
                  fill: MUTED,
                  formatter: (v: number) => (v > 0 ? `${v}%` : ""),
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ── 4. Practice Accuracy Bar Chart ── */}
        <div
          className="rounded-2xl p-5"
          style={{ background: CARD, border: `1px solid ${BORDER}` }}
        >
          <p className="text-sm font-bold mb-1" style={{ color: DARK }}>
            ✏️ Question Practice Accuracy
          </p>
          <p className="text-xs mb-4" style={{ color: MUTED }}>
            Latest attempt accuracy per subject (out of 100%)
          </p>
          {practiceStats.every((s) => !s.hasData) ? (
            <p className="text-xs text-center py-8" style={{ color: MUTED }}>
              No practice data yet — start practising in Question Practice!
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={practiceStats}
                margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: MUTED }} />
                <YAxis
                  tick={{ fontSize: 10, fill: MUTED }}
                  unit="%"
                  domain={[0, 100]}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as {
                      fullName: string;
                      acc: number;
                      attempts: number;
                      hasData: boolean;
                    };
                    return (
                      <div
                        className="rounded-xl px-3 py-2 shadow-lg"
                        style={{
                          background: CARD,
                          border: `1px solid ${BORDER}`,
                        }}
                      >
                        <p
                          className="text-xs font-semibold"
                          style={{ color: CHARCOAL }}
                        >
                          {d.fullName}
                        </p>
                        <p className="text-xs" style={{ color: OLIVE }}>
                          {d.hasData
                            ? `${d.acc}% · ${d.attempts} attempts`
                            : "Not started"}
                        </p>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="acc"
                  name="Accuracy %"
                  radius={[4, 4, 0, 0]}
                  fill={OLIVE}
                  label={{
                    position: "top",
                    fontSize: 9,
                    fill: MUTED,
                    formatter: (v: number) => (v > 0 ? `${v}%` : ""),
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── 5. Study hours area chart (trend) ── */}
        <div
          className="rounded-2xl p-5"
          style={{ background: CARD, border: `1px solid ${BORDER}` }}
        >
          <p className="text-sm font-bold mb-1" style={{ color: DARK }}>
            📈 Study Hours Trend (Area)
          </p>
          <p className="text-xs mb-4" style={{ color: MUTED }}>
            Cumulative study effort over the period
          </p>
          {noDaily ? (
            <p className="text-xs text-center py-8" style={{ color: MUTED }}>
              No data yet.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart
                data={studyData}
                margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="studyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={GOLD} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={GOLD} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: MUTED }} />
                <YAxis tick={{ fontSize: 10, fill: MUTED }} unit="h" />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="hours"
                  name="Study hrs"
                  stroke={GOLD}
                  strokeWidth={2}
                  fill="url(#studyGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
