import { useState } from "react";
import { useAuth } from "../lib/auth";
import { loadDailyAll } from "./daily-tracker";
import { SYLLABUS, loadSyllabusProgress } from "./syllabus";
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
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [offset, setOffset] = useState(0); // 0 = current, -1 = prev, etc.

  const daily = loadDailyAll(uid);
  const syllabus = loadSyllabusProgress(uid);
  const practice = loadPractice(uid);

  const range = viewMode === "week" ? 7 : 30;
  const allDates = Object.keys(daily).sort();
  // Calculate date window based on offset
  const windowEnd = new Date();
  windowEnd.setDate(windowEnd.getDate() + offset * range);
  const windowStart = new Date(windowEnd);
  windowStart.setDate(windowEnd.getDate() - range + 1);
  const windowEndStr = windowEnd.toISOString().split("T")[0];
  const windowStartStr = windowStart.toISOString().split("T")[0];
  const sortedDates = allDates.filter(d => d >= windowStartStr && d <= windowEndStr);

  /* ── Study hours data ── */
  const studyData = sortedDates.map((d) => {
    const e = daily[d] as Record<string, unknown>;
    // Get revision hours from revision calendar
    const revCal = JSON.parse(localStorage.getItem(`hs_cal_revision_${uid}`) ?? "{}");
    const pracCal = JSON.parse(localStorage.getItem(`hs_cal_practice_${uid}`) ?? "{}");
    const revHours = ((revCal[d] ?? []) as any[]).reduce((s: number, e: any) => s + (e.hours ?? 0), 0);
    const pracHours = ((pracCal[d] ?? []) as any[]).reduce((s: number, e: any) => s + (e.hours ?? 0), 0);
    return {
      date: new Date(d + 'T12:00:00').toLocaleDateString('en-IN', {day:'numeric',month:'short'}),
      fullDate: d,
      study: (e?.studyHours as number) ?? 0,
      revision: revHours,
      practice: pracHours,
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
        sleep: (e?.sleepHours as number) ?? null,
        study: (e?.studyHours as number) ?? null,
        meTime: e?.meTimeMinutes ? Math.round((e.meTimeMinutes as number)/60 * 10)/10 : null,
        physical: (e?.physicalActivity as boolean) === true ? 1 : null,
      };
    })
    .filter((d) => d.mood !== null || d.stress !== null || d.sleep !== null || d.study !== null || d.physical !== null);

  /* ── Syllabus progress ── */
  const syllabusStats = SYLLABUS.filter(s => !s.netOnly).map((s) => {
    const allSubtopicIds: string[] = [];
    s.topics.forEach((t) => {
      t.subtopics.forEach((st) => { allSubtopicIds.push(st.id); });
    });
    const total = allSubtopicIds.length || 1;
    const done = allSubtopicIds.filter((id) => syllabus[id]?.status === "done").length;
    return {
      name: s.name.split(" ")[0],
      fullName: s.name,
      pct: Math.round((done / total) * 100),
      done,
      total,
    };
  });

  /* ── Practice improvement over time ── */
  const practiceTimeline = (() => {
    const allAttempts: { date: string; accuracy: number; conceptUnderstanding: number; speed: number; mistakes: number }[] = [];
    Object.values(practice as Record<string, any>).forEach((entry: any) => {
      (entry?.attempts ?? []).forEach((a: any) => {
        if (a.date && a.accuracy != null) {
          allAttempts.push({
            date: a.date.slice(0, 10),
            accuracy: a.accuracy,
            conceptUnderstanding: typeof a.concept === "number" ? a.concept : 0,
            speed: typeof a.speed === "number" ? a.speed : 0,
            mistakes: typeof a.mistakeCount === "number" ? a.mistakeCount : 0,
          });
        }
      });
    });
    // Group by date, average
    const byDate: Record<string, { acc: number[]; concept: number[]; speed: number[]; mistakes: number[] }> = {};
    allAttempts.forEach(({ date, accuracy, conceptUnderstanding, speed, mistakes }) => {
      if (!byDate[date]) byDate[date] = { acc: [], concept: [], speed: [], mistakes: [] };
      byDate[date].acc.push(accuracy);
      byDate[date].concept.push(conceptUnderstanding);
      byDate[date].speed.push(speed);
      byDate[date].mistakes.push(mistakes);
    });
    return Object.entries(byDate).sort(([a],[b]) => a.localeCompare(b)).slice(-range).map(([date, v]) => ({
      date: new Date(date + 'T12:00:00').toLocaleDateString('en-IN', {day:'numeric',month:'short'}),
      accuracy: Math.round(v.acc.reduce((a,b) => a+b, 0) / v.acc.length),
      conceptUnderstanding: Math.round(v.concept.reduce((a,b) => a+b, 0) / v.concept.length),
      speed: Math.round(v.speed.reduce((a,b) => a+b, 0) / v.speed.length),
      mistakes: Math.round(v.mistakes.reduce((a,b) => a+b, 0) / v.mistakes.length),
    }));
  })();

  /* ── Practice accuracy (kept for summary) ── */
  const practiceStats = JAM_SUBJECTS.map((s) => {
    const subData = (practice[s.id] as Record<string, unknown>) ?? {};
    const topics = Object.values(subData) as Record<string, unknown>[];
    const attempts = topics.flatMap((t) => (t?.attempts as unknown[]) ?? []) as Record<string, unknown>[];
    if (!attempts.length) return { name: s.short, fullName: s.name, acc: 0, attempts: 0, hasData: false };
    const latest = attempts[attempts.length - 1];
    return { name: s.short, fullName: s.name, acc: (latest?.accuracy as number) ?? 0, attempts: attempts.length, hasData: true };
  });

  /* ── Summary ── */
  const totalHrs = studyData.reduce((s, d) => s + (d.study ?? 0), 0);
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
            <div className="flex items-center gap-2">
              <button onClick={() => setViewMode(v => v === "week" ? "month" : "week")}
                className="px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ background: DARK, color: "#fff" }}>
                {viewMode === "week" ? "Week" : "Month"}
              </button>
              <button onClick={() => setOffset(o => o - 1)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ background: CARD, border: `1px solid ${BORDER}`, color: DARK }}>‹</button>
              <span className="text-xs font-semibold" style={{ color: DARK }}>
                {windowStartStr.split("-").slice(1).reverse().join("/")} – {windowEndStr.split("-").slice(1).reverse().join("/")}
              </span>
              <button onClick={() => setOffset(o => Math.min(0, o + 1))}
                className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ background: CARD, border: `1px solid ${BORDER}`, color: offset >= 0 ? BORDER : DARK }}
                disabled={offset >= 0}>›</button>
            </div>
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

        {/* ── 2. Mood + Stress Line Chart ── */}
        <div
          className="rounded-2xl p-5"
          style={{ background: CARD, border: `1px solid ${BORDER}` }}
        >
          <p className="text-sm font-bold mb-1" style={{ color: DARK }}>
            😊 Mood & Stress Trend
          </p>
          <p className="text-xs mb-4" style={{ color: MUTED }}>
            Mood, stress, sleep, study, me time and physical activity over time
          </p>
          {wellnessData.length === 0 ? (
            <p className="text-xs text-center py-8" style={{ color: MUTED }}>
              No wellness data yet. Log in Daily Tracker.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={wellnessData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: MUTED }} />
                <YAxis tick={{ fontSize: 10, fill: MUTED }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="mood" name="Mood (1-5)" stroke={OLIVE} strokeWidth={2} dot={{ r: 2 }} connectNulls />
                <Line type="monotone" dataKey="stress" name="Stress (1-5)" stroke={ROSE} strokeWidth={2} dot={{ r: 2 }} connectNulls />
                <Line type="monotone" dataKey="sleep" name="Sleep (hrs)" stroke="#2C4A73" strokeWidth={2} dot={{ r: 2 }} connectNulls />
                <Line type="monotone" dataKey="study" name="Study (hrs)" stroke="#2E7D52" strokeWidth={2} dot={{ r: 2 }} connectNulls />
                <Line type="monotone" dataKey="meTime" name="Me Time (hrs)" stroke="#9B7BB0" strokeWidth={2} dot={{ r: 2 }} connectNulls />
                <Line type="monotone" dataKey="physical" name="Physical (1=yes)" stroke="#E07A28" strokeWidth={2} dot={{ r: 2 }} connectNulls />
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

                {/* ── 4. Practice Improvement Over Time ── */}
        <div
          className="rounded-2xl p-5"
          style={{ background: CARD, border: `1px solid ${BORDER}` }}
        >
          <p className="text-sm font-bold mb-1" style={{ color: DARK }}>
            ✏️ Question Practice — Improvement Over Time
          </p>
          <p className="text-xs mb-4" style={{ color: MUTED }}>
            Daily average of accuracy, concept understanding and speed (%)
          </p>
          {practiceTimeline.length === 0 ? (
            <p className="text-xs text-center py-8" style={{ color: MUTED }}>
              No practice data yet — start practising in Question Practice!
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={practiceTimeline} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: MUTED }} />
                <YAxis tick={{ fontSize: 10, fill: MUTED }} unit="%" domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="accuracy" name="Accuracy" stroke="#2C4A73" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                <Line type="monotone" dataKey="conceptUnderstanding" name="Concept Understanding" stroke="#6B568F" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                <Line type="monotone" dataKey="speed" name="Speed" stroke="#E07A28" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                <Line type="monotone" dataKey="mistakes" name="Mistakes (avg)" stroke="#C0392B" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── 5. Combined Hours Trend ── */}
        <div
          className="rounded-2xl p-5"
          style={{ background: CARD, border: `1px solid ${BORDER}` }}
        >
          <p className="text-sm font-bold mb-1" style={{ color: DARK }}>
            📈 Study · Revision · Practice Hours Trend
          </p>
          <p className="text-xs mb-4" style={{ color: MUTED }}>
            Daily hours across all three activities
          </p>
          {noDaily ? (
            <p className="text-xs text-center py-8" style={{ color: MUTED }}>
              No data yet.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={studyData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id="studyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2C4A73" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2C4A73" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E07A28" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#E07A28" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="pracGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2E7D52" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2E7D52" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: MUTED }} />
                <YAxis tick={{ fontSize: 10, fill: MUTED }} unit="h" />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Area type="monotone" dataKey="study" name="Study" stroke="#2C4A73" strokeWidth={2} fill="url(#studyGrad)" />
                <Area type="monotone" dataKey="revision" name="Revision" stroke="#E07A28" strokeWidth={2} fill="url(#revGrad)" />
                <Area type="monotone" dataKey="practice" name="Practice" stroke="#2E7D52" strokeWidth={2} fill="url(#pracGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
